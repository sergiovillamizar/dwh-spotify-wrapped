# Auditoría Completa del Repositorio — Mi Spotify Wrapped

**Fecha:** 2026-05-20
**Auditor:** Claude Code (Staff Engineer / Cloud Architect / DevOps Reviewer)
**SHA:** HEAD (pre-merge)
**Objetivo:** Detectar errores, riesgos, malas prácticas, configuraciones incompletas y bloqueadores.

---

## 1. Estado General del Proyecto

### ✅ Qué ya funciona (estable)
- **Backend FastAPI**: estructura completa — routers, schemas, services, core, tests (52 files)
- **Base de datos**: 6 tablas DWH en schema `dwh`, migraciones Alembic (4 versions)
- **OAuth PKCE**: flujo completo implementado (generación challenge, exchange, JWT)
- **ETL incremental**: pipeline completo con cursor-based paginación, Last.fm enrichment, COT timezone
- **Frontend Next.js 14**: App Router, 5 páginas (login, callback, dashboard, profile, etl)
- **Tipos TypeScript**: 5 archivos de interfaces alineadas con backend
- **Infra Terraform**: 13 archivos .tf cubriendo VPC, Cloud SQL, Cloud Run, LB+CDN, IAM, Secrets, Scheduler
- **CI/CD**: 2 pipelines Cloud Build (backend y frontend) completos
- **Tests**: 4 archivos de tests (auth, etl, history, lastfm) con fixtures SQLite
- **Componentes UI**: Dashboard con widgets (top artists, top tracks, peak hour, genres), profile view

### ⚠️ Qué está incompleto
- **Frontend no tiene TailwindCSS realmente**: `package.json` no incluye `tailwindcss` como dependencia. El CSS usa módulos CSS, no Tailwind. CLAUDE.md dice TailwindCSS pero no está implementado.
- **Pruebas de frontend**: CERO tests en frontend (ni unit, ni e2e)
- **No hay `tsconfig.json` path alias configurado para `@/`**: Aunque se usa `@/lib/auth` etc., el alias está en `tsconfig.json` pero no hay verificación de compilación en CI/CD
- **Sin pre-commit hooks**: No hay `.pre-commit-config.yaml` ni `gitleaks` configurado (mencionado en CLAUDE.md)
- **Sin Dockerfile para producción local**: El multi-stage Dockerfile del frontend asume que `.next/standalone` ya existe (construido externamente)

### 🔒 Qué parece estable
- Modelo de datos DWH (galaxy schema con 3 dimensiones + 1 fact)
- OAuth PKCE flow (code challenge S256, state validation, JWT issuance)
- Infraestructura de red (VPC, subnets, Cloud NAT, VPC Connector)
- Load Balancer + CDN (URL map, backend services, SSL, forwarding rules)
- IAM con principio de mínimo privilegio

### 🔴 Qué parece riesgoso
- **PostgreSQL versión 16 (TF) vs 17 (CLAUDE.md)** — incongruencia
- **Cloud SQL tiene IPv4 público habilitado** (`ipv4_enabled = true`) — contradice CLAUDE.md ("IP privada únicamente")
- **Secret Manager DB_PASSWORD no tiene binding automático a Cloud SQL** — la password se crea manualmente
- **Frontend Cloud Run no recibe secrets montados** — el SA tiene `secretAccessor` pero no hay `value_source` en el container
- **Included files inconsistentes en Cloud Build triggers**
- **Sin monitoreo/alerting** (Sentry, Error Reporting, uptime checks)
- **NEXT_PUBLIC_API_URL hardcodeado** en el build — cambiar dominio requiere rebuild

---

## 2. Problemas Críticos

