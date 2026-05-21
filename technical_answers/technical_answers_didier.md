# Preguntas Técnicas — Didier

> Cada respuesta debe ser **única** (no copiar la de Sergio). Responder con tus propias palabras.

---

## TQ-01 — Granularidad de la tabla de hechos

**Pregunta:** ¿Cuál es la granularidad de `fact_listening_history` y por qué `played_at` por sí solo no puede ser la clave primaria?

**Respuesta:**

<!-- Pista: 1 fila = 1 reproducción de 1 usuario en un instante. played_at solo no basta
porque dos usuarios distintos pueden reproducir a la misma hora → se necesita
UNIQUE(user_id, played_at). Mencionar multi-usuario. -->



---

## TQ-02 — `ON CONFLICT` e idempotencia

**Pregunta:** ¿Cómo se garantiza la idempotencia en las cargas incrementales del ETL?

**Respuesta:**

<!-- Pista: chequeo de existencia (query existing_fact) + constraint UNIQUE(user_id, played_at).
Correr el ETL N veces no duplica filas. history_skipped lo evidencia. -->



---

## TQ-03 — Star vs Snowflake + justificación de la FK

**Pregunta:** ¿El modelo es estrella o copo de nieve? Justifica la FK `dim_tracks.artist_id → dim_artists`.

**Respuesta:**

<!-- Pista: mayormente estrella con un elemento snowflake (dim_tracks.artist_id apunta a
otra dimensión). Trade-off: normalización vs desnormalización. -->



---

## TQ-04 — PKCE end-to-end

**Pregunta:** Explica el flujo OAuth PKCE de principio a fin (4 pasos).

**Respuesta:**

<!-- Pista: 1) /v1/auth/login genera code_verifier+challenge+state, guarda en pkce_sessions.
2) redirige a Spotify. 3) callback con code. 4) intercambio code+verifier → tokens → JWT. -->



---

## TQ-05 — `cursor_next_ms` y carga incremental

**Pregunta:** ¿Cómo funciona la carga incremental con `cursor_next_ms`?

**Respuesta:**

<!-- Pista: Unix ms del played_at más reciente guardado en etl_audit. La siguiente corrida
pide a Spotify recently-played con after=cursor → solo trae lo nuevo. -->


