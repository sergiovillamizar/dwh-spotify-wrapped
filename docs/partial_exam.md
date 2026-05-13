# Examen Final — Mi Spotify Wrapped

**Universidad de Pamplona**
**Profesor:** Juan Alejandro Carrillo Jaimes
**Materia:** Bases de Datos II
**Periodo académico:** 2026-I
**Fecha de entrega:** Viernes 22 de mayo de 2026, 11:59 p.m.
**Modalidad:** Trabajo en parejas

---

## Contexto

Chicos, llegamos al final. Durante estas semanas vimos que es un DataWareHouse y entendimos los pasos para construirlo. Ahora es momento de pasar de la teória a la práctica y que materialicen ese conocimiento con la construcción completa de un pipeline ETL real, con datos reales de Spotify, una base de datos en la nube y un frontend que lo muestra todo. Ahora lo que quiero es que me muestren que entienden lo que hicieron — no solo que funcione, sino que sepan explicar por qué cada pieza está donde está.

Este parcial evalúa el sistema completo: el backend, el frontend, el análisis de datos y las decisiones técnicas que tomaron en el camino.

---

## Instrucciones — léanlas completo

1. Es en parejas. Ni individual ni de tres. Solo parejas.
2. Cualquiera de los dos debe poder explicarme cualquier parte del proyecto si se los pregunto. Los dos son responsables de todo.
3. Cada uno debe mostrar su propio modelo de diseño generado con IA — mockups, diagramas, wireframes. No vale un solo modelo para los dos.
4. Todo se entrega por GitHub. El link lo mandan por el medio que indique.
5. El repo debe tener commits que muestren que trabajaron de verdad. Un repo con un solo commit gigante no se acepta.
6. La carpeta `docs/` debe estar completa con screenshots, prompts que usaron y técnicas de IA. Todo según la estructura del README.
7. Los datos del análisis deben ser de su cuenta real de Spotify. Nada sintético, nada inventado.
8. El `.env` y cualquier archivo con contraseñas o tokens no va al repo. Jamás.

---

## ¿Quién hace qué?

| Integrante A | Integrante B |
|---|---|
| Backend (FastAPI, ETL, base de datos) | Frontend (React o Next.js, diseño con IA) |
| Secciones 1, 2 y 4 | Secciones 3 y 4 |
| Los dos responden la Sección 5 por separado |

> El EDA (Sección 4) lo hacen juntos, pero los dos deben haber corrido el notebook y poder explicarme los hallazgos.

---

## Sección 1 — Backend (Integrante A)

### 1.1 El pipeline ETL

Necesito las tres fases funcionando para los cuatro endpoints de Spotify:

- `GET /v1/me` → `dim_users`
- `GET /v1/me/top/artists` → `dim_artists`
- `GET /v1/me/top/tracks` → `dim_tracks`
- `GET /v1/me/player/recently-played` → `fact_listening_history`

Cada fase — `extract_*`, `transform_*`, `load_*` — en funciones separadas con docstrings. Revisen la Regla 3 del documento de definiciones si tienen duda de cómo hacerlo.

### 1.2 Carga incremental

El ETL no puede volver a cargar lo que ya existe. Debe leer el cursor `cursor_next_ms` de `etl_audit` y traer solo lo nuevo desde esa fecha.

### 1.3 Auditoría

Cada vez que corra el ETL, queda registrado en `etl_audit`: cuándo empezó, cuándo terminó, cuánto tardó, cuántos registros nuevos hubo por tabla y el cursor para la próxima vez.

### 1.4 Los endpoints

Todos estos deben estar andando y protegidos con el JWT:

```
GET  /v1/profile/me
GET  /v1/artists/top
GET  /v1/tracks/top
GET  /v1/history/recently-played
POST /v1/etl/run
GET  /v1/etl/status
```

### 1.5 Migraciones

Todo el schema vive en Alembic. Correr `alembic upgrade head` en una base vacía tiene que crear todas las tablas. Sin eso no hay entrega válida.

---

## Sección 2 — Base de datos

### 2.1 DDL ejecutable

En `docs/01-ddl-migrations.md` va el script DDL completo. Tiene que funcionar desde cero en una base limpia y producir el mismo resultado que Alembic.

### 2.2 Datos reales cargados

Necesito ver mínimo tres ejecuciones del ETL en días distintos en la tabla `etl_audit`. Y `fact_listening_history` debe tener mínimo 100 registros — si tienen menos, el análisis no va a dar nada interesante.

