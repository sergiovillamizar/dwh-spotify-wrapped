# Planificación de Arquitectura y Plan de Implementación — DWH Spotify Wrapped

**Fecha de documentación**: 2026-05-12
**Desarrollador**: Didier
**Sesión**: Diseño integral del proyecto (criterios de aceptación, análisis de reglas, arquitectura cloud y cronograma de 11 días)

---

## Proceso trabajado

Sesión de planificación integral del proyecto **Mi Spotify Wrapped** (Bases de Datos II, Universidad de Pamplona). El objetivo fue elaborar de forma incremental:

1. Un informe de criterios de aceptación verificables
2. Un análisis crítico de las reglas propuestas en la documentación (forma y fondo)
3. Un diseño de arquitectura cloud completa (100% GCP) con networking, GitOps y caché
4. Un plan de implementación de 11 días para el equipo de dos desarrolladores (Didier + Sergio)
5. Una estrategia de persistencia del contexto entre sesiones de Claude Code

Cada bloque del plan se refinó iterativamente en función de los ajustes de Didier.

---

## Prompts y respuestas

### Prompt 1

> Elaborar un informe de criterios de aceptación para este proyecto.
>
> Analice las reglas propuestas de forma y de fondo.
>
> Tenga en cuenta las buenas prácticas de código definidas en el documento.
>
> Crea un plan de implementación en x días para dos personas.
>
> El conocimiento de backend de las dos personas es, desarrollador 1: "Didier" FastAPI, FastMCP, DWH, model OLTP db, pgsql, pandas, numpy, cloud fundamentals, basic security, data engineering (junior AWS and GCP), desarrollador 2: "Sergio" GCP cloud engineer (junior).
>
> Antes de realizar todo esto genera preguntas de ser necesario. En otro caso, empieza a generar estos documentos.

**Respuesta**:

Se realizó exploración exhaustiva del repositorio usando dos agentes paralelos. Los hallazgos clave fueron:

- El proyecto tiene **solo documentación**, ningún archivo de código fuente todavía
- Tres documentos guía: `README.md`, `backend/docs/workshop_definitions.md` (937 líneas), `frontend/workshops_definitions.md` (577 líneas), `docs/partial_exam.md` (244 líneas)
- Stack definido: FastAPI + PostgreSQL 17 (Neon en docs) + Next.js/TypeScript + Jupyter para EDA
- Modelo galaxy/snowflake con 6 tablas en schema `dwh`
- Fecha límite documentada: 2026-05-22
- Rúbrica: Backend 25%, Frontend 20%, EDA 30%, Preguntas técnicas 15%, Documentación 10%

Con esa base se generó un plan inicial de 12 días en el archivo `~/.claude/plans/cached-riding-mochi.md` que incluyó:

1. **44 criterios de aceptación** organizados en 6 secciones (Backend, DB, Frontend, EDA, Preguntas técnicas, Documentación)
2. **Análisis de reglas** dividido en forma (5 fortalezas, 5 gaps) y fondo (5 fortalezas, 5 hallazgos lógicos como tokens en `dim_users`, `pkce_sessions` sin TTL, ETL síncrono)
3. **Plan de 12 días** asignando backend/ETL/data a Didier y frontend/cloud/deploy a Sergio
4. **Registro de riesgos** y verificación end-to-end

El plan inicial se rechazó por estar muy al límite de la fecha y no incluir aún la dimensión profesional solicitada después.

---

### Prompt 2

> Los días están muy al límite de la fecha de entrega. Al grupo le toca informarse de lo desarrollado, además le toca planificación de la exposición. Imagina un entregable para un equipo de desarrollo profesional.
>
> Sumado a ello, los días comienzan desde mañana. Con esto actualiza el plan de nuestro calendario de entregables.
>
> Otra cosa: la base de datos estará dentro de GCP también, a pesar de lo mencionado dentro de la documentación.
>
> Como el proyecto va a estar 100% en la nube necesitamos un diagrama de arquitectura sobre la infraestructura contando con buenas prácticas, GitOps para reflejar lo desplegado en el repositorio manteniendo la trazabilidad sobre el control de versiones.
>
> También necesitamos planificación de lo que son las redes y subredes en la arquitectura del sistema.

