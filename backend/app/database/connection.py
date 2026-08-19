from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

try:
    if "postgresql" in DATABASE_URL:
        engine = create_engine(
            DATABASE_URL,
            pool_size=30,
            max_overflow=50,
            pool_timeout=60,
            pool_recycle=1800,
            pool_pre_ping=True,
            echo=False,
        )
        with engine.connect() as conn:
            pass
    else:
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
        )
except Exception as e:
    print(f"[WARNING] Connexion PostgreSQL non disponible, basculement vers SQLite")
    engine = create_engine(
        "sqlite:///./unisphere.db",
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