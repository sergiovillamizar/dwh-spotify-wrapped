# Mi Spotify Wrapped — Personal Data Warehouse

Proyecto integrador de bases de datos: pipeline ETL completo que consume la Spotify Web API y construye un mini Data Warehouse personal en PostgreSQL. Cada estudiante usa su propia cuenta de Spotify como fuente de datos.

---

## Arquitectura general

![Arquitectura del sistema](docs/assets/architecture.png)

---

## Modelo dimensional (Galaxy Schema)

![Galaxy schema DWH](docs/assets/galaxy-schema.png)

- El modelo es mayormente estrella con un elemento de copo de nieve. `dim_tracks.artist_id` es una FK entre dimensiones — convierte esa relación en un elemento snowflake. Se mantiene por conveniencia de queries y ETL. En un star schema estricto, `artist_name` iría desnormalizado dentro de `dim_tracks`.
---

## Flujo OAuth PKCE + ETL

![Flujo de interacción completo](docs/assets/interaction-flow.png)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 17 en Neon (serverless) |
| Backend | Python + FastAPI |
| Migraciones | Alembic |
| Frontend | Next.js o React + Vite (TypeScript) |
| Autenticación | Spotify Authorization Code PKCE |
| Documentación API | OpenAPI (Swagger) auto-generado por FastAPI |

Referencia completa de reglas y convenciones:
- Backend → `backend/docs/workshop_definitions.md`
- Frontend → `frontend/workshops_definitions.md`

---

## Implementación

### Backend

1. Crear entorno virtual e instalar dependencias:
   ```bash
   python -m venv .venv
   source .venv/bin/activate      # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Copiar `.env.example` a `.env` y completar las variables (ver sección Variables de entorno).
3. Correr migraciones contra Neon:
   ```bash
   alembic upgrade head
   ```
4. Iniciar el servidor:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
5. Swagger disponible en `http://127.0.0.1:8000/docs`.

### Frontend

1. Instalar dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Copiar `.env.example` a `.env.local` (Next.js) o `.env` (Vite) y completar `NEXT_PUBLIC_API_URL` o `VITE_API_URL`.
3. Iniciar el cliente:
   ```bash
   npm run dev
   ```
4. Abrir `http://localhost:3000`.

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto (nunca versionar este archivo):

```env
# Spotify Developer App
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/v1/auth/callback

# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# App
APP_NAME=Spotify DWH API
APP_VERSION=1.0.0
SECRET_KEY=
FRONTEND_URL=http://localhost:3000
```

---

## Documentación del proceso

Cada entrega se documenta en la carpeta `/docs` de la raíz del proyecto. Cada archivo sigue el esquema:

```
docs/
├── assets/                         ← imágenes y diagramas
├── 00-initial-config.md            ← configuración Neon, .env, Spotify Dashboard
├── 01-ddl-migrations.md            ← scripts DDL y migraciones Alembic
├── 02-backend-implementation.md    ← desarrollo del backend FastAPI
├── 03-frontend-implementation.md   ← desarrollo del frontend
├── 04-etl-pipeline.md              ← implementación del pipeline ETL
└── 05-analytical-queries.md        ← consultas SQL y resultados con screenshots
```

### Estructura obligatoria de cada archivo de documentación

Cada `docs/XX-nombre.md` debe contener:

```markdown
# [Título del proceso]

## Qué se configuró / implementó
Descripción breve de lo que se hizo en este paso.

## Screenshots
[Insertar capturas de pantalla del resultado]

## Prompt utilizado
Si se usó IA para generar o asistir este paso, pegar el prompt exacto aquí.
Si no se usó ninguna técnica de IA: escribir `No se utilizó ninguna técnica de IA.`

## Técnica de prompting aplicada
Nombre de la técnica si aplica (zero-shot, few-shot, chain-of-thought, role prompting…).
Si no aplica: `No aplica.`
```

---

## Entregables

| # | Entregable | Contenido |
|---|---|---|
| 1 | DDL + Modelo ER | Scripts SQL ejecutables + diagrama ER justificando star schema |
| 2 | Script ETL | Código Python con las 3 fases separadas + log de ejecución con conteo de registros |
| 3 | Documentación `/docs` | Mínimo un archivo por fase del proyecto con screenshots y prompts |
