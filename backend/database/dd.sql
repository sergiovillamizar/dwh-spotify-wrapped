CREATE SCHEMA IF NOT EXISTS dwh;

CREATE TABLE dwh.dim_users (
    user_id               SERIAL PRIMARY KEY,
    spotify_id            VARCHAR(100) UNIQUE NOT NULL,
    display_name          VARCHAR(255),
    email                 VARCHAR(255),
    country               VARCHAR(10),
    followers             INT,
    product               VARCHAR(20),   -- 'free' | 'premium'
    spotify_access_token  TEXT,          -- token activo para llamar la Spotify API
    spotify_refresh_token TEXT,          -- token de renovación (no expira con el tiempo)
    token_expires_at      TIMESTAMP,     -- cuándo expira el access_token (típicamente +1h)
    loaded_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla operacional (no analítica): almacena el estado PKCE entre el redirect y el callback
CREATE TABLE public.pkce_sessions (
    state       VARCHAR(128) PRIMARY KEY,  -- UUID aleatorio generado en /v1/auth/login
    verifier    TEXT NOT NULL,             -- code_verifier para completar el intercambio
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dwh.dim_artists (
    artist_id       SERIAL PRIMARY KEY,
    spotify_id      VARCHAR(100) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    popularity      INT,
    followers_count INT,
    genres          TEXT[],      -- array nativo de PostgreSQL
    loaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dwh.dim_tracks (
    track_id     SERIAL PRIMARY KEY,
    spotify_id   VARCHAR(100) UNIQUE NOT NULL,
    name         VARCHAR(255) NOT NULL,
    artist_id    INT REFERENCES dwh.dim_artists(artist_id),
    album_name   VARCHAR(255),
    duration_ms  INT,
    popularity   INT,
    explicit     BOOLEAN,
    loaded_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dwh.fact_listening_history (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES dwh.dim_users(user_id),
    track_id     INT NOT NULL REFERENCES dwh.dim_tracks(track_id),
    artist_id    INT NOT NULL REFERENCES dwh.dim_artists(artist_id),
    played_at    TIMESTAMP NOT NULL,
    hour_of_day  INT,
    day_of_week  VARCHAR(10),
    context_type VARCHAR(50),
    UNIQUE (user_id, played_at)              -- garantiza idempotencia en cargas incrementales
);

-- Tabla de auditoría: registra cada ejecución del ETL con métricas y cursores
CREATE TABLE dwh.etl_audit (
    audit_id         SERIAL PRIMARY KEY,
    spotify_user_id  VARCHAR(100) NOT NULL,  -- id del usuario antes de resolver FK
    started_at       TIMESTAMP NOT NULL,
    finished_at      TIMESTAMP,
    duration_ms      INT,                    -- milisegundos totales de ejecución
    status           VARCHAR(20) NOT NULL,   -- 'success' | 'error'
    error_message    TEXT,
    users_new        INT DEFAULT 0,          -- registros nuevos en dim_users
    artists_new      INT DEFAULT 0,
    artists_skipped  INT DEFAULT 0,          -- ya existían (ON CONFLICT)
    tracks_new       INT DEFAULT 0,
    tracks_skipped   INT DEFAULT 0,
    history_new      INT DEFAULT 0,
    history_skipped  INT DEFAULT 0,
    cursor_after_ms  BIGINT,                 -- cursor Unix ms usado en esta ejecución
    cursor_next_ms   BIGINT                  -- MAX(played_at) → cursor para la próxima ejecución
);
