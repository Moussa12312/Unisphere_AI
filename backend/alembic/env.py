from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Charger le .env
load_dotenv()

# Ajouter le chemin du projet pour les imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Importer TOUS les modèles pour qu'Alembic les détecte
from app.database.connection import Base
from app.models.user import User
from app.models.university import University
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.course import Course
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.payment import Payment
from app.models.exam_session import ExamSession
from app.models.class_room import ClassRoom
from app.models.filiere import Filiere
from app.models.schedule import Schedule
from app.models.message import Message
from app.models.notification import Notification
from app.models.document import Document
from app.models.report_card import ReportCard
from app.models.subscription import SubscriptionPlan, UniversitySubscription, SubscriptionPayment
from app.models.parent import ParentProfile, ParentStudentLink
from app.models.audit_log import AuditLog
# Ajoute ici les autres modèles si nécessaire

# this is the Alembic Config object
config = context.config

# ✅ Récupérer DATABASE_URL depuis .env
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Détecte les changements de type de colonne
            compare_server_default=True,  # Détecte les changements de valeurs par défaut
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()