| # | Problema | Severidad | Archivo | Causa | Impacto | Solución |
|---|---|---|---|---|---|---|
| C1 | **DB_PASSWORD no creada automáticamente** | 🔴 CRÍTICA | `cloud_sql.tf` | Terraform crea el secret `db-password` pero no lo asigna al usuario `postgres` de Cloud SQL. La password debe ser seteada manualmente. | Si el secret no tiene una versión o la password en Secret Manager no coincide con la del usuario postgres, el backend no puede conectarse a la DB → **aplicación caída** | Crear el usuario postgres con `gcloud sql users set-password` O usar `random_password` + `google_sql_user` en Terraform |
| C2 | **Cloud SQL con IPv4 público** | 🔴 CRÍTICA | `cloud_sql.tf:44` | `ipv4_enabled = true` para Colab EDA. Contradice CLAUDE.md. | **Riesgo de seguridad**: la DB tiene IP pública aunque solo acepte conexiones del Cloud SQL Connector. El CLAUDE.md especifica "IP privada únicamente" | Cambiar a `ipv4_enabled = false`. Para Colab, usar Private Service Connect o proxy en Cloud Run |
| C3 | **Frontend Cloud Run sin secrets montados** | 🔴 CRÍTICA | `cloud_run.tf:215-243` | El container frontend no tiene `value_source` para secrets. Solo env vars planas. | El frontend no necesita secrets en runtime (todo es público o via API), pero el SA tiene `secretAccessor` que nunca se usa → **confuso y potencialmente inseguro** | Remover `secretAccessor` del SA frontend O montar secrets si realmente se necesitan. Evaluar si `NEXT_PUBLIC_API_URL` debe ir en Secret Manager |
| C4 | **Included_files incompleto en frontend trigger** | 🔴 CRÍTICA | `cloud_build_triggers.tf:71` | Frontend trigger solo incluye `frontend/**`. Cambios a `cloudbuild-frontend.yaml` no gatillan deploy. | Modificar el pipeline CI/CD sin deploy automático → **drift entre pipeline y servicio** | Agregar `"cloudbuild-frontend.yaml"` a `included_files` |
| C5 | **Spotify Client ID hardcodeado en 3 lugares** | 🔴 CRÍTICA | `cloudbuild-backend.yaml:16`, `variables.tf:121`, `cloudbuild-frontend.yaml` subentendido | `f8258104cb4c451a88b4cd90cfe724f2` repetido. Si rotan el client ID, hay que actualizar 3+ lugares. | **Riesgo de inconsistencia**: si solo se actualiza uno, OAuth se rompe silenciosamente | Centralizar en una sola fuente (Secret Manager `spotify-client-id`) y leer desde allí |
| C6 | **Versión de PostgreSQL inconsistente** | 🔴 CRÍTICA | `variables.tf:43` vs `CLAUDE.md` | TF: `POSTGRES_16`, CLAUDE.md: "PostgreSQL 17" | **Posible error de deploy**: si la instancia ya se creó con PG16, está bien. Pero la documentación está mal. A futuro, PG16 vs PG17 puede afectar features SQL | Sincronizar: decidir PG16 o PG17 y actualizar todo |
| C7 | **NEXT_PUBLIC_API_URL hardcodeado en build** | 🔴 CRÍTICA | `cloudbuild-frontend.yaml:71` | `NEXT_PUBLIC_API_URL=https://34-54-8-28.nip.io` se pasa en build-time. Queda baked en JS bundle. | Si el IP del LB cambia, el frontend apunta a un dominio muerto. Requiere rebuild + redeploy. **Riesgo alto para demo** | Mover a runtime: usar middleware/rewrite en Next.js o usar variable de entorno en Cloud Run (no build-time) |
| C8 | **Sin tests de frontend** | 🔴 CRÍTICA | Todo `frontend/` | Cero tests (unit, integration, e2e). No hay playwright, vitest, ni jest. | Cualquier cambio en el frontend puede romper la UI sin detección. **Alto riesgo para la demo** | Agregar al menos smoke tests: renderizado de cada página, flujo OAuth mockeado |
| C9 | **Alembic `target_metadata = None`** | 🟠 ALTA | `alembic/env.py:35` | No se importa `Base.metadata`. `autogenerate` no funciona. | Todas las migraciones deben escribirse a mano. **Riesgo de migraciones incompletas o erróneas** | Importar `from app.core.database import Base` y setear `target_metadata = Base.metadata` |
| C10 | **Tests no cubren PostgreSQL específico (UNNEST, ARRAY)** | 🟠 ALTA | `tests/conftest.py` | SQLite reemplaza ARRAY con Text. `CROSS JOIN UNNEST` no se testea. | La query de géneros en `history.py:85-95` usa sintaxis PostgreSQL que **nunca se ejecuta en tests** → error en producción posible | Agregar test de integración contra PostgreSQL real (Cloud SQL proxy o testcontainer) |
| C11 | **Disk autoresize deshabilitado en Cloud SQL** | 🟠 ALTA | `cloud_sql.tf:27` | `disk_autoresize = false` | Si el DWH crece más de 10GB, la DB se queda sin espacio → ETL falla, app caída | Cambiar a `disk_autoresize = true` o al menos monitorear |
| C12 | **Firewall interno demasiado permisivo** | 🟠 ALTA | `network.tf:113` | `source_ranges = ["10.0.0.0/8"]` permite tráfico de toda la RFC1918 10.0.0.0/8, no solo de las subnets reales | **Riesgo de seguridad**: si se agrega otra subnet, no hay restricción | Limitar a `["10.0.1.0/24", "10.8.0.0/28"]` |

