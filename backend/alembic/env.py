"""
env.py
Alembic migration environment for Mi Spotify Wrapped backend.

DATABASE_URL is read from the environment at runtime so the same image
works locally (via Cloud SQL Proxy) and in Cloud Run.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import os
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Load .env from the backend directory so DATABASE_URL is available locally
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# Read DATABASE_URL from the environment (injected by Cloud Run / .env locally)
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# Target metadata for autogenerate (will point to Base.metadata once models exist)
target_metadata = None


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
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
