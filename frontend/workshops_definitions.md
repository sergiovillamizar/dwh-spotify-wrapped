# Workshop Definitions — Frontend "Mi Spotify Wrapped"

Documento de referencia para el cliente web del proyecto. El frontend es una SPA que consume el backend FastAPI y presenta los datos del DWH personal de Spotify del usuario.

---

## 1. Visión General

```
┌─────────────────────────────────────────────────┐
│  FRONTEND  (localhost:3000)                     │
│  Next.js o React + Vite                         │
│                                                 │
│  /login → /callback → /dashboard               │
│                      → /profile                │
│                      → /etl                    │
└────────────────┬────────────────────────────────┘
                 │  HTTP + Bearer JWT
                 │  (todas las rutas protegidas)
┌────────────────▼────────────────────────────────┐
│  BACKEND  (localhost:8000)                      │
│  FastAPI — prefijo /v1                          │
│                                                 │
│  /v1/auth/login      /v1/auth/callback          │
│  /v1/profile/me      /v1/artists/top            │
│  /v1/tracks/top      /v1/history/recently-played│
│  /v1/etl/run         /v1/etl/status             │
└────────────────┬────────────────────────────────┘
                 │  psycopg2 / SQLAlchemy
┌────────────────▼────────────────────────────────┐
│  PostgreSQL Neon — schema dwh                   │
│  dim_users  dim_artists  dim_tracks             │
│  fact_listening_history  etl_audit              │
└─────────────────────────────────────────────────┘
```

**Principio clave**: el frontend nunca llama directamente a la Spotify API. Todos los datos vienen del backend, que a su vez los obtiene de Spotify o del DWH según el endpoint.

---

## 2. Stack

| Decisión | Opciones | Recomendación |
|---|---|---|
| Framework | **Next.js 14+** o **React + Vite** | Next.js si quieren App Router y SSR; React+Vite si prefieren simplicidad |
| Lenguaje | TypeScript | Obligatorio — tipos para todas las respuestas del backend |
| Estilos | Tailwind, shadcn/ui, Chakra UI, Material UI | Libre — lo que el estudiante ya conoce |
| HTTP client | `fetch` nativo o `axios` | Libre |
| Estado global | React Context o Zustand | Context es suficiente para este proyecto |

---

## 3. Flujo Completo de Interacción

Este es el mapa de todas las interacciones entre frontend, backend y Spotify.

### 3.1 Primer acceso (sin sesión)

```
Usuario abre http://localhost:3000
    │
    ▼
Frontend verifica localStorage["app_token"]
    │
    ├── Token presente y válido ──► redirigir a /dashboard
    │
    └── Sin token ──────────────► redirigir a /login
```

### 3.2 Flujo de Login (OAuth PKCE via backend)

```
[/login]
  Usuario hace clic en "Conectar con Spotify"
      │
      ▼
  Frontend: GET http://localhost:8000/v1/auth/login
      │
      ▼
  Backend:
    1. Genera code_verifier (random 64 bytes, URL-safe)
    2. Genera code_challenge = BASE64URL(SHA256(verifier))
    3. Genera state = UUID aleatorio
    4. Guarda {state → verifier} en public.pkce_sessions (TTL implícito: 10 min)
    5. Construye URL de Spotify:
       https://accounts.spotify.com/authorize
         ?client_id=<CLIENT_ID>
         &response_type=code
         &redirect_uri=http://127.0.0.1:8000/v1/auth/callback
         &scope=user-read-private user-read-email user-top-read user-read-recently-played
         &code_challenge=<challenge>
         &code_challenge_method=S256
         &state=<state>
    6. Responde con 302 redirect a esa URL
      │
      ▼
  Browser redirige a accounts.spotify.com
      │
  Usuario autoriza la app en Spotify
      │
      ▼
  Spotify redirige a:
  http://127.0.0.1:8000/v1/auth/callback?code=<code>&state=<state>
      │
      ▼
  Backend (/v1/auth/callback):
    1. Verifica que state existe en pkce_sessions
    2. Recupera el code_verifier asociado
    3. Elimina la fila de pkce_sessions (uso único)
    4. POST https://accounts.spotify.com/api/token
         grant_type=authorization_code
         code=<code>
         redirect_uri=http://127.0.0.1:8000/v1/auth/callback
         client_id=<CLIENT_ID>
         code_verifier=<verifier>
    5. Spotify responde: {access_token, refresh_token, expires_in: 3600}
    6. GET https://api.spotify.com/v1/me (con el access_token)
    7. UPSERT en dim_users:
         spotify_id, display_name, email, country, followers, product,
         spotify_access_token, spotify_refresh_token,
         token_expires_at = NOW() + 3600s
    8. Emite JWT de la app:
         payload = {sub: spotify_id, exp: NOW() + 8h}
         firmado con SECRET_KEY (HS256)
    9. 302 redirect a:
       http://localhost:3000/callback?token=<jwt>
      │
      ▼
[/callback]  ← ruta del FRONTEND
  Frontend:
    1. Lee token de URLSearchParams
    2. localStorage.setItem("app_token", token)
    3. Limpia la URL (history.replaceState)
    4. Redirige a /dashboard
```