---

## 3. Problemas de Arquitectura

### Frontend
| # | Problema | Detalle |
|---|---|---|
| F1 | **Sin TailwindCSS** | CLAUDE.md menciona TailwindCSS pero `package.json` no lo tiene. Usa CSS Modules. Decisión arquitectónica no documentada. |
| F2 | **JWT en localStorage** | `auth.ts` almacena el JWT en `localStorage`. Vulnerable a XSS. Alternativa: httpOnly cookie (pero complica SSR). Aceptable para PoC pero documentar trade-off. |
| F3 | **Sin validación de JWT en callback** | `callback/page.tsx` guarda el token sin verificar firma. Si un atacante genera un redirect con token malicioso, se almacena. El backend lo rechazará en la primera llamada, pero es mal UX. |
| F4 | **Meta tags duplicados** | `page.tsx` (root) tiene `<title>` inline en `layout.tsx`. `dashboard/page.tsx` y `profile/page.tsx` definen metadata como Server Component, pero `DashboardView` y `ProfileView` son Client Components. El metadata no se aplica a Client Components realmente. |
| F5 | **No hay error boundary** | Si un widget del dashboard crashea, toda la página se cae. Falta React Error Boundary. |
| F6 | **Sin feedback de logout** | `logout()` limpia token y redirige, pero no hay confirmación visual. |

### Backend
| # | Problema | Detalle |
|---|---|---|
| B1 | **`_get_session_local` importado como privado** | `main.py:18` importa `_get_session_local` (convención privada). Mejor crear una función pública `get_session_local` en database.py. |
| B2 | **Sin rate limiting en `/v1/auth/login`** | Cada llamada crea un PKCE session en DB. Sin rate limit, un ataque puede llenar la tabla pkce_sessions. |
| B3 | **ETL batch ejecuta ETL secuencial para cada usuario** | `run_batch_etl` en `etl.py:105` itera usuarios con `for user in users: await run_etl(...)`. Si hay muchos usuarios, el batch es muy lento. Debería usar `asyncio.gather` con semáforo. |
| B4 | **enrich_all_artists siempre barre TODOS los artistas** | `enrich_all_artists` busca `lastfm_tags == None` en cada ETL run y enriquece todos. Si hay >100 stubs, el ETL se alarga mucho. Considerar límite por ejecución. |
| B5 | **Sin logging estructurado JSON** | Aunque CLAUDE.md pide "JSON estructurado para Cloud Logging", el formato es texto plano (`format="%(asctime)s %(levelname)s %(name)s %(message)s"`) en `main.py`. |

