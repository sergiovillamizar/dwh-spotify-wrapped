# CLAUDE.md — Project Context (auto-loaded by Claude Code)

> Este archivo se carga automáticamente al iniciar cualquier sesión de Claude Code en este repositorio. Contiene contexto crítico del proyecto para que el agente trabaje con continuidad entre sesiones.

---

## Proyecto

**Mi Spotify Wrapped** — Sistema integrador full-stack 100% cloud (GCP) para la materia Bases de Datos II, Universidad de Pamplona. Consume Spotify Web API, construye un DWH dimensional en Cloud SQL (PostgreSQL 17) y presenta analíticas vía Next.js.

## Equipo

| Dev | Rol | Skills |
|-----|-----|--------|
| **Didier** | Backend + Data | FastAPI, DWH, PostgreSQL, pandas, modelado OLTP, data engineering (junior AWS/GCP) |
| **Sergio** | Cloud + Frontend | GCP Cloud Engineer (junior), Next.js, Terraform |

## Calendario

- **Inicio**: 2026-05-11
- **Code freeze**: 2026-05-18 (D8)
- **Code review + slides + ensayo**: 2026-05-19 a 2026-05-21
- **Entrega/Exposición**: 2026-05-22

## Decisiones Arquitectónicas Clave

- **DB**: Cloud SQL for PostgreSQL 17 con **IP privada únicamente** (reemplaza Neon mencionado en docs originales)
- **Backend**: FastAPI en Cloud Run + VPC Connector hacia Cloud SQL
- **Frontend**: Next.js 14 App Router (TypeScript) — SSR en Cloud Run + assets estáticos en GCS
- **Caché**: External HTTPS Load Balancer + Cloud CDN delante de ambos backends
  - `/_next/static/*` → GCS Backend Bucket (cache 1 año, inmutable)
  - `/v1/*` → Cloud Run backend (no cache)
  - `/*` → Cloud Run frontend SSR (cache corto)
- **Networking**: VPC dedicada `spotify-wrapped-vpc`, subred privada DB (10.0.1.0/24), Serverless Connector (10.8.0.0/28), Cloud NAT para egress a Spotify API
- **Secrets**: Secret Manager (no `.env` en producción)
- **GitOps**: Terraform en `infra/` versionado + Cloud Build triggers en `main` + Conventional Commits + branch protection
- **OAuth**: Redirect URI apunta al **IP/dominio del Load Balancer**, NO al URL directo de Cloud Run (URL pública estable)
- **Sin FastMCP**: el proyecto no integra modelos IA mediante tools/MCP (uso de IA acotado a mockups UI)

## Modelo de Datos

Schema `dwh` en Cloud SQL con 6 tablas:

- **Dimensiones**: `dim_users`, `dim_artists`, `dim_tracks`
- **Fact**: `fact_listening_history` (UNIQUE `(user_id, played_at)` para idempotencia)
- **Operacional**: `etl_audit` (DWH), `public.pkce_sessions` (OAuth state)
- **Schema model**: galaxy/snowflake — `dim_tracks.artist_id` FK a `dim_artists`

## Plan Completo

El plan detallado (criterios de aceptación, análisis de reglas, diseño de red, plan día por día) está en:

- **Local**: `~/.claude/plans/cached-riding-mochi.md` (en la máquina de Didier)

Para nuevas sesiones que necesiten el plan completo: léelo con `Read` desde esa ruta. El plan incluye:

1. Criterios de aceptación (8 secciones, ~60 IDs verificables)
2. Análisis de reglas (forma y fondo)
3. Diagrama de arquitectura cloud
4. Diseño de red (VPC, subredes, firewall, IAM)
5. Estrategia GitOps (Cloud Build, Terraform, branch strategy)
6. Plan día por día (11 días: D1 a D11)
7. Registro de riesgos
8. Verificación end-to-end

## Estructura del Repositorio (planificada)

```
.
├── backend/         FastAPI + Alembic
├── frontend/        Next.js 14 (App Router, TypeScript)
├── infra/           Terraform (VPC, Cloud SQL, Cloud Run, LB+CDN, GCS, IAM)
├── notebooks/       EDA (Jupyter)
├── docs/            00-initial-config → 09-runbook + technical_answers_*
├── presentation/    slides.pdf
├── cloudbuild-backend.yaml
└── cloudbuild-frontend.yaml
```

## Convenciones

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branch strategy**: `main` protegida (PR + approval + CI verde); `feature/*` para trabajo
- **Migraciones DDL**: Solo vía Alembic (nunca SQL manual)
- **Pydantic schemas**: patrón `Base` / `Request` / `Response`
- **Docstrings**: Args/Returns en funciones; header con metadata en archivos
- **Auth**: dependency `get_current_user` para rutas protegidas
- **API versioning**: prefijo `/v1/` en todas las rutas
- **Logging**: JSON estructurado para Cloud Logging
- **Secrets**: cero hardcoded; `gitleaks` en pre-commit

## Verificaciones Críticas (al final del proyecto)

```bash
# Backend / DB
alembic upgrade head
SELECT COUNT(*) FROM dwh.fact_listening_history;  -- ≥ 100
SELECT COUNT(DISTINCT DATE(started_at)) FROM dwh.etl_audit WHERE status='success';  -- ≥ 3

# GCP
gcloud sql instances describe <instance>  -- IP privada únicamente
gcloud secrets list
gcloud compute backend-buckets describe <bucket>  -- enableCdn=true
terraform plan  -- sin drift

# Git
git log --oneline | wc -l  -- ≥ 20
git grep -i "secret\|password"  -- vacío
```

## Notas para futuras sesiones

- Si una sesión nueva no tiene contexto del plan, **lee primero** `~/.claude/plans/cached-riding-mochi.md`
- Al hacer cambios de infra, **siempre actualiza Terraform** (no usar gcloud manual en producción)
- Antes de mergear a `main`, verificar que Cloud Build pasa y `terraform plan` no muestra drift
- Spotify Redirect URI en deploy debe apuntar al **LB**, no a Cloud Run directo (riesgo común)