### 3.3 Requests autenticados (flujo normal)

```
Cualquier llamada protegida:
  Frontend incluye header:
    Authorization: Bearer <localStorage["app_token"]>
      │
      ▼
  Backend middleware (get_current_user):
    1. Decodifica el JWT con SECRET_KEY
    2. Extrae payload.sub → spotify_id
    3. Pasa spotify_id al handler del endpoint
      │
      ▼
  Handler usa spotify_id para:
    - Consultar dim_* directamente (dashboard, profile)
    - Buscar el access_token de Spotify en dim_users (ETL)
```

### 3.4 Flujo del ETL

```
[/etl] — Usuario hace clic en "Sincronizar mis datos"
  │
  ▼
Frontend: POST /v1/etl/run
  Authorization: Bearer <app_token>
  │
  ▼
Backend:
  1. get_current_user → spotify_id
  2. Busca en dim_users: spotify_access_token, token_expires_at, spotify_refresh_token
  3. Si token_expires_at < NOW() + 5 min:
       POST https://accounts.spotify.com/api/token
         grant_type=refresh_token
         refresh_token=<refresh_token>
         client_id=<CLIENT_ID>
       Actualiza dim_users con el nuevo access_token y token_expires_at
  4. Inserta fila en etl_audit (status='running', started_at=NOW())
  5. Obtiene cursor: SELECT cursor_next_ms FROM etl_audit
                     WHERE spotify_user_id=% AND status='success'
                     ORDER BY started_at DESC LIMIT 1
  6. Ejecuta Extract → Transform → Load (ver backend/docs/workshop_definitions.md §3)
  7. Actualiza etl_audit (status='success', duration_ms, métricas, cursor_next_ms)
  8. Retorna JSON con resumen de la ejecución
  │
  ▼
Frontend muestra log paso a paso (ver §6 /etl)
```

### 3.5 Logout

```
Usuario hace clic en "Cerrar sesión"
  │
  ▼
Frontend:
  1. localStorage.removeItem("app_token")
  2. Redirige a /login
  (No hay llamada al backend — el JWT expira naturalmente)
```

---

## 4. Variables de Entorno

Para **Next.js** (archivo `.env.local` en la raíz del frontend):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Para **React + Vite** (archivo `.env` en la raíz del frontend):

```env
VITE_API_URL=http://localhost:8000
```

> Las variables públicas (que llega al browser) deben llevar el prefijo `NEXT_PUBLIC_` o `VITE_` según el framework. Nunca incluir el `SECRET_KEY` ni el `DATABASE_URL` en el frontend.

---

## 5. Estructura de Carpetas

### Next.js (App Router)

```
frontend/
├── .env.local
├── next.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx          ← layout global con Navbar
    │   ├── page.tsx            ← redirige a /dashboard o /login
    │   ├── login/
    │   │   └── page.tsx
    │   ├── callback/
    │   │   └── page.tsx        ← recibe JWT de la URL, guarda en localStorage
    │   ├── dashboard/
    │   │   └── page.tsx
    │   ├── profile/
    │   │   └── page.tsx
    │   └── etl/
    │       └── page.tsx
    ├── components/
    │   ├── Navbar.tsx
    │   ├── ProtectedRoute.tsx  ← HOC que redirige a /login si no hay token
    │   ├── dashboard/
    │   │   ├── TopArtistsCard.tsx
    │   │   ├── TopTracksCard.tsx
    │   │   ├── PeakHourCard.tsx
    │   │   └── GenresCard.tsx
    │   └── etl/
    │       ├── DwhStatusTable.tsx
    │       ├── RunHistory.tsx
    │       └── SyncButton.tsx
    ├── lib/
    │   ├── api.ts              ← wrapper de fetch con Bearer token automático
    │   └── auth.ts             ← helpers: getToken, isTokenValid, logout
    └── types/
        ├── user.ts
        ├── artist.ts
        ├── track.ts
        ├── history.ts
        └── etl.ts
```

### React + Vite

