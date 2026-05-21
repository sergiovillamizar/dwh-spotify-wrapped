# 01 — DDL y Migraciones (Alembic)

## Qué se implementó

El esquema del Data Warehouse vive en el schema `dwh` de PostgreSQL 17 (Cloud SQL) y se construye **exclusivamente vía migraciones Alembic** — nunca con DDL manual (criterio DB-06). La fuente de verdad es la carpeta `backend/alembic/versions/`; el archivo `backend/database/dd.sql` es un **snapshot de referencia** del estado consolidado.

### Modelo dimensional (Galaxy Schema)

6 tablas: 3 dimensiones, 1 hecho y 2 operacionales.

| Tipo | Tabla | Rol |
|------|-------|-----|
| Dimensión | `dwh.dim_users` | Usuarios + tokens OAuth |
| Dimensión | `dwh.dim_artists` | Artistas (enriquecidos con Last.fm) |
| Dimensión | `dwh.dim_tracks` | Canciones (enriquecidas con Last.fm) |
| **Hecho** | `dwh.fact_listening_history` | 1 fila = 1 reproducción |
| Operacional | `dwh.etl_audit` | Auditoría de corridas del ETL |
| Operacional | `public.pkce_sessions` | Estado PKCE entre login y callback |

Es **mayormente estrella con un elemento snowflake**: `dim_tracks.artist_id` es FK a `dim_artists` (relación entre dimensiones).

### Decisiones de diseño clave

- **`UNIQUE(user_id, played_at)`** en la fact → garantiza **idempotencia** en cargas incrementales. `played_at` solo no basta como PK porque dos usuarios pueden reproducir en el mismo instante.
- **FK `dim_tracks.artist_id → dim_artists`** → elemento snowflake, mantenido por conveniencia de queries/ETL.
- **`cursor_next_ms` / `cursor_after_ms`** (`BIGINT`, Unix ms) en `etl_audit` → soportan la carga incremental contra el parámetro `after` de Spotify.
- **Columnas COT** (`hour_of_day_cot`, `day_of_week_cot`) → analítica en hora de Colombia (UTC-5) conservando los campos UTC originales.
- **Columnas Last.fm** → sustituyen a `popularity`/`genres`/`followers_count` de Spotify, deprecados en nov-2024 para apps en Development Mode.

## Historial de migraciones

| Rev | Archivo | Cambio |
|-----|---------|--------|
| **0001** | `0001_initial_schema.py` | Crea el schema `dwh` y las 6 tablas con PKs, FKs y `UNIQUE(user_id, played_at)`. |
| **0002** | `0002_add_cot_columns_to_fact_listening_history.py` | Añade `hour_of_day_cot` + `day_of_week_cot` a `fact_listening_history` (hora Colombia UTC-5). |
| **0003** | `0003_add_lastfm_columns_to_dim_artists.py` | Añade `lastfm_listeners` (INT) + `lastfm_tags` (TEXT[]) a `dim_artists`. |
| **0004** | `0004_add_lastfm_columns_to_dim_tracks.py` | Añade `lastfm_listeners` (INT) + `lastfm_playcount` (INT) a `dim_tracks`. |
| **0005** | `0005_add_image_url_columns.py` | Añade `image_url` (VARCHAR 512) a `dim_artists` y `album_image_url` (VARCHAR 512) a `dim_tracks` (carátulas Spotify para el frontend). |

Cada migración tiene `upgrade()` y `downgrade()` reversibles, encadenadas por `down_revision` (0001 ← 0002 ← 0003 ← 0004 ← 0005).

## Cómo se ejecutan

### Local (con Cloud SQL Proxy o `DATABASE_URL` directa)
```bash
cd backend
alembic upgrade head      # aplica todas las migraciones pendientes
alembic history           # ver el linaje de revisiones
alembic current           # ver la revisión aplicada actualmente
```

### Producción (automático en cada deploy)
El pipeline `cloudbuild-backend.yaml` despliega y ejecuta un **Cloud Run Job `backend-migrate`** que corre `alembic upgrade head` contra Cloud SQL antes de exponer la nueva revisión del backend. No se ejecuta DDL manual en producción.

## Verificación

```bash
alembic upgrade head      # debe terminar sin errores
# en la DB:
\dn                                   -- el schema dwh existe
\dt dwh.*                             -- las 6 tablas existen
\d dwh.fact_listening_history         -- confirma UNIQUE(user_id, played_at)
\d dwh.dim_tracks                     -- confirma FK artist_id → dim_artists
```

## Screenshots

[Insertar capturas: salida de `alembic upgrade head`, `alembic history`, y `\d dwh.*` mostrando las tablas]

## Prompt utilizado

[Si se usó IA para asistir este paso, pegar el prompt exacto aquí. Si no: `No se utilizó ninguna técnica de IA.`]

## Técnica de prompting aplicada

[Nombre de la técnica si aplica (zero-shot, few-shot, chain-of-thought, role prompting…). Si no aplica: `No aplica.`]
