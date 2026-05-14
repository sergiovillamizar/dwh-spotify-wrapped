## Descripcion

<!-- Describe claramente que hace este PR y por que es necesario. -->

## Tipo de cambio

- [ ] `feat` — Nueva funcionalidad
- [ ] `fix` — Correccion de bug
- [ ] `chore` — Cambios de mantenimiento / dependencias / configuracion
- [ ] `docs` — Documentacion solamente
- [ ] `refactor` — Refactorizacion sin cambio de comportamiento
- [ ] `test` — Agrega o modifica tests
- [ ] `infra` — Cambios en Terraform / GCP

## Checklist

### General
- [ ] El codigo compila sin errores localmente
- [ ] Los commits siguen Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- [ ] No hay secrets, passwords ni API keys hardcoded en el codigo (`git grep -i "secret\|password"` vacio)
- [ ] Las variables de entorno nuevas estan documentadas y agregadas a Secret Manager (no en `.env` de produccion)

### Backend (si aplica)
- [ ] Se genero migracion Alembic para cambios de schema (`alembic revision --autogenerate`)
- [ ] `alembic upgrade head` corre sin errores localmente
- [ ] Los nuevos endpoints tienen el prefijo `/v1/` y usan `get_current_user` si son rutas protegidas
- [ ] Docstrings con Args/Returns en funciones nuevas
- [ ] Logging JSON estructurado en lugar de `print()`

### Frontend (si aplica)
- [ ] `npm run build` pasa sin errores
- [ ] No hay fetch directo a Cloud Run — todas las llamadas API van por el Load Balancer (`https://34.54.8.28/v1/...`)
- [ ] Assets estaticos optimizados (no binarios grandes sin comprimir)

### Infraestructura (si aplica)
- [ ] `terraform plan` ejecutado — sin drift inesperado
- [ ] Cambios de IAM revisados (principio de minimo privilegio)
- [ ] Cloud SQL sigue con IP privada unicamente (no se habilito IP publica)
- [ ] Nuevos recursos etiquetados con `environment = "production"` y `project = "spotify-wrapped"`

### Tests
- [ ] Tests unitarios nuevos o actualizados para los cambios introducidos
- [ ] Todos los tests existentes pasan (`pytest` / `npm test`)

## Screenshots / evidencia (si aplica)

<!-- Agrega capturas de pantalla, logs relevantes o salida de comandos que ayuden a revisar el PR. -->

## Notas para el reviewer

<!-- Cualquier contexto adicional, decisiones de diseno, o areas que necesitan atencion especial. -->