**Respuesta**:

Se reescribió el plan completo con cambios estructurales mayores:

1. **Calendario reajustado**: inicio en 2026-05-11 (D1), code freeze en D8 (2026-05-18), review/walkthrough cruzado en D9, slides de exposición en D10, ensayo cronometrado en D11, entrega 2026-05-22. Se incorporó un día completo para que cada dev explique al otro su parte (entregable profesional).
2. **DB migrada de Neon a Cloud SQL for PostgreSQL** con IP privada únicamente, dentro de VPC.
3. **Diagrama de arquitectura ASCII** detallado con todos los componentes GCP, más un entregable PNG planificado para `docs/06-cloud-architecture.md`.
4. **Diseño de red completo**: VPC `spotify-wrapped-vpc` (10.0.0.0/16), subred privada DB (10.0.1.0/24), subred Serverless Connector (10.8.0.0/28), Cloud NAT para egress controlado a Spotify API, tabla de firewall rules e IAM service accounts.
5. **Estrategia GitOps**: Terraform en `infra/` versionado, Cloud Build triggers en `main`, branch protection con PR + approval + check verde, imágenes etiquetadas con commit SHA, Conventional Commits, pre-commit con `gitleaks`.
6. **Nuevos entregables documentales**: `docs/06-cloud-architecture.md`, `docs/07-network-design.md`, `docs/08-gitops-cicd.md`, `docs/09-runbook.md`, `presentation/slides.pdf`.
7. **18 nuevos criterios** agregados (INF-01 a INF-12, GIT-01 a GIT-08).

Adicionalmente se aclaró que **FastMCP quedaba fuera del alcance** porque la documentación del proyecto no requiere integración de modelos IA mediante tools — el uso de IA está acotado a generación de mockups UI.

---

### Prompt 3

> Veo que la arquitectura de la nube no tenemos cacheado el front. En caso de que me equivoque no realices ningún cambio y responde con un ok.

**Respuesta**:

Se confirmó que Didier tenía razón: el plan no incluía capa de caché para el frontend. Se ofrecieron tres alternativas (Cloud CDN + LB → Cloud Run, Firebase Hosting con CDN integrado, o híbrido GCS + Cloud Run). Didier eligió el **patrón híbrido**: Cloud CDN + Cloud Storage para assets estáticos + Cloud Run para SSR.

Se actualizó el plan agregando:

1. **External HTTPS Load Balancer + Cloud CDN** delante de dos backends
2. **Backend Bucket (GCS)** `spotify-wrapped-static` para `_next/static/*` y assets públicos
3. **Backend Service Cloud Run** para SSR del frontend
4. **URL Map** ruteando: `/_next/static/*` → GCS, `/v1/*` → backend, `/*` → Cloud Run frontend
5. **Tabla de estrategia de caché** con `Cache-Control` específico por tipo de recurso:
   - Assets hashed: `public, max-age=31536000, immutable` (1 año)
   - API: `no-store`
   - SSR personalizado: TTL corto o `private, no-cache`
   - `/callback` (JWT en URL): jamás cachear
6. **Pipeline Cloud Build extendido**: tras `npm run build`, hace `gsutil rsync` de `.next/static/` al bucket, aplica metadata de cache, deploya Cloud Run, invalida CDN para rutas SSR.
7. **Diagrama de arquitectura actualizado** con la nueva capa LB+CDN al tope.
8. **6 nuevos criterios** (INF-13 a INF-18) cubriendo LB, CDN, bucket, URL Map, Cache-Control e invalidación.
9. **Nuevos archivos Terraform**: `load_balancer.tf`, `cdn.tf`, `storage.tf`.
10. **3 nuevos riesgos**: stale cache tras deploy, latencia inicial del certificado SSL managed (hasta 60 min), redirect URI mal configurado apuntando a Cloud Run en vez de al LB.

Punto crítico documentado: el **Spotify Redirect URI debe apuntar a la IP/dominio del Load Balancer** (URL pública estable), no a las URLs efímeras de Cloud Run.