```
frontend/
├── .env
├── vite.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx                 ← React Router con rutas protegidas
    ├── pages/
    │   ├── Login.tsx
    │   ├── Callback.tsx
    │   ├── Dashboard.tsx
    │   ├── Profile.tsx
    │   └── Etl.tsx
    ├── components/             ← igual que Next.js
    ├── lib/
    │   ├── api.ts
    │   └── auth.ts
    └── types/
```

---

## 6. Páginas y Requisitos Mínimos

### `/login`

**Función**: punto de entrada. Si el usuario ya tiene sesión, redirigir sin mostrar esta página.

```typescript
// lib/auth.ts
export function getToken(): string | null {
  return localStorage.getItem("app_token");
}

export function isTokenExpired(token: string): boolean {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.exp * 1000 < Date.now();
}
```

**UI mínima:**
- Logo de la app + nombre
- Botón "Conectar con Spotify" → `window.location.href = "${API_URL}/v1/auth/login"`
- Sin formularios de registro ni contraseña

---

### `/callback`

**Función**: ruta técnica, invisible al usuario. Recibe el JWT del backend y redirige al dashboard.

```typescript
// pages/Callback.tsx (o app/callback/page.tsx)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem("app_token", token);
    window.history.replaceState({}, "", "/callback"); // limpia el token de la URL
    router.push("/dashboard");
  } else {
    router.push("/login"); // si no llegó token → volver a login
  }
}, []);
```

**UI**: solo un spinner/loading mientras procesa.

---

### `/profile`

**Función**: muestra el perfil del usuario autenticado desde el backend.

**Endpoint**: `GET /v1/profile/me`

**Respuesta esperada:**
```typescript
interface UserProfile {
  spotify_id: string;
  display_name: string;
  email: string;
  country: string;
  followers: number;
  product: "free" | "premium";
  images?: { url: string }[];          // puede venir del perfil de Spotify
  external_url?: string;               // enlace al perfil de Spotify
}
```

**UI mínima:**
| Elemento | Datos |
|---|---|
| Avatar circular | `images[0].url` si existe, placeholder si no |
| Nombre | `display_name` |
| Email | `email` |
| País | `country` (código ISO → ej. "CO") |
| Tipo de cuenta | `product` con badge visual (Free / Premium) |
| Seguidores | `followers` formateado con separador de miles |
| Link externo | "Ver en Spotify" → `external_url` en tab nueva |

---

### `/dashboard`

**Función**: vista principal de KPIs analíticos. Todos los datos vienen del backend.

**Endpoints necesarios:**
```
GET /v1/artists/top         → top 5 artistas
GET /v1/tracks/top          → top 5 canciones
GET /v1/history/peak-hour   → hora con más reproducciones  (*)
GET /v1/history/genres      → géneros dominantes           (*)
```

> (*) Estos sub-endpoints del historial ejecutan las queries analíticas §7 del backend. El router `history.py` puede tener rutas adicionales: `GET /v1/history/peak-hour` y `GET /v1/history/genres`.

**Widgets mínimos:**

| Widget | Contenido |
|---|---|
| **Top 5 Artistas** | Nombre + imagen (si disponible) + barra de popularidad (0–100) |
| **Top 5 Canciones** | Nombre + artista + duración formateada (mm:ss) |
| **Hora pico** | Número grande con la hora, ej. "14:00 – 15:00" |
| **Géneros dominantes** | Lista o bar chart con top 5 géneros y conteo de artistas |

**Estado vacío**: si las tablas no tienen datos (primer uso antes del ETL), mostrar un mensaje claro: *"Tu DWH está vacío. Ve a la pestaña ETL y sincroniza tus datos."*

---

### `/etl`

**Función**: monitoreo del DWH y ejecución manual del pipeline.

**Bloque A — Estado del DWH**

Endpoint: `GET /v1/etl/status`

```typescript
interface EtlStatus {
  tables: {
    name: string;
    record_count: number;
    last_loaded_at: string | null;
    status: "empty" | "loaded" | "stale";  // stale = last_loaded_at > 24h
  }[];
  last_runs: {
    audit_id: number;
    started_at: string;
    duration_ms: number;
    status: "success" | "error";
    history_new: number;
    artists_new: number;
    tracks_new: number;
    error_message: string | null;
  }[];
}
```

UI:
- Tabla con las 4 tablas del DWH, conteo y badge de estado
- Tabla con las últimas 10 ejecuciones del ETL (de `etl_audit`)

**Bloque B — Ejecutar ETL**

Endpoint: `POST /v1/etl/run`

```typescript
// Respuesta del endpoint
interface EtlRunResult {
  audit_id: number;
  duration_ms: number;
  status: "success" | "error";
  steps: { phase: string; detail: string; ok: boolean }[];
  metrics: {
    users_new: number;
    artists_new: number; artists_skipped: number;
    tracks_new: number;  tracks_skipped: number;
    history_new: number; history_skipped: number;
  };
}
```