> Si su cuenta de Spotify tiene poca actividad reciente, comiencen a correr el ETL desde hoy todos los días. No dejen eso para última hora.

---

## Sección 3 — Frontend (Integrante B)

### 3.1 Las cinco páginas

| Ruta | Qué debe hacer |
|---|---|
| `/login` | Botón "Conectar con Spotify", flujo completo sin copiar tokens a mano |
| `/callback` | Recibe el JWT, lo guarda, redirige al dashboard |
| `/dashboard` | Mínimo 4 widgets con datos reales del backend |
| `/profile` | Perfil completo con avatar y datos de Spotify |
| `/etl` | Estado del DWH, historial de ejecuciones, botón "Sincronizar" con log paso a paso |

### 3.2 Los datos vienen del backend

El dashboard no llama directamente a Spotify. Todo pasa por el backend. Y todas las rutas protegidas mandan el token automáticamente — no lo tienen que pegar a mano.

### 3.3 Estado vacío

Si las tablas están vacías antes del primer ETL, la app debe decirlo claro. Nada de pantallas en blanco sin explicación.

### 3.4 El diseño con IA

Entreguen el archivo de diseño (Figma, Stitch, Uizard, lo que usaron) con las 5 vistas. Cada vista necesita un párrafo explicando las decisiones de diseño que tomaron — por qué pusieron las cosas donde las pusieron.

En `docs/03-frontend-implementation.md` incluyan:
- Qué herramienta de IA usaron
- El prompt exacto que usaron para generar los mockups
- Screenshots del diseño y del resultado final implementado

---

## Sección 4 — Análisis de datos (EDA)

Chicos, esta es la sección más importante del parcial. Acá es donde demuestran que no solo cargaron datos — sino que los entienden.

El análisis va en un **Google Colab o Jupyter Notebook** conectado directo a Neon. Con datos reales. El notebook va en la carpeta `notebooks/` con el nombre `eda_spotify_[nombre1]_[nombre2].ipynb`.

### 4.1 Primero lo primero — carguen y revisen los datos

- Conecten al DWH con `psycopg2` o `SQLAlchemy`.
- Carguen las tablas en DataFrames de pandas.
- Para cada tabla muestren: cuántas filas tiene, qué tipos de datos hay, qué porcentaje de cada columna tiene valores nulos.
- Si encuentran algo raro en los datos, documéntenlo. No lo escondan.

### 4.2 ¿Cuándo escuchan música?

- ¿A qué hora del día escuchan más? Gráfico de barras por hora.
- ¿Qué días de la semana son los más activos? Gráfico de barras ordenado de mayor a menor.
- Construyan un **heatmap** con hora del día en un eje y día de la semana en el otro. El color muestra cuántas reproducciones hay en cada combinación. Este gráfico cuenta toda su historia musical de un vistazo.
- Escríbanme qué les dice ese patrón. ¿Escuchan más en las mañanas? ¿Los fines de semana? ¿Hay una hora que claramente asocian con algo — estudiar, transportarse, descansar?

### 4.3 ¿Qué artistas y géneros dominan?

- Top 10 artistas más escuchados en el historial, con conteo de reproducciones.
- El campo `genres` de `dim_artists` es un array. Expló­tenlo con `UNNEST` en SQL o `.explode()` en pandas. Grafiquen los 15 géneros más frecuentes.
- Pregunta interesante: ¿el 20% de sus artistas acapara el 80% de sus reproducciones? Esto se llama el principio de Pareto. Construyan una curva que muestre qué tan concentrada está su escucha.
- ¿Son oyentes variados o siempre vuelven a los mismos? Escríbanlo.

### 4.4 ¿Qué tan popular es su música?

- Histograma de la popularidad de sus top tracks (va de 0 a 100).
- Calculen: promedio, mediana, mínimo y máximo.
- Clasifiquen las canciones en cuatro categorías: `underground` (menos de 30), `emerging` (30–60), `mainstream` (60–80), `viral` (más de 80). Grafiquen cuántas canciones caen en cada categoría.
- ¿Son oyentes mainstream o underground? ¿Eso los sorprende o era lo que esperaban?

### 4.5 ¿Cómo son las canciones que escuchan?

- ¿Cuánto duran en promedio? Conviertan `duration_ms` a minutos y grafiquen la distribución.
- ¿Las canciones de ciertos géneros tienden a ser más largas o más cortas? Construyan un boxplot de duración agrupado por los 5 géneros más frecuentes.

### 4.6 La pregunta de cada uno

