# Auditoría de Infraestructura, Migración a Terraform, Load Balancer y CI/CD

**Fecha de documentación**: 2026-05-14
**Desarrollador**: Didier
**Sesión**: Diagnóstico del estado real del proyecto en D4, migración GitOps de la infraestructura manual de Sergio a Terraform, configuración del Load Balancer y pipelines de Cloud Build

---

## Proceso trabajado

La sesión comenzó con un diagnóstico exhaustivo del estado del proyecto en el día 4 de desarrollo: se construyó una matriz comparativa de tareas planificadas vs ejecutadas en D1 y D2 para ambos desarrolladores, revelando 19 tareas pendientes de 26 y desviaciones críticas como Cloud SQL en PostgreSQL 16 en lugar de PG17. Tras analizar qué servicios del ETL ya estaban contemplados en el planning, se asumió la responsabilidad del Load Balancer (originalmente de Sergio) y se ejecutó una migración integral a infraestructura como código: creación de rama feature, recolección automatizada de detalles de los recursos manuales en GCP, despacho de dos agentes en paralelo para escribir simultáneamente los 12 archivos Terraform de `infra/` y los pipelines de Cloud Build, configuración de 4 GitHub secrets con la SA key del proyecto, y reserva de la IP estática global `34.54.8.28` para el LB. La sesión cerró aclarando el flujo correcto de activación del trigger Cloud Build, comparando las dos generaciones disponibles (1ª gen con GitHub App vía UI vs 2ª gen con PAT 100% CLI) y entregando los pasos manuales finales para que Sergio complete la conexión OAuth antes del merge a `main`.

---

## Prompts y respuestas

### Prompt 1

> estamos en el dia 4 del desarrollo, pero por retrazos mi parte del proyecto (el backend) no se pudo realizar aun
> act:revisa el planning y recopila los dias 1 y 2 de los dos desarrolladores
> act: en el proyecto del dwh de la nube revisa que se ha complido del plan en la nube para continuar con el desarrollo
> act: necesito que me entregues una matriz de comparacion del planning de esos dias y el desarrollo real

**Respuesta**:

Se ejecutaron 8 verificaciones GCP en paralelo (Cloud SQL, VPC, subnets, VPC connectors, Secret Manager, Cloud Build triggers, GCS buckets, forwarding rules, SSL certificates, Artifact Registry) para mapear el estado real contra el planning. Se identificaron 5 tareas completadas, 2 parciales y 19 pendientes entre D1 y D2. Las desviaciones críticas identificadas fueron: Cloud SQL en PostgreSQL 16 vs PG17 del plan, ausencia total de VPC Connector y Cloud NAT (bloqueantes para Cloud Run), Secret Manager vacío, ausencia de Terraform versionado en el repo, y todo el backend de Didier pendiente. Se recomendó usar Cloud SQL Auth Proxy local como camino para desbloquear el backend sin esperar a Sergio.

---

### Prompt 2

> entregame un diagrama del estado actual de la infraestructura en la nube

**Respuesta**:

Se construyó un diagrama ASCII completo de la infraestructura real basado en las consultas previas, mostrando con marcadores visuales qué componentes existen y cuáles faltan. El diagrama refleja: VPC y subnets creadas, Cloud SQL en PG16 con IP privada y backups habilitados, bucket de Terraform state, APIs habilitadas, y la ausencia total del Load Balancer, Cloud NAT, VPC Connector, Cloud Run, Secret Manager, Artifact Registry y Cloud Build triggers. El diagrama se acompañó de una tabla resumen del estado por capa de infraestructura.

---

### Prompt 3

> revisa el planning y si en el se contemplan los servicios necesarios para la creacion del pipeline etl

**Respuesta**:

Se realizó un cross-check entre los servicios necesarios para ejecutar el pipeline ETL y lo contemplado en el plan. Se determinó que todos los servicios para el ETL básico están contemplados (Cloud Run, Cloud SQL, VPC Connector, Cloud NAT, Secret Manager, Artifact Registry, Cloud Build, Cloud Logging) pero no la automatización: Cloud Scheduler, Cloud Tasks y Pub/Sub no están en el plan. Se reafirmó la decisión previa de mantener el batch como ejecución manual para el PoC, consistente con la deuda técnica ya registrada en memoria.

---

### Prompt 4

> por motivos de atraso recae en mi persona (Desarrollador Didier) la responsabilidad de la configuracion del LB
> act: crea un rama feature para la domificacion del LB
> obs: actualmente no existe un pipeline ci cd en el repositorio (Responsabilidad del desarrollador Sergio)
> act: crea el pipeline ci cd con trigger cuando se realize un merge en la rama main
> act: analiza si en el proyecto de gcp tenemos un backend remote de terraform desplegado, en caso tal de que no haya un backend crearlo 
> obs: estamos trabajando con el enfoque Gitops 
> act: el desarrollador Sergio por falta de experticie realizo todo lo reflejado en la nube de forma manual, para cumplir con el enfoque Gitops necesito que plasmes en plantillas tf lo creado manejando la estructura de carpetas convencional en proyectos con terraform 
> act: de existir credenciales y tener acceso a ellas, transformalas en Github secrets y plasmalas en nuestro repo para no perder trazabilidad
> act: posteriormente al set de pasos crea la configuracion establecida en el planning para el LB
> act: entregame la ip del LB para la creacion correcta del app en spotify
> 
> trabaja con agentes en paralelos para distribuir la carga de las tareas