---

### Prompt 4

> Necesito que el plan sea accesible en tu memoria para nuevas sesiones, ¿hay una manera de hacerlo? ¿O la forma correcta es trabajar desde esta sesión?

**Respuesta**:

Se explicaron 4 opciones de persistencia con sus trade-offs:

1. **Mantener el plan solo en `~/.claude/plans/`**: persiste pero no se carga automáticamente; cada sesión debe leerse manualmente.
2. **`CLAUDE.md` en el proyecto**: se carga automáticamente al abrir Claude Code en el directorio del repositorio. Ideal para resumen ejecutivo.
3. **`~/.claude/CLAUDE.md` (memoria global)**: aplica a todos los proyectos del usuario; no recomendado porque contaminaría otros repos no relacionados.
4. **Mover el plan a `docs/PLAN.md` en el repo**: queda versionado en Git, compartible con Sergio, coherente con GitOps.

La recomendación dada fue combinar opciones 2 + 4 (CLAUDE.md + docs/PLAN.md en repo).

---

### Prompt 5

> Solo CLAUDE.md en el repo

**Respuesta**:

Se creó `CLAUDE.md` en la raíz del repositorio principal (`C:\Users\djtor\OneDrive\Documentos\GitHub\DidierParody\dwh-spotify-wrapped\CLAUDE.md`). El archivo es compacto (~3 KB) y contiene:

- Resumen del proyecto y equipo (Didier + Sergio)
- Calendario clave (D1 a D11 + entrega)
- Decisiones arquitectónicas (Cloud SQL privado, LB+CDN, GCS, VPC, GitOps, Spotify Redirect al LB)
- Modelo de datos (6 tablas, schema `dwh`)
- Puntero al plan completo en `~/.claude/plans/cached-riding-mochi.md`
- Convenciones (Conventional Commits, branch protection, Alembic-only DDL, Pydantic Base/Request/Response, JWT con `get_current_user`)
- Comandos de verificación crítica al cierre del proyecto

Notas adicionales:

- El `CLAUDE.md` se versiona en Git cuando Didier haga commit → Sergio lo recibe automáticamente al clonar
- El plan completo queda en la máquina local de Didier; si se necesita compartir con Sergio, se puede mover a `docs/PLAN.md` posteriormente

---

### Prompt 6

> Necesito que documentes esta conversación
>
> act: toma la siguiente estructura:
> 1. título del proceso que trabajamos en la conversación
> 2. el prompt exacto que te pasé
> 3. El resultado que me diste como respuesta a cada prompt
>
> abs: el resultado de los prompts (tus respuestas) no tienen que ser exactos pero sí descriptivos
>
> act: posteriormente genera en la carpeta docs de la raíz del proyecto un md que tenga como título la siguiente estructura:
> 1. la fecha en la cual se realizó la documentación
> 2. un pequeño título descriptivo
> 3. el nombre del desarrollador (Didier)
> todo intercalado con `-`

**Respuesta**:

Se generó este archivo Markdown en `docs/2026-05-12-planificacion-arquitectura-spotify-wrapped-didier.md` siguiendo la estructura solicitada: fecha, título descriptivo y nombre del desarrollador intercalados con guiones.

---

## Artefactos generados durante la sesión

| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| Plan completo | `~/.claude/plans/cached-riding-mochi.md` | Plan integral de 11 días con criterios, análisis y arquitectura |
| `CLAUDE.md` | Raíz del repositorio | Contexto auto-cargado para futuras sesiones de Claude Code |
| Esta documentación | `docs/2026-05-12-planificacion-arquitectura-spotify-wrapped-didier.md` | Registro de la conversación |

## Próximos pasos

1. Iniciar **Día 1 (2026-05-11)**: setup GCP, Spotify Developer App, bootstrap de `backend/` y `infra/` Terraform
2. Considerar mover el plan completo a `docs/PLAN.md` si se requiere compartir con Sergio
3. Commit del `CLAUDE.md` y de esta documentación al repositorio para activar el contexto compartido
