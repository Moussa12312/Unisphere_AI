from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

import socket
import os

def _is_pg_reachable(url: str) -> bool:
    try:
        # Extraire host et port
        from urllib.parse import urlparse
        p = urlparse(url)
        host = p.hostname or "localhost"
        port = p.port or 5432
        with socket.create_connection((host, port), timeout=0.8):
            return True
    except Exception:
        return False

try:
    if "postgresql" in DATABASE_URL and _is_pg_reachable(DATABASE_URL):
        engine = create_engine(
            DATABASE_URL,
            pool_size=30,
            max_overflow=50,
            pool_timeout=5,
            pool_recycle=1800,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 2},
            echo=False,
        )
        with engine.connect() as conn:
            pass
    elif "sqlite" in DATABASE_URL:
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        raise ConnectionError("PostgreSQL indisponible")
except Exception:
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sqlite_path = os.path.join(backend_dir, "unisphere.db").replace("\\", "/")
    print(f"[INFO] Utilisation de la base SQLite locale ({sqlite_path})")
    engine = create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()