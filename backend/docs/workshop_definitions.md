# Workshop Definitions — "Mi Spotify Wrapped"

Documento de referencia con todas las reglas, convenciones y decisiones de diseño del proyecto integrador.

---

## 1. Base de Datos — PostgreSQL en Neon

### Configuración de la cuenta Neon

Al crear el proyecto en [neon.tech](https://neon.tech):

| Parámetro | Valor |
|---|---|
| Project name | `spotify-dwh` |
| PostgreSQL version | `17` |
| Region | `AWS US East 1 (N. Virginia)` |
| Backend Services | `Off` |

Después de crear el proyecto, copiar el **Connection String** y agregarlo al `.env`:

```env
DATABASE_URL=postgresql://neondb_owner:npg_...@ep-....neon.tech/neondb?sslmode=require
```

### Schema del DWH

Todas las tablas viven bajo el schema `dwh`. El modelo sigue un **star schema** (esquema en estrella):

```
dim_users (1) ─────────────────────────────────────────────────┐
dim_artists (1) ────────────────────────────────────────────────┤──► fact_listening_history
dim_tracks (1) ─────────────────────────────────────────────────┘
```

**Tablas y su origen:**

| Tabla | Endpoint Spotify | Tipo |
|---|---|---|
| `dwh.dim_users` | `GET /v1/me` | Dimensión |
| `dwh.dim_artists` | `GET /v1/me/top/artists` | Dimensión |
| `dwh.dim_tracks` | `GET /v1/me/top/tracks` | Dimensión |
| `dwh.fact_listening_history` | `GET /v1/me/player/recently-played` | Hecho |
| `dwh.etl_audit` | Generado por el ETL | Auditoría |
| `public.pkce_sessions` | Temporal: estado OAuth entre redirect y callback | Operacional |

### DDL completo

```sql
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
```

Las migraciones se gestionan con **Alembic** — no se corre DDL manual contra Neon.

---

## 2. Backend — FastAPI

### Estructura de carpetas

```
project/
├── .env
├── .gitignore
├── requirements.txt
└── backend/
    ├── main.py
    └── app/
        ├── __init__.py
        ├── core/
        │   ├── __init__.py
        │   ├── config.py          ← variables de entorno (pydantic Settings)
        │   └── spotify_client.py  ← cliente HTTP reutilizable para Spotify API
        └── v1/
            ├── __init__.py
            ├── api.py             ← agrupa todos los routers de v1
            ├── routers/
            │   ├── __init__.py
            │   ├── auth.py        ← flujo PKCE con Spotify + emisión de JWT
            │   ├── profile.py     ← GET /v1/me
            │   ├── artists.py     ← GET /v1/me/top/artists
            │   ├── tracks.py      ← GET /v1/me/top/tracks
            │   ├── history.py     ← GET /v1/me/player/recently-played
            │   └── etl.py         ← POST /v1/etl/run, GET /v1/etl/status
            ├── schemas/
            │   ├── __init__.py
            │   ├── auth.py
            │   ├── profile.py
            │   ├── artists.py
            │   ├── tracks.py
            │   └── history.py
            └── services/
                ├── __init__.py
                ├── auth_service.py
                ├── profile_service.py
                ├── artists_service.py
                ├── tracks_service.py
                ├── history_service.py
                └── etl_service.py     ← orquesta las 3 fases del pipeline
```

### Regla 1 — Schemas Pydantic

Cada módulo en `schemas/` define tres clases con sufijo explícito:

```python
class ArtistBase(BaseModel):
    spotify_id: str
    name: str
    popularity: int
    followers_count: int
    genres: list[str]

class ArtistRequest(ArtistBase):
    """Payload de entrada (lo que llega del cliente a nuestra API)."""
    pass

class ArtistResponse(ArtistBase):
    """Payload de salida (lo que retorna nuestra API al cliente)."""
    artist_id: int
    loaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

- `Base` → campos compartidos
- `Request` → lo que recibe el endpoint
- `Response` → lo que devuelve el endpoint (incluye campos generados por la DB)

### Regla 2 — Migraciones con Alembic

```bash
# Inicializar (solo una vez)
alembic init alembic

# Crear una migración
alembic revision --autogenerate -m "create dwh schema and tables"

# Correr migraciones contra Neon
alembic upgrade head

# Revertir la última migración
alembic downgrade -1
```

El archivo `alembic.ini` apunta a `DATABASE_URL` del `.env`. Nunca se corre DDL manual contra la base de datos.

### Regla 3 — Docstring de funciones

Formato obligatorio para todas las funciones:

```python
def extract_top_artists(token: str) -> list[dict]:
    """
    Llama al endpoint /v1/me/top/artists de Spotify y retorna la lista cruda.

    Args:
        token (str): Access token de Spotify (Bearer).

    Returns:
        list[dict]: Lista de objetos artista en formato JSON crudo de Spotify.
    """
```

### Regla 4 — Docstring de archivos

Primera línea de cada archivo `.py`:

```python
"""
filename: artists_service.py
author: Juan Pérez
date: 2025-05-08
version: 1.0
description: Servicio ETL para extraer, transformar y cargar top artists desde Spotify hacia dwh.dim_artists.
"""
```

### Regla 5 — Protección de rutas con middlewares

Todas las rutas de datos y ETL requieren un JWT válido emitido por la app. Se protegen con un dependency de FastAPI:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    """Valida el JWT de la app y retorna el spotify_id del usuario autenticado."""
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        spotify_id: str = payload.get("sub")
        if spotify_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return spotify_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
```

Los routers protegidos agregan `Depends(get_current_user)` en cada ruta o a nivel de router.

### Regla 6 — Autenticación

La autenticación es **exclusivamente vía Spotify** usando el flujo **Authorization Code con PKCE**. No hay usuario/contraseña propio — el JWT de la app se emite automáticamente después de que el usuario autoriza con Spotify.

**Flujo completo:**

1. `GET /v1/auth/login` → genera PKCE (verifier + challenge + state), guarda en `public.pkce_sessions`, redirige a Spotify
2. Spotify redirige a `GET /v1/auth/callback?code=<code>&state=<state>`
3. Backend valida el state, intercambia el code por tokens de Spotify, guarda tokens en `dim_users`
4. Backend emite su propio JWT firmado: `{"sub": spotify_id, "exp": now+8h}`
5. Backend redirige al frontend: `{FRONTEND_URL}/callback?token=<jwt>`
6. Frontend guarda el JWT en `localStorage` → todas las llamadas posteriores usan `Authorization: Bearer <jwt>`

Spotify redirect URI: `http://127.0.0.1:8000/v1/auth/callback`

> **Renovación de tokens**: El `access_token` de Spotify expira en 1 hora. Antes de cada llamada al ETL, el backend verifica `token_expires_at` en `dim_users`. Si expira en menos de 5 minutos, usa el `refresh_token` para obtener uno nuevo y lo actualiza en la tabla.

### Regla 7 — Versionamiento de APIs

Todas las rutas van bajo el prefijo `/v1`:

```
/v1/auth/login                    ← inicia flujo PKCE (redirect a Spotify)
/v1/auth/callback                 ← Spotify regresa aquí con el code
/v1/profile/me                    ← perfil del usuario autenticado  [protegida]
/v1/artists/top                   ← top artistas desde dim_artists  [protegida]
/v1/tracks/top                    ← top tracks desde dim_tracks     [protegida]
/v1/history/recently-played       ← historial desde fact_listening  [protegida]
/v1/etl/run                       ← dispara el pipeline completo    [protegida]
/v1/etl/status                    ← últimas ejecuciones de etl_audit[protegida]
```

En `backend/main.py` se incluye el router de v1 y la configuración CORS:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.v1.api import router as v1_router
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # ej. http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/v1")
```

---

## 3. ETL — Las 3 Fases

### Extract

Las funciones `extract_*` llaman a Spotify y retornan el JSON crudo. Sin transformaciones aquí.

```python
def extract_top_artists(token: str) -> list[dict]:
    r = requests.get(
        "https://api.spotify.com/v1/me/top/artists",
        headers={"Authorization": f"Bearer {token}"},
        params={"limit": 50, "time_range": "medium_term"}
    )
    r.raise_for_status()
    return r.json()["items"]
```

### Transform

Las funciones `transform_*` normalizan los datos para el modelo dimensional:

- `played_at`: ISO 8601 con `Z` → parsear con `datetime.fromisoformat(value.replace("Z", "+00:00"))`
- `hour_of_day`: `played_at.hour`
- `day_of_week`: `played_at.strftime("%A")`
- `genres`: ya viene como `list[str]`, se guarda como `TEXT[]` en PostgreSQL
- `duration_ms`: se guarda tal cual (milisegundos)
- `context_type`: `item.get("context", {}).get("type") or "unknown"`

### Load

Las funciones `load_*` insertan en PostgreSQL con **idempotencia**:

```sql
INSERT INTO dwh.dim_artists (spotify_id, name, popularity, followers_count, genres, loaded_at)
VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
ON CONFLICT (spotify_id) DO NOTHING;
```

Cada función de load registra en el log cuántos registros se insertaron vs. cuántos ya existían.

### Audit — Registro en `etl_audit`

Al inicio de cada ejecución se inserta una fila en `etl_audit` con `status = 'running'` y `started_at = NOW()`. Al finalizar se actualiza con las métricas y el cursor para la próxima ejecución:

```python
import time
from datetime import datetime, timezone

def run_etl(token: str, spotify_user_id: str, db_conn):
    audit_id = insert_audit_start(db_conn, spotify_user_id)
    t0 = time.time()
    try:
        # Obtener cursor de la última ejecución exitosa
        cursor_after_ms = get_last_cursor(db_conn, spotify_user_id)

        metrics = {"users_new": 0, "artists_new": 0, "artists_skipped": 0,
                   "tracks_new": 0, "tracks_skipped": 0,
                   "history_new": 0, "history_skipped": 0}

        # ... fases Extract → Transform → Load ...

        # Guardar cursor para la próxima ejecución
        cursor_next_ms = get_max_played_at_ms(db_conn, spotify_user_id)

        update_audit_success(db_conn, audit_id,
                             duration_ms=int((time.time() - t0) * 1000),
                             cursor_after_ms=cursor_after_ms,
                             cursor_next_ms=cursor_next_ms,
                             **metrics)
    except Exception as e:
        update_audit_error(db_conn, audit_id,
                           duration_ms=int((time.time() - t0) * 1000),
                           error_message=str(e))
        raise
```

**Query para obtener el último cursor** (antes de hacer el extract de `recently-played`):

```sql
SELECT cursor_next_ms
FROM dwh.etl_audit
WHERE spotify_user_id = %s AND status = 'success'
ORDER BY started_at DESC
LIMIT 1;
```

Si no hay ejecuciones previas, `cursor_next_ms` será `NULL` → se llama al endpoint sin parámetro `after` (primera carga).

---

## 4. Referencia — Spotify Web API

Documentación oficial: [developer.spotify.com/documentation/web-api](https://developer.spotify.com/documentation/web-api)

> Si un endpoint no responde como esperan o necesitan datos adicionales, la referencia completa está en:
> `https://developer.spotify.com/documentation/web-api/reference/<nombre-del-endpoint>`

---

### 4.1 Endpoints del Proyecto (los 4 obligatorios)

#### `GET /v1/me` → `dim_users`

| | |
|---|---|
| **Referencia** | [get-current-users-profile](https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile) |
| **Scopes requeridos** | `user-read-private`, `user-read-email` |

**Query parameters:** ninguno.

**Campos de respuesta que se cargan al DWH:**

| Campo Spotify | Tipo | Columna DWH |
|---|---|---|
| `id` | string | `spotify_id` |
| `display_name` | string | `display_name` |
| `email` | string | `email` — requiere scope `user-read-email` |
| `country` | string (ISO 3166-1 alpha-2) | `country` — requiere scope `user-read-private` |
| `followers.total` | integer | `followers` |
| `product` | string (`"free"` / `"premium"`) | `product` — requiere scope `user-read-private` |

---

#### `GET /v1/me/top/{type}` → `dim_artists` y `dim_tracks`

| | |
|---|---|
| **Referencia** | [get-users-top-artists-and-tracks](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks) |
| **Scopes requeridos** | `user-top-read` |

**Path parameter:** `type` = `artists` o `tracks` (dos llamadas separadas).

**Query parameters:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `time_range` | string | `medium_term` | `short_term` (~4 semanas), `medium_term` (~6 meses), `long_term` (~1 año) |
| `limit` | integer | 20 | Máximo ítems a retornar (1–50). Usar `50` para maximizar datos. |
| `offset` | integer | 0 | Índice del primer ítem (paginación) |

**Campos → `dim_artists` (cuando `type=artists`):**

| Campo Spotify | Tipo | Columna DWH |
|---|---|---|
| `id` | string | `spotify_id` |
| `name` | string | `name` |
| `popularity` | integer (0–100) | `popularity` |
| `followers.total` | integer | `followers_count` |
| `genres` | `string[]` | `genres` (TEXT[]) |

**Campos → `dim_tracks` (cuando `type=tracks`):**

| Campo Spotify | Tipo | Columna DWH |
|---|---|---|
| `id` | string | `spotify_id` |
| `name` | string | `name` |
| `artists[0].id` | string | FK → buscar `artist_id` en `dim_artists` |
| `album.name` | string | `album_name` |
| `duration_ms` | integer | `duration_ms` |
| `popularity` | integer (0–100) | `popularity` |
| `explicit` | boolean | `explicit` |

---

#### `GET /v1/me/player/recently-played` → `fact_listening_history`

| | |
|---|---|
| **Referencia** | [get-recently-played](https://developer.spotify.com/documentation/web-api/reference/get-recently-played) |
| **Scopes requeridos** | `user-read-recently-played` |

**Query parameters:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `limit` | integer | 20 | Máximo ítems (1–50) |
| `after` | integer | — | Cursor Unix ms: retorna ítems **después** de este momento |
| `before` | integer | — | Cursor Unix ms: retorna ítems **antes** de este momento |

> `after` y `before` son mutuamente excluyentes. Para la primera carga, no se necesita ninguno.

**Estructura de cada ítem en `response.items[]` (PlayHistoryObject):**

| Campo Spotify | Tipo | Uso en DWH |
|---|---|---|
| `track.id` | string | Buscar `track_id` en `dim_tracks` |
| `track.artists[0].id` | string | Buscar `artist_id` en `dim_artists` |
| `played_at` | string (ISO 8601) | `played_at` — parsear a TIMESTAMP |
| `played_at` | derivado | `hour_of_day` = `.hour` |
| `played_at` | derivado | `day_of_week` = `.strftime("%A")` |
| `context.type` | string (`"playlist"` / `"album"` / `"artist"`) | `context_type` — puede ser `null` |

---

### 4.2 Scopes OAuth requeridos (resumen)

Al construir la URL de autorización PKCE, el parámetro `scope` debe incluir todos estos:

```
user-read-private user-read-email user-top-read user-read-recently-played
```

---

### 4.3 Mapa de endpoints por entidad

> **Convención:**
> - ✅ **Usar en el proyecto** — endpoint que se implementa obligatoriamente
> - 📖 **Solo referencia** — no se implementa, pero sirve para explorar o enriquecer datos

#### Users — [referencia completa](https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile)

| Estado | Endpoint | Tabla DWH | Link |
|---|---|---|---|
| ✅ **Usar** | Get Current User's Profile | `dim_users` | [get-current-users-profile](https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile) |
| ✅ **Usar** | Get User's Top Items (`type=artists`) | `dim_artists` | [get-users-top-artists-and-tracks](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks) |
| ✅ **Usar** | Get User's Top Items (`type=tracks`) | `dim_tracks` | [get-users-top-artists-and-tracks](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks) |
| 📖 Referencia | Get User's Profile (otro usuario) | — | [get-users-profile](https://developer.spotify.com/documentation/web-api/reference/get-users-profile) |
| 📖 Referencia | Get Followed Artists | — | [get-followed](https://developer.spotify.com/documentation/web-api/reference/get-followed) |
| 📖 Referencia | Follow / Unfollow Artists or Users | — | [follow-artists-users](https://developer.spotify.com/documentation/web-api/reference/follow-artists-users) |
| 📖 Referencia | Check If User Follows Artists or Users | — | [check-current-user-follows](https://developer.spotify.com/documentation/web-api/reference/check-current-user-follows) |
| 📖 Referencia | Check if Current User Follows Playlist | — | [check-if-user-follows-playlist](https://developer.spotify.com/documentation/web-api/reference/check-if-user-follows-playlist) |

> **Nota:** Los datos de `dim_artists` y `dim_tracks` vienen **embebidos** en la respuesta de `Get User's Top Items`. No se llama a `Get Artist` ni `Get Track` por separado — toda la información necesaria ya está en el `items[]` del top.

#### Player

| Estado | Endpoint | Tabla DWH | Link |
|---|---|---|---|
| ✅ **Usar** | Get Recently Played Tracks | `fact_listening_history` | [get-recently-played](https://developer.spotify.com/documentation/web-api/reference/get-recently-played) |

#### Artists — [referencia completa](https://developer.spotify.com/documentation/web-api/reference/get-an-artist)

Ninguno de estos endpoints se usa directamente en el proyecto. Los datos de artistas ya llegan embebidos en `GET /v1/me/top/artists`. Se listan como referencia por si quieren enriquecer `dim_artists` con datos adicionales.

| Estado | Endpoint | Posible uso | Link |
|---|---|---|---|
| 📖 Referencia | Get Artist | Enriquecer un artista por `spotify_id` | [get-an-artist](https://developer.spotify.com/documentation/web-api/reference/get-an-artist) |
| 📖 Referencia | Get Several Artists | Enriquecer varios artistas en batch | [get-multiple-artists](https://developer.spotify.com/documentation/web-api/reference/get-multiple-artists) |
| 📖 Referencia | Get Artist's Albums | Ver discografía de un artista | [get-an-artists-albums](https://developer.spotify.com/documentation/web-api/reference/get-an-artists-albums) |
| 📖 Referencia | Get Artist's Top Tracks | Top tracks globales de un artista | [get-an-artists-top-tracks](https://developer.spotify.com/documentation/web-api/reference/get-an-artists-top-tracks) |
| 📖 Referencia | Get Artist's Related Artists | Artistas similares | [get-an-artists-related-artists](https://developer.spotify.com/documentation/web-api/reference/get-an-artists-related-artists) |

#### Tracks — [referencia completa](https://developer.spotify.com/documentation/web-api/reference/get-track)

Igual que artistas: los datos de tracks llegan embebidos en `GET /v1/me/top/tracks` y en `recently-played`. No se llama a estos endpoints en el ETL obligatorio.

| Estado | Endpoint | Posible uso | Link |
|---|---|---|---|
| 📖 Referencia | Get Track | Enriquecer un track por `spotify_id` | [get-track](https://developer.spotify.com/documentation/web-api/reference/get-track) |
| 📖 Referencia | Get Several Tracks | Enriquecer varios tracks en batch | [get-several-tracks](https://developer.spotify.com/documentation/web-api/reference/get-several-tracks) |
| 📖 Referencia | Get User's Saved Tracks | Biblioteca guardada del usuario | [get-users-saved-tracks](https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks) |
| 📖 Referencia | Get Track's Audio Features | BPM, energía, bailabilidad, etc. | [get-audio-features](https://developer.spotify.com/documentation/web-api/reference/get-audio-features) |
| 📖 Referencia | Get Track's Audio Analysis | Análisis detallado de segmentos | [get-audio-analysis](https://developer.spotify.com/documentation/web-api/reference/get-audio-analysis) |
| 📖 Referencia | Get Recommendations | Tracks recomendados según seeds | [get-recommendations](https://developer.spotify.com/documentation/web-api/reference/get-recommendations) |

---

## 5. Variables de Entorno

El archivo `.env` en la raíz del proyecto:

```env
# Spotify
SPOTIFY_CLIENT_ID=<tu_client_id>
SPOTIFY_CLIENT_SECRET=<tu_client_secret>
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/v1/auth/callback

# Base de datos Neon
DATABASE_URL=postgresql://neondb_owner:npg_...@ep-....neon.tech/neondb?sslmode=require

# App
APP_NAME=Spotify DWH API
APP_VERSION=1.0.0
SECRET_KEY=<clave_secreta_para_jwt>
FRONTEND_URL=http://localhost:3000
```

El archivo `.env` **nunca** se versiona en git (está en `.gitignore`).

---

## 6. Dependencias Python (`requirements.txt`)

```
fastapi
uvicorn[standard]
psycopg2-binary
sqlalchemy
alembic
httpx
python-dotenv
pydantic[email]
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
```

---

## 7. Preguntas Analíticas sobre el DWH

Una vez cargado el pipeline ETL, cada estudiante responde estas 5 preguntas con SQL puro sobre sus **propios datos** de Spotify. Como cada cuenta es diferente, los resultados son personales.

### Pregunta 1 — ¿En qué hora del día escuchas más música?

```sql
SELECT hour_of_day, COUNT(*) AS reproducciones
FROM dwh.fact_listening_history
GROUP BY hour_of_day
ORDER BY reproducciones DESC;
```

### Pregunta 2 — ¿Cuál es tu artista más escuchado recientemente?

```sql
SELECT a.name, COUNT(*) AS veces
FROM dwh.fact_listening_history f
JOIN dwh.dim_artists a ON a.artist_id = f.artist_id
GROUP BY a.name
ORDER BY veces DESC
LIMIT 5;
```

### Pregunta 3 — ¿Qué tan popular es tu música?

_Promedio de popularidad de tus top tracks._

```sql
SELECT AVG(popularity)  AS popularidad_promedio,
       MIN(popularity)  AS mas_underground,
       MAX(popularity)  AS mas_mainstream
FROM dwh.dim_tracks;
```

### Pregunta 4 — ¿Cuáles géneros dominan tu biblioteca?

_Usa `UNNEST` para explotar el array nativo `TEXT[]` de PostgreSQL._

```sql
SELECT UNNEST(genres) AS genero, COUNT(*) AS artistas
FROM dwh.dim_artists
GROUP BY genero
ORDER BY artistas DESC
LIMIT 10;
```

### Pregunta 5 — Window function: ranking de canciones por día de semana

_Al menos una query debe usar `RANK() OVER`._

```sql
SELECT day_of_week, t.name, COUNT(*) AS plays,
       RANK() OVER (PARTITION BY day_of_week ORDER BY COUNT(*) DESC) AS ranking
FROM dwh.fact_listening_history f
JOIN dwh.dim_tracks t ON t.track_id = f.track_id
GROUP BY day_of_week, t.name;
```

---

## 8. Entregables del Proyecto

| # | Entregable | Contenido |
|---|---|---|
| 1 | **DDL + Modelo ER** | Scripts SQL ejecutables desde cero + diagrama ER del modelo dimensional, justificando star vs snowflake |
| 2 | **Script ETL** | Código Python con las 3 fases separadas (`extract_*`, `transform_*`, `load_*`), docstrings completos, log de ejecución con conteo de registros por tabla |

---

## 9. Tests Unitarios

Se crean tests para cada capa usando **pytest**. Agregar a `requirements.txt`:

```
pytest
pytest-asyncio
httpx
```

### Estructura

```
backend/
└── tests/
    ├── __init__.py
    ├── conftest.py              ← fixtures compartidos (app, client, tokens mock)
    ├── test_auth.py
    ├── test_profile.py
    ├── test_artists.py
    ├── test_tracks.py
    └── test_history.py
```

### Convenciones

- Cada archivo de test corresponde a un router.
- Nombres de test: `test_<verbo>_<recurso>_<escenario>` → `test_get_top_artists_returns_200`
- Usar `TestClient` de FastAPI (o `AsyncClient` de `httpx`) con la app en modo test.
- Mockear las llamadas a Spotify API con `unittest.mock.patch` o `respx` — los tests no deben hacer llamadas reales a Spotify.
- Cubrir: respuesta exitosa (2xx), sin token (401), token inválido (401), recurso no encontrado (404).

### Ejemplo

```python
# tests/test_artists.py
from fastapi.testclient import TestClient
from unittest.mock import patch
from backend.main import app

client = TestClient(app)

MOCK_ARTISTS = [
    {"id": "abc123", "name": "Bad Bunny", "popularity": 98,
     "followers": {"total": 50000000}, "genres": ["reggaeton", "latin trap"]}
]

def test_get_top_artists_returns_200():
    """El endpoint retorna 200 y una lista de artistas cuando el token es válido."""
    with patch("app.v1.services.artists_service.extract_top_artists", return_value=MOCK_ARTISTS):
        response = client.get("/v1/artists/top", headers={"Authorization": "Bearer fake-token"})
    assert response.status_code == 200
    assert len(response.json()) == 1

def test_get_top_artists_without_token_returns_401():
    """El endpoint retorna 401 si no se envía token."""
    response = client.get("/v1/artists/top")
    assert response.status_code == 401
```

### Correr los tests

```bash
# Todos los tests
pytest backend/tests/ -v

# Un archivo específico
pytest backend/tests/test_artists.py -v

# Con reporte de cobertura
pytest backend/tests/ --cov=backend/app --cov-report=term-missing
```

---

## 10. Colección Postman

Crear una colección llamada **"Spotify DWH API"** con las siguientes carpetas y requests:

### Carpeta: Auth

| Método | Nombre | URL |
|---|---|---|
| `GET` | Spotify Login | `{{base_url}}/v1/auth/login` |
| `GET` | Spotify Callback | `{{base_url}}/v1/auth/callback?code={{code}}` |
| `POST` | App Token | `{{base_url}}/v1/auth/token` |

Body del `POST /token` (form-data):
```
username: admin
password: <tu_password>
```

### Carpeta: Profile

| Método | Nombre | URL |
|---|---|---|
| `GET` | My Profile | `{{base_url}}/v1/profile/me` |

### Carpeta: Artists

| Método | Nombre | URL |
|---|---|---|
| `GET` | Top Artists | `{{base_url}}/v1/artists/top` |

### Carpeta: Tracks

| Método | Nombre | URL |
|---|---|---|
| `GET` | Top Tracks | `{{base_url}}/v1/tracks/top` |

### Carpeta: History

| Método | Nombre | URL |
|---|---|---|
| `GET` | Recently Played | `{{base_url}}/v1/history/recently-played` |

### Variables de entorno en Postman

| Variable | Valor inicial |
|---|---|
| `base_url` | `http://127.0.0.1:8000` |
| `token` | _(se llena automáticamente con el script de `POST /token`)_ |

### Script de auto-token (en la pestaña "Tests" del request `POST /token`)

```javascript
const json = pm.response.json();
pm.environment.set("token", json.access_token);
```

Todos los requests protegidos usan `Authorization: Bearer {{token}}` en sus headers.

Exportar la colección como `backend/docs/spotify-dwh.postman_collection.json` y versionar junto al código.

---

## 11. Diagrama del DWH con Excalidraw

El diagrama del modelo dimensional se genera con **Claude Code + MCP de Excalidraw** y se guarda en `backend/docs/dwh-diagram.excalidraw`.

### Cómo generarlo

Con Claude Code abierto en el proyecto, ejecutar:

```
/mcp excalidraw — genera el diagrama del star schema del DWH con las tablas dim_users, dim_artists, dim_tracks y fact_listening_history, mostrando claves primarias, foráneas y tipos de datos principales.
```

El archivo resultante se guarda en `backend/docs/dwh-diagram.excalidraw` y puede abrirse en [excalidraw.com](https://excalidraw.com).

### Preguntas

Responder en el archivo `backend/docs/dwh-reflection.md`:

**Pregunta 1 — Tipo de modelo**
> ¿El modelo implementado es un esquema en **estrella (star schema)** o un **copo de nieve (snowflake schema)**? Justifica tu respuesta considerando la normalización de las dimensiones.

**Pregunta 2 — Decisión de diseño: `genres` como `TEXT[]`**
> Los géneros musicales de un artista se almacenan en una columna `TEXT[]` dentro de `dim_artists`, en lugar de crear una tabla separada `dim_genres`. ¿Cuándo esta decisión es correcta en un DWH y cuándo sería mejor normalizar a una tabla propia? ¿Qué tipo de schema generaría esa normalización?

**Pregunta 3 — Granularidad de la tabla de hechos**
> ¿Cuál es la **granularidad** (grain) de `fact_listening_history`? Es decir, ¿qué representa exactamente una fila en esa tabla? ¿Por qué `played_at` no puede ser clave primaria por sí sola?

---

## 12. Estrategia de Ejecución — Carga Incremental

### El problema: `recently-played` es una ventana deslizante, no un historial

El endpoint `GET /v1/me/player/recently-played` **no es un historial completo**. Spotify solo expone las últimas 50 reproducciones en cualquier momento. Si un estudiante escucha 60 canciones sin correr el ETL, los 10 registros más antiguos se pierden permanentemente — no hay forma de recuperarlos.

### Estrategia recomendada dado el tiempo disponible

| Día | Acción | Resultado esperado |
|---|---|---|
| **Hoy mismo** | Primera ejecución del ETL (sin cursor) | 50 reproducciones recientes en el DWH |
| **Cada día** | Ejecución diaria con cursor `after` | ~30–50 reproducciones nuevas por día |
| **Fin de semana 2** | El DWH acumula ~500 reproducciones | Las queries analíticas arrojan patrones reales |

> Con ~10 días de ejecución diaria, cada estudiante tendrá suficientes datos para que las 5 preguntas analíticas de la Sección 7 sean significativas.

### Cómo funciona el cursor incremental

```
Ejecución 1 (hoy, sin cursor):
  → GET /recently-played?limit=50
  → Inserta 50 filas en fact_listening_history
  → Guarda en etl_audit: cursor_next_ms = MAX(played_at) como Unix ms

Ejecución 2 (mañana):
  → Lee cursor_next_ms de la última ejecución exitosa
  → GET /recently-played?limit=50&after=<cursor_next_ms>
  → Solo retorna reproducciones NUEVAS desde ayer
  → ON CONFLICT (user_id, played_at) DO NOTHING protege contra duplicados
  → Actualiza cursor_next_ms con el nuevo MAX(played_at)
```

### Convertir `played_at` a cursor Unix ms

```python
from datetime import datetime, timezone

def played_at_to_unix_ms(played_at_iso: str) -> int:
    """Convierte '2025-05-08T14:23:11.149Z' a Unix ms para el cursor de Spotify."""
    dt = datetime.fromisoformat(played_at_iso.replace("Z", "+00:00"))
    return int(dt.timestamp() * 1000)
```

### ¿Qué pasa si un día escucha más de 50 canciones?

Si el estudiante escucha más de 50 canciones entre dos ejecuciones, pierde los registros más antiguos de ese intervalo. La solución es **correr el ETL más de una vez al día** si anticipa escuchar mucho (por ejemplo, durante un viaje largo). El botón "Sincronizar" del frontend hace exactamente eso — el estudiante puede presionarlo cuando quiera.

### Query para ver el historial de ejecuciones (desde el Dashboard)

```sql
SELECT
    audit_id,
    started_at,
    duration_ms,
    status,
    history_new,
    history_skipped,
    artists_new,
    tracks_new
FROM dwh.etl_audit
WHERE spotify_user_id = %s
ORDER BY started_at DESC
LIMIT 20;
```
