# Preguntas Técnicas — Sergio

> Cada respuesta debe ser **única** (no copiar la de Didier). Responder con tus propias palabras.

---

## TQ-01 — Granularidad de la tabla de hechos

**Pregunta:** ¿Cuál es la granularidad de `fact_listening_history` y por qué `played_at` por sí solo no puede ser la clave primaria?

**Respuesta:**

Cada fila representa una reproducción que un usuario realizó en un instante específico. El campo `played_at` por sí mismo no puede ser clave primaria porque dos usuarios distintos pueden tener reproducciones en el mismo momento, lo que generaría un conflicto al intentar guardar ambos registros. Por esta razón se utiliza la combinación de `user_id` y `played_at` como identificador único, garantizando que cada reproducción quede correctamente diferenciada.

---

## TQ-02 — `ON CONFLICT` e idempotencia

**Pregunta:** ¿Cómo se garantiza la idempotencia en las cargas incrementales del ETL?

**Respuesta:**

La idempotencia asegura que ejecutar el proceso múltiples veces produzca el mismo resultado sin duplicar información. Esto se logra con una restricción en la base de datos que impide dos filas con el mismo usuario y el mismo instante de reproducción, sumado a una validación en el código que verifica si el registro ya existe antes de insertarlo. Cuando detecta un duplicado, lo omite y lo registra como repetido en la auditoría. De esta forma, si la ejecución se interrumpe por un fallo de red, se puede relanzar sin riesgo de corromper los datos.

---

## TQ-03 — Star vs Snowflake + justificación de la FK

**Pregunta:** ¿El modelo es estrella o copo de nieve? Justifica la FK `dim_tracks.artist_id → dim_artists`.

**Respuesta:**

El modelo se inclina más hacia un esquema estrella, aunque la relación entre canciones y artistas introduce un elemento de copo de nieve. Se decidió separar estas entidades en tablas distintas para evitar la redundancia de información. Si un artista tiene veinte canciones en el historial, su nombre, imagen y demás atributos se almacenan una sola vez en la tabla de artistas, y cada canción simplemente referencia al artista correspondiente. Esto reduce el espacio ocupado y facilita el mantenimiento, ya que cualquier actualización en los datos del artista se hace en un único lugar.

---

## TQ-04 — PKCE end-to-end

**Pregunta:** Explica el flujo OAuth PKCE de principio a fin (4 pasos).

**Respuesta:**

Primero, la aplicación genera un código secreto y un identificador único de sesión, los cuales se almacenan en la base de datos. Segundo, el usuario es redirigido a Spotify para que ingrese su usuario y contraseña directamente en la plataforma de Spotify. Tercero, Spotify retorna al usuario con un código temporal y el identificador original, el cual es verificado contra el almacenado en la base de datos para prevenir falsificaciones. Cuarto, el backend intercambia ese código temporal por los tokens de acceso que permiten consultar la información del usuario. En ningún momento la aplicación accede a la contraseña del usuario.

---

## TQ-05 — `cursor_next_ms` y carga incremental

**Pregunta:** ¿Cómo funciona la carga incremental con `cursor_next_ms`?

**Respuesta:**

El `cursor_next_ms` funciona como un marcador que indica la hora de la última reproducción procesada. En cada ejecución, el ETL consulta a Spotify únicamente las reproducciones posteriores a ese marcador, evitando reprocesar todo el historial. Al finalizar, el marcador se actualiza con la hora de la reproducción más reciente procesada. Como medida adicional de seguridad, la restricción de unicidad en la base de datos impide que se inserten registros duplicados en caso de que ocurra algún error en la actualización del marcador.