### Infraestructura
| # | Problema | Detalle |
|---|---|---|
| I1 | **Cloud SQL PostgreSQL 16 vs 17** | TF says PG16, docs say PG17. Decidir y unificar. |
| I2 | **LB domain hardcoded como nip.io** | `34-54-8-28.nip.io` aparece en: `variables.tf`, `cloudbuild-backend.yaml`, `cloudbuild-frontend.yaml`. Si el IP cambia (recreación de LB), todo se rompe. |
| I3 | **Terraform no gestiona el dominio real** | No hay resource para DNS (Google Cloud DNS). Si registran dominio, no está en TF. |
| I4 | **cdn.tf es solo documentación** | Podría eliminarse o integrarse en load_balancer.tf. Cero valor infra. |

### GitOps / CI/CD
| # | Problema | Detalle |
|---|---|---|
| G1 | **Sin branch protection en Terraform** | No hay verificaciones de `terraform plan` en PRs. Merge a main sin plan puede romper infra. |
| G2 | **Sin pre-commit hooks** | `gitleaks` mencionado en CLAUDE.md no está configurado. Secrets pueden commitearse. |
| G3 | **Cloud Build no corre tests** | `cloudbuild-backend.yaml` no ejecuta `pytest` antes de deploy. El build deploya aunque los tests fallen. |
| G4 | **Cloud Build no corre lint/typecheck** | `cloudbuild-frontend.yaml` no ejecuta `npm run lint` ni `npm run typecheck`. |

### Seguridad
| # | Problema | Detalle |
|---|---|---|
| S1 | **Terraform state en GCS sin versioning habilitado** | `main.tf` usa backend GCS bucket `spotify-wrapped-tfstate` pero no se especifica si tiene versioning. Sin versioning, estado corrupto es irrecuperable. |
| S2 | **allUsers tiene roles/run.invoker en backend y frontend** | `cloud_run.tf:189` y `:279`. Es necesario para que el LB funcione, pero significa que cualquiera puede invocar Cloud Run directamente (aunque el ingress sea LB-only, la configuración de IAM es pública). |
| S3 | **CORS permite `http://localhost:3000` en producción** | `main.py:43-44` permite `localhost` y `127.0.0.1:3000` junto con `FRONTEND_URL`. Deberían removerse en producción o controlarse por entorno. |
| S4 | **Secret Manager no tiene rotation configurado** | Los secrets no tienen schedule de rotación. Para PoC es aceptable, pero documentar. |

### Networking
| # | Problema | Detalle |
|---|---|---|
| N1 | **Sin Cloud Armor / WAF** | El LB no tiene Cloud Armor. Sin protección contra DDoS o OWASP Top 10. |
| N2 | **Sin VPC Flow Logs** | No hay logs de flujo de red. Imposible hacer forense si hay incidente. |
| N3 | **VPC Connector min_instances=2** | `network.tf:170` tiene `min_instances = 2`, lo que significa que siempre hay 2 instancias del connector corriendo → costo base continuo. Para PoC, `min_instances = 0` podría ahorrar costos. |

---

## 4. Problemas de Seguridad

| # | Problema | Severidad | Solución |
|---|---|---|---|
| K1 | **JWT_SECRET vs SECRET_KEY naming confuso** | Alta | En `cloudbuild-backend.yaml` el secret se llama `jwt-secret` pero en `config.py` se lee como `SECRET_KEY`. En `cloud_run.tf:79` se mapea correctamente (`SECRET_KEY` → `jwt_secret`). Consistente pero confuso. |
| K2 | **Token JWT sin `aud` claim** | Media | El JWT creado en `auth_service.py` no tiene `aud`. Para APIs multi-servicio, debería tenerlo. |
| K3 | **Variables de entorno en Cloud Build logs** | Media | `cloudbuild-backend.yaml` expone `_SPOTIFY_CLIENT_ID` en los logs. No es secreto (client ID es público), pero es metadata del proyecto. |
| K4 | **Sin CSRF protection en frontend** | Media | No hay tokens CSRF. Las llamadas API usan JWT en header, lo que mitiga CSRF parcialmente (si no hay cookies), pero localStorage es vulnerable a XSS. |