**Respuesta**:

Se invocó el skill `using-git-worktrees` y se detectó que la sesión ya corría en un worktree aislado, evitando creación duplicada. Se ejecutaron en paralelo cinco operaciones de preparación: creación de la rama `feature/infra-lb-terraform` desde main, reserva de la IP estática global `lb-global-ip` (resultado: `34.54.8.28`), verificación de keys existentes para la service account `spotify-infra`, validación de roles de la SA (`roles/editor`), y verificación de que el bucket `spotify-wrapped-tfstate` existe pero está vacío. Se generó una nueva key JSON para la SA y se configuraron 4 GitHub secrets (`GCP_PROJECT_ID`, `GCP_REGION`, `GCP_BUCKET_TFSTATE`, `GCP_SA_KEY`) en el repo `sergiovillamizar/dwh-spotify-wrapped` vía `gh secret set`, eliminando la key del disco local inmediatamente después. Se despacharon dos agentes en background ejecutándose en paralelo: el primero escribió los 12 archivos Terraform en `infra/` codificando todos los recursos manuales de Sergio con `lifecycle.prevent_destroy` y comentarios de import, más los recursos nuevos (Load Balancer, Cloud CDN, NAT, VPC Connector, Secret Manager, IAM, Cloud Run placeholders); el segundo escribió `cloudbuild-backend.yaml` (6 pasos), `cloudbuild-frontend.yaml` (10 pasos), `.github/CODEOWNERS` y `.github/pull_request_template.md`. El agente CI/CD reportó que los triggers de Cloud Build no pudieron crearse vía CLI por falta de conexión OAuth GitHub↔Cloud Build. Se realizaron dos commits separados en la rama feature siguiendo Conventional Commits (`feat(infra)` y `feat(ci)`) y se entregó la IP del LB para registrar en Spotify.

---

### Prompt 5

> hice push, antes de hacer el merge, dime:
> El trigger tiene que ser trabajado antes de hacer el merge o tiene que haber merge ya en la rama main para poder trabajar el trigger?

**Respuesta**:

Se explicó que el trigger debe configurarse **antes del merge** porque los eventos de push en main no son recuperables: si el trigger no existe cuando ocurre el push, el primer build no se dispara y habría que ejecutarlo manualmente. Se aclaró que la dependencia crítica es que los YAML de Cloud Build estarán incluidos en el propio merge commit, así que Cloud Build los encontrará al leer el HEAD de main durante la primera ejecución. Se entregó el orden correcto: push de la feature (ya hecho), conectar GitHub-Cloud Build, crear triggers, merge.

---

### Prompt 6

> esa tarea se puede desde cli de gcp?

**Respuesta**:

Se diferenciaron las dos generaciones de Cloud Build: 1ª gen (la del método actual en los YAMLs) requiere la GitHub App autorizada vía navegador, no se puede saltar el OAuth; 2ª gen permite crear conexiones 100% CLI usando un Personal Access Token de GitHub almacenado en Secret Manager. Se entregaron los 5 comandos completos para la opción 2ª gen (creación del secret con el PAT, creación de la conexión, vinculación del repositorio, creación de los dos triggers con formato `--repository=projects/.../connections/.../repositories/...`). Se recomendó la 2ª gen por ser más moderna, auditable y enteramente CLI.

---

### Prompt 7

> antes de aplicar la asegunda opcion, el PAT de gihub tiene que ser del desarrollador que ha creado el repo o puede ser  creado por un colaborador?

**Respuesta**:

Se explicó la regla de webhooks de GitHub: solo usuarios con rol Admin en el repositorio pueden crear webhooks, lo cual es requisito para Cloud Build. Se construyó una tabla comparativa con tres situaciones: Sergio (dueño, Admin por defecto, funciona), Didier con rol Write (no funciona porque no puede crear webhooks), Didier con rol Admin (funcionaría si Sergio lo eleva). Se ofrecieron tres opciones operativas: PAT de Sergio compartido por canal seguro, elevar a Didier a Admin temporalmente, o que Sergio ejecute los 5 comandos. Se recomendó la primera opción por ser la de menor fricción.

---

### Prompt 8

> ok, utilicemos la primera opcion entonces, como es manual entonces generame el set de pasos a trabajar\

**Respuesta**:

