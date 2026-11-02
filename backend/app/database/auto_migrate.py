"""
Moteur d'auto-migration idempotent (PostgreSQL & SQLite) exécuté au démarrage.
Compare automatiquement toutes les tables et colonnes déclarées dans Base.metadata
avec la base de données réelle et exécute `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
pour toute colonne manquante, protégé par un verrou consultatif PostgreSQL pour
éviter les courses critiques entre les 4 workers Uvicorn.
"""
import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from app.database.connection import Base

logger = logging.getLogger(__name__)


def _column_sql_type(col, dialect_name: str) -> str:
    """Convertit un type SQLAlchemy en type SQL sûr pour ALTER TABLE ADD COLUMN."""
    type_cls = col.type.__class__.__name__.upper()
    if "JSON" in type_cls:
        return "JSONB" if dialect_name == "postgresql" else "TEXT"
    if "BOOL" in type_cls:
        return "BOOLEAN"
    if "BIGINT" in type_cls:
        return "BIGINT"
    if "INT" in type_cls:
        return "INTEGER"
    if "FLOAT" in type_cls or "NUMERIC" in type_cls or "REAL" in type_cls or "DOUBLE" in type_cls:
        return "DOUBLE PRECISION" if dialect_name == "postgresql" else "FLOAT"
    if "DATETIME" in type_cls or "TIMESTAMP" in type_cls:
        return "TIMESTAMPTZ" if dialect_name == "postgresql" else "DATETIME"
    if "DATE" == type_cls:
        return "DATE"
    if "TIME" == type_cls:
        return "TIME"
    if "TEXT" in type_cls:
        return "TEXT"
    if "STRING" in type_cls or "VARCHAR" in type_cls:
        length = getattr(col.type, "length", None)
        return f"VARCHAR({length})" if length else "VARCHAR"
    return "VARCHAR"


def _column_default_clause(col, dialect_name: str) -> str:
    """Construit une clause DEFAULT sûre pour les colonnes scalaires simples si définie."""
    if col.default is not None and getattr(col.default, "is_scalar", False):
        val = col.default.arg
        if isinstance(val, bool):
            if dialect_name == "postgresql":
                return " DEFAULT TRUE" if val else " DEFAULT FALSE"
            return " DEFAULT 1" if val else " DEFAULT 0"
        if isinstance(val, (int, float)):
            return f" DEFAULT {val}"
        if isinstance(val, str) and "'" not in val and len(val) < 64:
            return f" DEFAULT '{val}'"
    return ""


def run_auto_migrations(engine: Engine) -> int:
    """
    Crée toutes les tables manquantes puis ajoute toutes les colonnes manquantes
    sur les tables existantes sans jamais supprimer de données.
    Retourne le nombre de colonnes ajoutées.
    """
    dialect_name = engine.dialect.name
    added_count = 0

    if dialect_name == "postgresql":
        with engine.connect() as lock_conn:
            # Verrou global PostgreSQL pour sérialiser le démarrage multi-workers Uvicorn
            lock_conn.execute(text("SELECT pg_advisory_lock(84920173);"))
            lock_conn.commit()
            try:
                Base.metadata.create_all(bind=engine)
                added_count = _sync_missing_columns(engine, dialect_name)
                try:
                    with engine.begin() as conn:
                        conn.execute(text('ALTER TABLE "materials" ALTER COLUMN "teacher_id" DROP NOT NULL;'))
                except Exception:
                    pass
            finally:
                try:
                    lock_conn.execute(text("SELECT pg_advisory_unlock(84920173);"))
                    lock_conn.commit()
                except Exception:
                    pass
    else:
        Base.metadata.create_all(bind=engine)
        added_count = _sync_missing_columns(engine, dialect_name)

    return added_count


def _sync_missing_columns(engine: Engine, dialect_name: str) -> int:
    added = 0
    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())

    for table_name, table_obj in Base.metadata.tables.items():
        if table_name not in existing_tables:
            continue
        try:
            existing_cols = {c["name"] for c in insp.get_columns(table_name)}
        except Exception as e:
            logger.warning(f"[AUTO-MIGRATE] Impossible d'inspecter {table_name}: {e}")
            continue

        for col in table_obj.columns:
            if col.name in existing_cols:
                continue

            sql_type = _column_sql_type(col, dialect_name)
            default_clause = _column_default_clause(col, dialect_name)

            if dialect_name == "postgresql":
                stmt = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col.name}" {sql_type}{default_clause};'
            else:
                stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {sql_type}{default_clause};'

            try:
                with engine.begin() as conn:
                    conn.execute(text(stmt))
                added += 1
                print(f"[AUTO-MIGRATE] ✅ Colonne ajoutée : {table_name}.{col.name} ({sql_type})")
            except Exception as e:
                msg = str(e).lower()
                if "already exists" not in msg and "duplicate column" not in msg:
                    logger.warning(f"[AUTO-MIGRATE] ⚠️ {table_name}.{col.name}: {e}")

    return added