---

## 5. Riesgos para la Exposición Final

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **OAuth falla en vivo porque Redirect URI del LB no está actualizado** | ALTA | 🔴 **Demo rota** — usuarios no pueden loguearse | Verificar que Spotify App tenga Redirect URI = `https://<lb-domain>/v1/auth/callback`. Probar antes de la demo. |
| R2 | **Load Balancer IP cambia** | MEDIA | 🔴 **Demo rota** — dominio nip.io apunta a IP muerta | Usar IP estática reservada (ya existe `lb-global-ip`). NO eliminar la IP. |
| R3 | **DB_PASSWORD no seteada en Secret Manager** | MEDIA | 🔴 **Backend no arranca** | Verificar `gcloud secrets versions access latest --secret=db-password`. Setear si falta. |
| R4 | **Last.fm API key vence o rate-limitea** | MEDIA | 🟡 **Dashboard sin géneros ni metadata** | El ETL trata Last.fm como best-effort, pero los widgets se verán vacíos. Setear alerta si key expira. |
| R5 | **Cloud Build SA no tiene permisos suficientes** | BAJA | 🟡 **Deploy falla** | Verificar `sa-cloudbuild` tenga `roles/run.admin`, `roles/storage.admin`, `roles/iam.serviceAccountUser` |
| R6 | **Spotify API token expira durante la demo** | BAJA | 🟡 **ETL falla, widgets sin datos** | El refresh token funciona automáticamente. Pero si el user revocó acceso, no hay recovery. |
| R7 | **CDN cache sirve datos stale** | MEDIA | 🟡 **Dashboard muestra datos viejos** | El CDN cachea SSR con `USE_ORIGIN_HEADERS`. Si Next.js no setea Cache-Control adecuado, puede cachear datos dinámicos. |
| R8 | **No hay datos en la DB porque nadie ejecutó ETL** | ALTA | 🔴 **Dashboard vacío** | Antes de la demo, ejecutar ETL manual: `POST /v1/etl/run` con JWT. Verificar `SELECT COUNT(*) FROM dwh.fact_listening_history;` ≥ 100. |
| R9 | **GCS bucket static assets vacío** | MEDIA | 🟡 **CSS/JS no cargan** | El build de frontend debe sincronizar `.next/static/` a GCS. Verificar `gsutil rsync` en CI/CD. |
| R10 | **El scheduler nightly ETL no está configurado** | BAJA | 🟡 **Demo muestra datos de días previos** | Verificar Cloud Scheduler job existe y se ejecutó. |

---

## 6. Quick Wins (Alto Impacto / Bajo Esfuerzo)

| # | Quick Win | Archivo | Esfuerzo | Impacto |
|---|---|---|---|---|
| Q1 | Correr `pytest` en Cloud Build antes de deploy | `cloudbuild-backend.yaml` | 15 min | 🟢 Evita deployar código roto |
| Q2 | Agregar versioning al bucket de TF state | `main.tf` (backend GCS) | 5 min | 🟢 Protege contra estado corrupto |
| Q3 | Ejecutar `npm run typecheck` en Cloud Build | `cloudbuild-frontend.yaml` | 15 min | 🟢 Evita errores TypeScript en prod |
| Q4 | Agregar `cloudbuild-frontend.yaml` a included_files | `cloud_build_triggers.tf` | 5 min | 🟢 CI/CD consistente |
| Q5 | Cambiar `disk_autoresize = true` en Cloud SQL | `cloud_sql.tf` | 5 min | 🟢 Previene outage por disco lleno |
| Q6 | Agregar `import random_password` + `google_sql_user` en TF | `cloud_sql.tf` | 30 min | 🟢 DB password gestionada por TF |
| Q7 | Sincronizar PG version (16 o 17) en CLAUDE.md | `CLAUDE.md`, `variables.tf` | 2 min | 🟢 Documentación consiste |
| Q8 | Limitar firewall interno a subnets reales | `network.tf` | 5 min | 🟢 Reduce superficie de ataque |
| Q9 | Agregar React Error Boundary en dashboard | `frontend/src/components/` | 30 min | 🟡 Previene crash total del dashboard |
| Q10 | Verificar que todos los secrets existen en Secret Manager | Script one-shot | 10 min | 🟢 Evita sorpresas en deploy |