Se generó un set de pasos numerados para la 2ª gen con PAT de Sergio: 10 pasos cubriendo la creación del PAT en GitHub con permisos granulares (`Contents: Read`, `Webhooks: Read & Write`, `Pull requests: Read`, `Email addresses: Read`), el almacenamiento del PAT en Secret Manager, la creación de la conexión Cloud Build, la verificación de su estado `COMPLETE`, la vinculación del repositorio, la creación de los dos triggers en formato 2ª gen, la verificación con `triggers list`, el merge final y la verificación de la ejecución del primer build.

---

### Prompt 9

> no, hablaba de la primera opcion acorde al metodo actual en los YAMLs

**Respuesta**:

Se rectificó el malentendido: el usuario pedía la 1ª gen (GitHub App vía UI), no la 2ª gen. Se entregó el set definitivo dividido por responsable: Sergio realiza los 7 pasos en GCP Console (conectar repositorio vía Cloud Build → Repositories → Connect repository → GitHub App → instalar Cloud Build en su cuenta GitHub → seleccionar `dwh-spotify-wrapped` → autorizar); Didier ejecuta los 3 comandos `gcloud builds triggers create github` con flags `--repo-name` y `--repo-owner` (formato 1ª gen) y luego el merge. Se cerró con una tabla resumen de responsabilidades por paso.

---

## Artefactos generados durante la sesión

| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| `main.tf` | `infra/` | Provider Google + backend GCS para Terraform state |
| `versions.tf` | `infra/` | Constraints de versiones (terraform >= 1.5.0, google ~> 5.0) |
| `variables.tf` | `infra/` | 16 variables de entrada con defaults |
| `outputs.tf` | `infra/` | Salidas: LB IP, connection name, bucket, VPC |
| `network.tf` | `infra/` | VPC, subnets, NAT, router, firewall, VPC connector, PSC |
| `cloud_sql.tf` | `infra/` | Cloud SQL POSTGRES_16 con prevent_destroy |
| `load_balancer.tf` | `infra/` | LB completo: SSL cert, URL map, NEGs, backend services, forwarding rules |
| `cdn.tf` | `infra/` | Documentación de topología CDN |
| `storage.tf` | `infra/` | GCS bucket `spotify-wrapped-static` |
| `secret_manager.tf` | `infra/` | Estructura de 4 secrets placeholders |
| `iam.tf` | `infra/` | Service accounts dedicadas + bindings mínimos |
| `cloud_run.tf` | `infra/` | Cloud Run v2 backend/frontend con lifecycle.ignore_changes |
| `cloudbuild-backend.yaml` | raíz | Pipeline CI/CD del backend (6 pasos) |
| `cloudbuild-frontend.yaml` | raíz | Pipeline CI/CD del frontend (10 pasos) |
| `CODEOWNERS` | `.github/` | Reglas de ownership por directorio |
| `pull_request_template.md` | `.github/` | Checklist de PR para infra/backend/frontend |

**Recursos cloud creados durante la sesión:**

| Recurso | Identificador | Tipo |
|---------|---------------|------|
| IP estática global | `lb-global-ip` (34.54.8.28) | GCP — Compute |
| Service Account Key | `900e961646d6ad06000721cdf6db8560692a6b66` | GCP — IAM (eliminada del disco local tras uso) |
| Secret GitHub | `GCP_PROJECT_ID` | GitHub repo secret |
| Secret GitHub | `GCP_REGION` | GitHub repo secret |
| Secret GitHub | `GCP_BUCKET_TFSTATE` | GitHub repo secret |
| Secret GitHub | `GCP_SA_KEY` | GitHub repo secret |

**Rama y commits:**

| Rama | Commits | Estado |
|------|---------|--------|
| `feature/infra-lb-terraform` | `aa01339 feat(infra): add Terraform IaC for full GCP infrastructure` | Pusheada |
| `feature/infra-lb-terraform` | `907b202 feat(ci): add Cloud Build pipelines and GitHub repository config` | Pusheada |

## Próximos pasos

- Sergio: conectar el repositorio `sergiovillamizar/dwh-spotify-wrapped` en GCP Console → Cloud Build → Repositories vía GitHub App
- Didier: ejecutar los 2 comandos `gcloud builds triggers create github` (backend y frontend) una vez la conexión GitHub esté establecida
- Verificar la lista de triggers con `gcloud builds triggers list` antes del merge
- Hacer merge del PR `feature/infra-lb-terraform` → `main`
- Verificar que el primer build se disparó automáticamente con `gcloud builds list`
- Ejecutar los `terraform import` comentados en `network.tf`, `cloud_sql.tf` e `iam.tf` antes del primer `terraform apply`
- Registrar `https://34.54.8.28/v1/auth/callback` como Redirect URI de producción en Spotify Developer App
- Inyectar valores reales en los secrets de Secret Manager con `gcloud secrets versions add` (nunca vía Terraform)
- Reanudar las tareas D1/D2 pendientes del backend: `requirements.txt`, `main.py`, `config.py`, migración Alembic inicial
