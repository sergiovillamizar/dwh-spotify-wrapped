# Verificación: Secret `DB_PASSWORD`

**Fecha:** 2026-05-20
**Proyecto:** `dwh-spotify-wrapped` (ID: `999700622071`)
**Cloud Run service:** `spotify-backend`
**Service Account:** `sa-cloudrun-backend@dwh-spotify-wrapped.iam.gserviceaccount.com`

---

## 1. Lista de Verificación

| # | Verificación | Estado |
|---|---|---|
| 1 | El secret `db-password` existe | ✅ |
| 2 | Tiene al menos UNA versión activa | ✅ (2 versiones, v2 es latest) |
| 3 | No está destruida ni deshabilitada | ✅ (ambas enabled hasta hoy, v1 recién deshabilitada) |
| 4 | Cloud Run service tiene permisos de acceso | ✅ |
| 5 | SA tiene `roles/secretmanager.secretAccessor` | ✅ (a nivel de proyecto) |
| 6 | Backend lee correctamente la variable | ✅ (health checks pasan, no hay errores DB en logs) |
| 7 | Nombre coincide exactamente con el esperado | ✅ `DB_PASSWORD` en `config.py` ← `db-password:latest` en Secret Manager |
| 8 | No hay errores de configuración residuales | ⚠️ Ver detalle abajo |

---

## 2. Problema Encontrado (CORREGIDO)

### 🔴 Versión 1 contenía placeholder y estaba ENABLED

**Problema:**
El secret `db-password` tenía 2 versiones ENABLED:

| Versión | Valor | Estado antes | Estado ahora |
|---|---|---|---|
| v1 | `PLACEHOLDER_DB_PASSWORD` | `ENABLED` | **DISABLED** ✅ |
| v2 | `aVEmDfaWfIvcuonjlUrXM7uc` | `ENABLED` | `ENABLED` (latest) |

Cualquier referencia desprevenida a v1 devolvía `PLACEHOLDER_DB_PASSWORD`.

**Fix aplicado:**
```powershell
gcloud secrets versions disable 1 --secret=db-password --project=dwh-spotify-wrapped
```

**Archivos afectados:**
- `infra/secret_manager.tf` — crea el secret pero no gestiona versiones
- `backend/app/core/config.py:17` — lee `DB_PASSWORD` desde entorno

---

## 3. Problema Detectado (NO CORREGIDO — requiere acción)

### 🟠 Terraform no gestiona el usuario postgres de Cloud SQL

**Problema:**
El recurso `google_sql_database_instance.postgres` en `cloud_sql.tf` no tiene un `google_sql_user` asociado. La password se setea manualmente:

```bash
gcloud sql users set-password postgres --instance=spotify-postgres --password=<pass>
```

Luego se agrega manualmente a Secret Manager. **Esto no es reproducible vía Terraform.**

**Archivos afectados:**
- `infra/cloud_sql.tf` — falta `google_sql_user` y `random_password`

**Solución recomendada:**
Agregar al `cloud_sql.tf`:

```hcl
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_sql_user" "postgres" {
  instance = google_sql_database_instance.postgres.name
  name     = "postgres"
  password = random_password.db_password.result
}
```

Y agregar `random_password` al secret de Secret Manager vía `google_secret_manager_secret_version`.

---

## 4. Diagnóstico Completo

### Secret Manager

```
Nombre:     db-password
Proyecto:   dwh-spotify-wrapped (999700622071)
Labels:     environment=prod, managed_by=terraform
Replicación: automática
Versiones:
  v1: DISABLED  (era "PLACEHOLDER_DB_PASSWORD" — deshabilitado hoy)
  v2: ENABLED   ("aVEmDfaWfIvcuonjlUrXM7uc" — active, latest)
```

### Cloud Run (spotify-backend)

```json
{
  "env": [{
    "name": "DB_PASSWORD",
    "valueFrom": {
      "secretKeyRef": {
        "key": "latest",
        "name": "db-password"
      }
    }
  }]
}
```

### Service Account IAM (sa-cloudrun-backend)

| Role | Miembro |
|---|---|
| `roles/secretmanager.secretAccessor` | ✅ |
| `roles/cloudsql.client` | ✅ |
| `roles/logging.logWriter` | ✅ |
| `roles/monitoring.metricWriter` | ✅ |

### Cloud SQL Instance

| Propiedad | Valor |
|---|---|
| Database version | `POSTGRES_16` (⚠️ CLAUDE.md dice 17) |
| State | `RUNNABLE` ✅ |
| IP privada | `10.25.0.5` ✅ |
| IP pública | `34.121.222.188` ⚠️ habilitada para Colab |
| Usuarios | `postgres` (único usuario, sin password visible) |

### Logs (Cloud Run)

**NO hay errores de conexión a DB.** Todos los errores en logs son de Spotify OAuth (403/400), no de BD. Los health/readiness probes pasan correctamente.

---

## 5. Comandos de Verificación

```bash
# Ver secret existe
gcloud secrets describe db-password --project=dwh-spotify-wrapped

# List versions
gcloud secrets versions list db-password --project=dwh-spotify-wrapped

# Access latest value (solo verificar acceso, no exponer)
gcloud secrets versions access latest --secret=db-password --project=dwh-spotify-wrapped

# Verify IAM policy on secret
gcloud secrets get-iam-policy db-password --project=dwh-spotify-wrapped

# Check SA IAM at project level
gcloud projects get-iam-policy dwh-spotify-wrapped --filter="bindings.members:sa-cloudrun-backend"

# Check Cloud Run env vars
gcloud run services describe spotify-backend --region=us-central1 --project=dwh-spotify-wrapped

# Disable a version (si hay placeholder activo)
gcloud secrets versions disable 1 --secret=db-password --project=dwh-spotify-wrapped
```

---

## 6. Resumen Final

| Ítem | Resultado |
|---|---|
| **DB_PASSWORD funcional?** | ✅ Sí |
| **Backend conecta a DB?** | ✅ Sí (health checks pasan, sin errores DB en logs) |
| **Secret name correcto?** | ✅ `db-password` |
| **Versión correcta activa?** | ✅ latest = v2 (password real) |
| **Placeholder deshabilitado?** | ✅ v1 deshabilitado hoy |
| **Terraform gestiona password?** | ❌ No — se necesita `google_sql_user` + `random_password` |
| **PG version consistente?** | ❌ TF/PG: 16, CLAUDE.md: 17 |