---

## 7. Prioridad Recomendada

### 🚨 Fase 0 — Antes de cualquier cambio (urgencia inmediata)

1. **Verificar `DB_PASSWORD` en Secret Manager** — sin esto, backend no arranca
2. **Verificar Redirect URI en Spotify App Dashboard** — sin esto, OAuth no funciona
3. **Correr ETL manual** para poblar la DB antes de la demo
4. **Verificar que los 5 secrets existen** en Secret Manager con versiones activas

### 🔴 Fase 1 — Bloqueadores (día 1)

| # | Tarea | Tiempo |
|---|---|---|
| 1.1 | Corregir `cloud_build_triggers.tf` included_files para frontend | 5 min |
| 1.2 | Agregar `pytest` a `cloudbuild-backend.yaml` | 15 min |
| 1.3 | Agregar `typecheck` + `lint` a `cloudbuild-frontend.yaml` | 15 min |
| 1.4 | Configurar versioning en GCS bucket de TF state | 5 min |
| 1.5 | Decidir PG16 vs PG17 y sincronizar docs | 2 min |

### 🟠 Fase 2 — Riesgos de producción (día 2)

| # | Tarea | Tiempo |
|---|---|---|
| 2.1 | `disk_autoresize = true` en Cloud SQL | 5 min |
| 2.2 | Centralizar Spotify Client ID en Secret Manager | 30 min |
| 2.3 | Limitar firewall interno a subnets específicas | 5 min |
| 2.4 | Agregar `google_sql_user` + `random_password` en TF | 30 min |
| 2.5 | Importar `Base.metadata` en `alembic/env.py` | 5 min |

### 🟡 Fase 3 — Calidad y seguridad (día 3)

| # | Tarea | Tiempo |
|---|---|---|
| 3.1 | Agregar pre-commit hooks (gitleaks) | 30 min |
| 3.2 | Verificar `terraform plan` en PRs (via Cloud Build) | 1 hr |
| 3.3 | Agregar React Error Boundary | 30 min |
| 3.4 | Rate limiting en `/v1/auth/login` | 30 min |
| 3.5 | Remover IP pública de Cloud SQL si es posible | 30 min |

### 🟢 Fase 4 — Antes de la demo

| # | Tarea | Tiempo |
|---|---|---|
| 4.1 | Probar OAuth flow completo contra LB | 15 min |
| 4.2 | Verificar CDN cache invalidation | 10 min |
| 4.3 | Verificar que ETL corre y produce datos | 15 min |
| 4.4 | Prueba de carga mínima en dashboard | 15 min |
| 4.5 | Crear script de verificación pre-demo | 30 min |

---

## Tabla Resumen Final