Acá viene lo más importante de esta sección. Cada integrante formula **una pregunta propia** — algo que genuinamente les genera curiosidad sobre sus datos — y la responde con código y visualizaciones.

La pregunta tiene que cumplir esto:
- No se puede responder con un simple `SELECT *`.
- Necesita al menos un `JOIN` o una agregación.
- Tiene que tener una visualización.
- Tiene que tener una interpretación escrita de mínimo 3 oraciones.

Ejemplos de lo que podrían preguntarse (no usen estos, inventen los propios):
- ¿Existe relación entre qué tan popular es un artista y cuántas veces aparece en mi historial?
- ¿Las canciones que escucho en modo playlist son más o menos populares que las que escucho en modo album?
- ¿Hay un artista en mi top que tenga géneros completamente distintos entre sus canciones?

### 4.7 ¿Qué aprendieron?

Un párrafo por integrante — mínimo 150 palabras — respondiendo esto:
- ¿Qué aprendieron de sus propios datos que no sabían?
- ¿Hubo alguna pregunta que quisieron hacer pero el modelo de datos no les permitió responder? ¿Cuál?
- ¿Qué tabla o columna le agregarían al DWH para poder hacer un análisis más rico?

---

## Sección 5 — Preguntas técnicas (cada uno por su lado)

Cada integrante responde estas preguntas solo, en un archivo `docs/technical_answers_[nombre].md`. Respuestas iguales entre los dos integrantes de una pareja = cero en esta sección para ambos. Háganlo con sus palabras.

**Pregunta 1**
¿Cuál es la granularidad de `fact_listening_history`? ¿Qué representa exactamente una fila? ¿Por qué `played_at` no puede ser clave primaria por sí sola y cómo se resolvió eso en el modelo?

**Pregunta 2**
El ETL usa `ON CONFLICT (spotify_id) DO NOTHING` en las dimensiones y `ON CONFLICT (user_id, played_at) DO NOTHING` en la tabla de hechos. ¿Qué propiedad garantiza eso? ¿Qué pasaría si no existiera esa cláusula y corrieran el ETL dos veces el mismo día?

**Pregunta 3**
`dim_tracks` tiene una FK hacia `dim_artists`. ¿Qué tipo de schema genera esa relación entre dimensiones? ¿Cuál sería la alternativa en un star schema puro? ¿Por qué se decidió mantener la FK y cuál es el trade-off?

**Pregunta 4**
Expliquen el flujo completo desde que el usuario hace clic en "Conectar con Spotify" hasta que el frontend tiene el JWT en `localStorage`. ¿Qué es PKCE y por qué se usa?

**Pregunta 5**
¿Para qué sirve `cursor_next_ms` en `etl_audit`? ¿Qué problema resuelve? ¿Qué pasaría si escuchan 80 canciones en un día sin correr el ETL?

---

## ¿Cómo los voy a evaluar?

| Sección | Qué reviso | Porcentaje |
|---|---|---|
| **Backend** | ETL con las 3 fases, endpoints andando, migraciones en Alembic | 25% |
| **Frontend** | 5 páginas funcionales, datos reales del backend, diseño con IA documentado | 20% |
| **EDA** | Análisis completo, gráficas con interpretación, pregunta propia, conclusiones | 30% |
| **Preguntas técnicas** | Respuestas individuales, correctas, con sus propias palabras | 15% |
| **Documentación** | `docs/` con screenshots, prompts y técnicas de IA por fase | 10% |

### Ojo con esto — penalizaciones

- Repo sin historial de commits real: **−20 puntos**
- Datos del EDA que no son de Spotify real: **cero en Sección 4**
- Respuestas iguales en Sección 5: **cero en Sección 5 para los dos**
- Credenciales expuestas en el repo: **cero en todo el parcial**

---

## Entrega

| Qué | Dónde va en el repo |
|---|---|
| Código backend | `backend/` |
| Código frontend | `frontend/` |
| Notebook EDA | `notebooks/eda_spotify_[nombre1]_[nombre2].ipynb` |
| Documentación por fase | `docs/00-initial-config.md` … `docs/05-analytical-queries.md` |
| Respuestas técnicas | `docs/technical_answers_[nombre].md` (uno por cada uno) |
| Diseño con IA | `docs/03-frontend-implementation.md` + capturas o archivo Figma |

Mándenme el link del repo antes del **viernes 22 de mayo de 2026 a las 11:59 p.m.** No hay prórroga. Cualquier duda me escriben. Hagale.
