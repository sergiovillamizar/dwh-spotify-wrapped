# 🎧 Mi Spotify Wrapped — Personal Data Warehouse

![Backend](https://img.shields.io/badge/Backend-FastAPI%20%C2%B7%20Python%203.12-009688)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black)
![Database](https://img.shields.io/badge/Database-PostgreSQL%2017-336791)
![Cloud](https://img.shields.io/badge/Cloud-Google%20Cloud%20Platform-4285F4)
![IaC](https://img.shields.io/badge/IaC-Terraform-7B42BC)
![CI/CD](https://img.shields.io/badge/CI%2FCD-Cloud%20Build-34A853)
![Auth](https://img.shields.io/badge/Auth-OAuth2%20PKCE-1DB954)
![License](https://img.shields.io/badge/license-MIT-blue)

Sistema integrador full-stack **100% cloud (GCP)** que consume la **Spotify Web API**, construye un **Data Warehouse dimensional** en Cloud SQL (PostgreSQL 17) y presenta analíticas tipo "Spotify Wrapped" vía un frontend Next.js. Cada usuario autentica con su propia cuenta de Spotify y obtiene su historia musical analizada.

> **Proyecto académico** — Bases de Datos II, Universidad de Pamplona.

🔗 **Demo en vivo:** https://34-54-8-28.nip.io

---

## 📐 Arquitectura

![Arquitectura del sistema](docs/architectures/arquitecturas-dwh.png)

El sistema se despliega íntegramente en GCP detrás de un **External HTTPS Load Balancer + Cloud CDN**, con ruteo por path:

| Ruta | Destino | Caché |
|------|---------|-------|
| `/_next/static/*` | Cloud Storage (bucket de assets) | 1 año, inmutable |
| `/v1/*` | Cloud Run — backend FastAPI | sin caché |
| `/*` | Cloud Run — frontend Next.js SSR | corto |

El backend accede a **Cloud SQL** por **IP privada** (VPC Connector) y sale a internet (Spotify / Last.fm) vía **Cloud NAT**. Secretos en **Secret Manager**, infraestructura como código en **Terraform**, despliegue por **Cloud Build** en cada push a `main`.

---

## 🗂️ Modelo dimensional (Galaxy Schema)

![Galaxy schema DWH](docs/assets/galaxy-schema.png)

Schema `dwh` con 6 tablas:

| Tipo | Tabla | Descripción |
|------|-------|-------------|
| Dimensión | `dim_users` | Usuarios + tokens OAuth |
| Dimensión | `dim_artists` | Artistas (+ `lastfm_listeners`, `lastfm_tags`) |
| Dimensión | `dim_tracks` | Canciones (+ `lastfm_listeners`, `lastfm_playcount`) |
| **Hecho** | `fact_listening_history` | 1 fila = 1 reproducción · `UNIQUE(user_id, played_at)` |
| Operacional | `etl_audit` | Auditoría de cada corrida del ETL |
| Operacional | `public.pkce_sessions` | Estado PKCE entre `/login` y `/callback` |

Es **mayormente estrella con un elemento snowflake**: `dim_tracks.artist_id` es FK a `dim_artists` (relación entre dimensiones), mantenida por conveniencia de queries y ETL.

---

## 🔄 Flujo OAuth PKCE + ETL

![Flujo de interacción completo](docs/assets/interaction-flow.png)

**Autenticación (PKCE):** `/v1/auth/login` genera `code_verifier` + `state` (guardados en `pkce_sessions`) → redirige a Spotify → `/v1/auth/callback` intercambia el code por tokens → upsert en `dim_users` → emite **JWT** → redirige al frontend.

**ETL (E → T → L):**
1. **Extract** — top artists, top tracks y recently-played (con cursor incremental `after`).
2. **Transform** — parseo ISO 8601, derivación de hora/día en **UTC y COT** (UTC-5).
3. **Load** — upsert idempotente (`UNIQUE(user_id, played_at)`) + auditoría en `etl_audit`.
4. **Enriquecimiento Last.fm** — `lastfm_listeners`/`lastfm_tags` (artistas) y `lastfm_listeners`/`lastfm_playcount` (tracks).

Se ejecuta on-demand (`POST /v1/etl/run`) y de forma programada (**Cloud Scheduler** nocturno → `POST /v1/etl/run-batch`, autenticado por OIDC).

> ⚠️ **Nota sobre datos de Spotify:** desde noviembre 2024 Spotify dejó de exponer `followers`, `genres` y `popularity` para apps en *Development Mode*. El proyecto usa **Last.fm** como sustituto: popularidad ← `lastfm_listeners`, géneros ← `lastfm_tags`.

---

## 🔌 API (endpoints `/v1`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/v1/auth/login` | Inicia OAuth PKCE |
| GET | `/v1/auth/callback` | Intercambia code → tokens → JWT |
| GET | `/v1/profile/me` | Perfil del usuario autenticado |
| GET | `/v1/artists/top` | Top artistas |
| GET | `/v1/tracks/top` | Top canciones |
| GET | `/v1/history/recently-played` | Historial (paginación por cursor) |
| GET | `/v1/history/peak-hour` | Distribución de escucha por hora (COT) |
| GET | `/v1/history/genres` | Géneros dominantes (Last.fm tags) |
| POST | `/v1/etl/run` | Ejecuta el ETL del usuario (JWT) |
| POST | `/v1/etl/run-batch` | ETL de todos los usuarios (OIDC, Scheduler) |
| GET | `/v1/etl/status` | Historial de corridas del ETL |
| GET | `/v1/health` · `/v1/ready` | Liveness · Readiness (con ping a DB) |

Documentación interactiva (Swagger): `https://34-54-8-28.nip.io/v1/docs`

---

## 🧰 Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Base de datos | PostgreSQL 17 — Cloud SQL |
| Backend | Python 3.12 + FastAPI — Cloud Run |
| Migraciones | Alembic |
| Frontend | Next.js 14 App Router (TypeScript) — Cloud Run |
| Enriquecimiento | Last.fm API |
| Cloud | GCP: VPC, Load Balancer, Cloud CDN, Cloud NAT, Secret Manager, Cloud Scheduler, Artifact Registry |
| IaC | Terraform |
| CI/CD | Cloud Build (triggers en `main`) |
| Autenticación | Spotify OAuth2 Authorization Code + PKCE · JWT propio |
| Análisis | Jupyter + pandas + seaborn (EDA en Google Colab) |

---

## 🚀 Desarrollo local

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # completar variables
alembic upgrade head               # requiere Cloud SQL Proxy o DATABASE_URL
uvicorn main:app --reload --port 8000
```
Swagger: `http://127.0.0.1:8000/v1/docs`

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local         # completar NEXT_PUBLIC_API_URL
npm run dev
```
App: `http://localhost:3000`

---

## 🔑 Variables de entorno (backend)

```env
# Spotify Developer App
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/v1/auth/callback

# Cloud SQL (local vía Cloud SQL Proxy)
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres

# App
SECRET_KEY=                        # firma del JWT
FRONTEND_URL=http://localhost:3000

# Last.fm (enriquecimiento)
LASTFM_API_KEY=
```

> 🔒 Nunca se versionan secretos. En producción viven en **Secret Manager**; `gitleaks` corre en pre-commit.

---

## 📁 Estructura del repositorio

```
.
├── backend/                FastAPI + Alembic + cliente Spotify/Last.fm
│   ├── app/
│   │   ├── core/           config, database, spotify_client, lastfm_client
│   │   └── v1/             routers · services · schemas · dependencies
│   ├── alembic/versions/   4 migraciones (0001–0004)
│   ├── database/dd.sql     snapshot de referencia del esquema
│   └── tests/
├── frontend/               Next.js 14 (login, callback, dashboard, profile, etl)
├── infra/                  Terraform (VPC, Cloud SQL, Cloud Run, LB, CDN, IAM, Scheduler)
├── notebooks/              EDA (Jupyter / Colab)
├── docs/                   documentación del proceso + diagramas
│   └── architectures/      diagramas de arquitectura (Excalidraw + PNG)
├── technical_answers/      respuestas a preguntas técnicas (Didier · Sergio)
├── cloudbuild-backend.yaml
└── cloudbuild-frontend.yaml
```

---

## 👥 Equipo

| Dev | Rol | Responsabilidad |
|-----|-----|-----------------|
| **Didier** ([@DidierParody](https://github.com/DidierParody)) | Backend + Data | FastAPI, DWH, ETL, modelado dimensional, EDA |
| **Sergio** ([@sergiovillamizar](https://github.com/sergiovillamizar)) | Cloud + Frontend | GCP, Terraform, CI/CD, Next.js |

---

## 📚 Documentación

El proceso completo se documenta en [`docs/`](docs/). Diagramas de arquitectura editables en [`docs/architectures/`](docs/architectures/). Respuestas técnicas en [`technical_answers/`](technical_answers/).

## 📄 Licencia

MIT.