| # | Problema | Severidad | Prioridad | Tiempo est. | Riesgo Demo |
|---|---|---|---|---|---|
| C1 | DB_PASSWORD no vinculado automáticamente | 🔴 CRÍTICA | 🚨 Fase 0 | 10 min | 🔴 ALTO |
| C2 | Cloud SQL IP pública habilitada | 🔴 CRÍTICA | 🟡 Fase 3 | 30 min | 🟢 BAJO |
| C3 | Frontend Cloud Run sin secrets (o sobradores) | 🔴 CRÍTICA | 🟡 Fase 3 | 15 min | 🟢 BAJO |
| C4 | Included_files frontend trigger incompleto | 🔴 CRÍTICA | 🔴 Fase 1 | 5 min | 🟡 MEDIO |
| C5 | Spotify Client ID hardcodeado x3 | 🔴 CRÍTICA | 🟠 Fase 2 | 30 min | 🟡 MEDIO |
| C6 | PG version inconsistente (16 vs 17) | 🔴 CRÍTICA | 🔴 Fase 1 | 2 min | 🟢 BAJO |
| C7 | NEXT_PUBLIC_API_URL en build-time | 🔴 CRÍTICA | 🟠 Fase 2 | 1 hr | 🟡 MEDIO |
| C8 | Sin tests frontend | 🔴 CRÍTICA | 🟠 Fase 2 | 4 hr | 🟡 MEDIO |
| C9 | Alembic target_metadata = None | 🟠 ALTA | 🟠 Fase 2 | 5 min | 🟢 BAJO |
| C10 | Tests no cubren PostgreSQL | 🟠 ALTA | 🟡 Fase 3 | 2 hr | 🟡 MEDIO |
| C11 | Disk autoresize disabled | 🟠 ALTA | 🟠 Fase 2 | 5 min | 🟡 MEDIO |
| C12 | Firewall demasiado permisivo | 🟠 ALTA | 🟠 Fase 2 | 5 min | 🟢 BAJO |
| B1 | _get_session_local como privado | 🟢 BAJA | 🟡 Fase 3 | 5 min | 🟢 BAJO |
| B2 | Sin rate limit en login | 🟠 ALTA | 🟡 Fase 3 | 30 min | 🟢 BAJO |
| B3 | ETL batch secuencial (lento con muchos users) | 🟡 MEDIA | 🟡 Fase 3 | 1 hr | 🟢 BAJO |
| F1 | Sin TailwindCSS (documentación incorrecta) | 🟢 BAJA | 🔴 Fase 1 | 2 min | 🟢 BAJO |
| F2 | JWT en localStorage | 🟡 MEDIA | 🟡 Fase 3 | 1 hr | 🟢 BAJO |
| B5 | Logging texto plano, no JSON | 🟢 BAJA | 🟡 Fase 3 | 15 min | 🟢 BAJO |
| I2 | LB domain hardcodeado nip.io | 🟡 MEDIA | 🟠 Fase 2 | 30 min | 🟡 MEDIO |
| G1 | Sin terraform plan en PRs | 🟠 ALTA | 🟡 Fase 3 | 1 hr | 🟢 BAJO |
| G3 | Cloud Build no corre tests | 🔴 CRÍTICA | 🔴 Fase 1 | 15 min | 🟡 MEDIO |
| G4 | Cloud Build no corre lint/typecheck | 🟠 ALTA | 🔴 Fase 1 | 15 min | 🟡 MEDIO |
| S1 | TF state sin versioning | 🟠 ALTA | 🔴 Fase 1 | 5 min | 🟡 MEDIO |
| S4 | Secrets sin rotation | 🟢 BAJA | 🟡 Fase 3 | 30 min | 🟢 BAJO |
| N3 | VPC Connector min_instances=2 (costo) | 🟢 BAJA | 🟡 Fase 3 | 5 min | 🟢 BAJO |

---

## Leyenda

- **Severidad**: 🔴 CRÍTICA = puede romper producción/OAuth/deploy, 🟠 ALTA = riesgo significativo, 🟡 MEDIA = riesgo moderado, 🟢 BAJA = cosmético o mejora
- **Prioridad**: 🚨 Fase 0 = inmediato, 🔴 Fase 1 = día 1, 🟠 Fase 2 = día 2, 🟡 Fase 3 = día 3, 🟢 Fase 4 = pre-demo
- **Riesgo Demo**: 🔴 ALTO = puede romper la demo completamente, 🟡 MEDIO = puede degradar la demo, 🟢 BAJO = bajo impacto en demo
