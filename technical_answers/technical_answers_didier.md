# Preguntas Técnicas — Didier

> Cada respuesta debe ser **única** (no copiar la de Sergio). Responder con tus propias palabras.

---

## TQ-01 — Granularidad de la tabla de hechos

**Pregunta:** ¿Cuál es la granularidad de `fact_listening_history` y por qué `played_at` por sí solo no puede ser la clave primaria?

**Respuesta:**
Cada fila representa un preproducción de una usuario en un instante registrado, aclarado esto, played_at  no puede ser una clave primaria, dado que dos usuarios pueden realizar reproducciones a la misma hora, significa que si dos usuarios tienen una reproduccion en el mismo intervalo, se genera una misma pk para ambos mezclando datos por usuarios y creando conclusiones herradas en el eda.



---

## TQ-02 — `ON CONFLICT` e idempotencia

**Pregunta:** ¿Cómo se garantiza la idempotencia en las cargas incrementales del ETL?

**Respuesta:**

Al tener una constraint UNIQUE en played_at y user_id  y la variable existing_fact en el etl que se encarga de chequea si ya existia el registro en el etl, ademas esto se puede observar por medio de history_skipped.


---

## TQ-03 — Star vs Snowflake + justificación de la FK

**Pregunta:** ¿El modelo es estrella o copo de nieve? Justifica la FK `dim_tracks.artist_id → dim_artists`.

**Respuesta:**

El modelo galaxia tiene mayor tendencia a estrella (algo que ya fue explicado en clase), pero juega con un poco con la normalización del modelo copo de nieve precisamente en la parte de artist_id debido a que no tiene sentido fijar esta redundancia en el modelo.



---

## TQ-04 — PKCE end-to-end

**Pregunta:** Explica el flujo OAuth PKCE de principio a fin (4 pasos).

**Respuesta:**

El login genera un código de verificación, un challenge y un state , se guarda en pkce_sessions, después redirige a Spotify, con callback obtenemos código para empezar la dinámica de JWT.



---

## TQ-05 — `cursor_next_ms` y carga incremental

**Pregunta:** ¿Cómo funciona la carga incremental con `cursor_next_ms`?

**Respuesta:**

A grandes rasgos es simple, en base a played_at se genera un Unix para representar el instante pero en números enteros, y ese es el indicador de hace cuanto fue la ultima corrida del ETL, cuando sucede la siguiente corrida y se le pide a Spotify los ultimas reproducciones solo se actualiza al nuevo, así sabemos en que instante estamos en todo momento.