UI del log (se construye desde `steps` en la respuesta):
```
[ ✅ ] Extract: perfil de usuario obtenido
[ ✅ ] Extract: 50 artistas obtenidos
[ ✅ ] Extract: 50 canciones obtenidas
[ ✅ ] Extract: 50 reproducciones recientes obtenidas
[ ✅ ] Transform: timestamps normalizados
[ ✅ ] Transform: géneros procesados como TEXT[]
[ ✅ ] Load: dim_users — 1 nuevo / 0 ya existían
[ ✅ ] Load: dim_artists — 47 nuevos / 3 ya existían
[ ✅ ] Load: dim_tracks — 50 nuevos / 0 ya existían
[ ✅ ] Load: fact_listening_history — 50 nuevos / 0 ya existían
[ ✅ ] Auditoría registrada — duración: 1.23 s
```

El botón debe desactivarse mientras el ETL corre y mostrar un spinner.

---

## 7. Wrapper de API (`lib/api.ts`)

Para evitar repetir el token en cada fetch, centralizar en un helper:

```typescript
const API_URL = import.meta.env.VITE_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("app_token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("app_token");
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}
```

Uso:
```typescript
const artists = await apiFetch<ArtistResponse[]>("/v1/artists/top");
const result  = await apiFetch<EtlRunResult>("/v1/etl/run", { method: "POST" });
```

---

## 8. Navbar y Rutas Protegidas

```typescript
// components/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
```

**Navbar** (visible en todas las rutas protegidas):
- Links: Dashboard · Perfil · ETL
- Avatar del usuario (del perfil cacheado) + nombre
- Botón "Cerrar sesión" → `logout()` → redirige a `/login`

---

## 9. Diseño con IA (IA-primero, código después)

Los estudiantes deben **diseñar antes de codificar**. Flujo recomendado:

```
1. Prompt descriptivo → herramienta IA → mockup/wireframe
2. Exportar a Figma para ajustes de detalle
3. Generar código base (Lovable AI / v0 / Framer AI)
4. Conectar al backend con apiFetch
5. Integrar autenticación y estados vacíos
```

**Herramientas por fase:**

| Fase | Herramienta | Fortaleza |
|---|---|---|
| Layout desde texto | **Google Stitch** | Genera 4 páginas completas desde un prompt, exporta a Figma |
| Wireframe desde boceto | **Uizard** | Digitaliza sketches a mano |
| Sitemap y flujos de usuario | **Relume AI** | Arquitectura de navegación completa |
| Flujos + mockups autónomos | **Banani AI** | Mapea user flows y genera mockups |
| Design system y componentes | **Figma AI** | Componentes reutilizables, auto-layout |
| Código React desde Figma | **Lovable AI** | Genera React funcional desde archivo Figma |
| UI responsive desde prompt | **Framer AI** | Página lista para conectar a API |
| Componentes shadcn/ui | **v0 by Vercel** | Componentes React/Tailwind desde screenshot o prompt |

**Prompt base** (copiar y adaptar):

> *"Design a personal Spotify analytics dashboard web app. 4 pages:*
> *1. Login: single 'Connect with Spotify' button, centered, dark background.*
> *2. Profile: circular avatar, display name, email, country, account type badge (Free/Premium), followers count, external Spotify link.*
> *3. Dashboard: top 5 artists (image + name + popularity bar), top 5 tracks (name + artist + duration), peak listening hour (large number), dominant genres (horizontal bar chart).*
> *4. ETL Runner: DWH status table (4 rows: table name, record count, last sync, status badge), recent executions history table, 'Sync Now' button with step-by-step text log.*
> *Dark theme, Spotify green accent #1DB954, card-based layout, responsive for laptop."*

**Entregable de diseño**: archivo Figma (o captura de la herramienta usada) con las 5 vistas (`/login`, `/callback` no necesita diseño, `/dashboard`, `/profile`, `/etl`) + un párrafo por vista justificando las decisiones de UX.

---

## 10. Requisitos Mínimos de Entrega

1. El flujo PKCE completo funciona sin copiar tokens manualmente.
2. El JWT se guarda en `localStorage` y se envía automáticamente en todos los requests.
3. Las rutas protegidas redirigen a `/login` si no hay token válido.
4. El dashboard muestra estado vacío claro cuando no hay datos en el DWH.
5. El botón "Sincronizar" ejecuta el ETL y muestra el log de pasos.
6. La app es usable en pantalla de laptop (responsive básico — no requiere mobile-first).
7. Los datos del dashboard se obtienen del backend, no directamente de la Spotify API.
