# Empty, Error & Loading States — Frontend UX Audit

> Fecha: 2026-05-21 · Commits: `7e25822`
> Objetivo: Eliminar pantallas en blanco, spinners infinitos, errores no manejados y componentes vacíos sin explicación en todas las páginas del frontend.

---

## Diagnóstico inicial

| Página | Antes |
|---|---|
| `/login` | ✅ spinner, ❌ offline, ❌ timeout OAuth, ❌ hydration loading |
| `/callback` | ❌ sin error state, ❌ sin validación JWT, ❌ offline |
| `/dashboard` | ✅ widget load/empty/error individual, ❌ offline banner global, ❌ global loading |
| `/profile` | ✅ skeleton, ❌ offline, ❌ datos parciales nulos |
| `/etl` | ⚠️ text loading, ✅ empty, ❌ offline, ❌ timeout |
| `/docs` | ✅ skeleton, ❌ offline, ❌ timeout |

## Principios aplicados

1. **Cada estado debe comunicar**: qué pasó, por qué y qué acción tomar.
2. **SVGs** en vez de emojis string.
3. **Detectar `navigator.onLine`** en TODAS las páginas.
4. **Timeout de red** en el fetch wrapper (15s) y en login OAuth (10s).
5. **Sin cambios breaking** — strict TypeScript, responsive design, clean architecture.

---

## Componentes creados

### `hooks/useOnlineStatus.ts`
Hook que expone `boolean` en sincronía con `navigator.onLine` + suscripción a eventos `online`/`offline`.

### `components/ui/EmptyState.tsx`
- 6 variantes de icono SVG: `music`, `chart`, `sync`, `search`, `data`, `profile`.
- Props: `title`, `description`, `icon`, `action?: { label, onClick }`.
- Sin emojis, sin dependencias externas.

### `components/ui/ErrorState.tsx`
- Lookup table por código HTTP: `401`, `403`, `404`, `500`, `502`, `503`.
- Cada código tiene título y descripción amigable en español.
- Props: `message`, `status?`, `onRetry?`, `retryLabel?`.
- Fallback genérico para códigos no mapeados.

### `components/ui/OfflineBanner.tsx`
- Barra roja fija (`fixed top-0 z-[100]`).
- Texto: "Sin conexión a internet — los datos mostrados pueden estar desactualizados."
- Icono wifi-off SVG inline.

### `components/ui/Skeleton.tsx` — variantes añadidas
- `DashboardSkeleton`: replica el grid 4-columnas con widgets placeholder.
- `ProfileSkeleton`: card con avatar circular, nombre, badges y 4 filas.
- `ETLPageSkeleton`: tabla con 5 filas placeholder.
- Fix: se añadió `style?: React.CSSProperties` a `SkeletonProps` y se reemplazó `Math.random()` con valores deterministas (evita hydration mismatch).

---

## Cambios en páginas

### `lib/api.ts` — Fetch wrapper unificado

```ts
// Timeout por defecto: 15s
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);
// ...
// Errores mapeados:
// - AbortError → "El servidor no respondió a tiempo. Intenta de nuevo."
// - TypeError ("Failed to fetch") → "No se pudo conectar con el servidor."
// - 401 → clearToken + redirect a /login
```

### `lib/api-client.ts`
Eliminado por ser duplicado exacto de `lib/api.ts`. Confirmado vía `grep` que no tenía imports.

### `app/login/page.tsx`
- **Hydration**: pantalla de carga con logo + spinner mientras `isHydrated === false`.
- **Offline**: chequea `useOnlineStatus()` antes del fetch OAuth, muestra `<OfflineBanner />`.
- **Timeout**: `AbortController` con 10s para el fetch de autorización.

### `app/callback/page.tsx`
- **Validación JWT**: decodifica base64, chequea estructura (3 partes separadas por punto), verifica `exp > Date.now() / 1000`.
- **Error state**: tarjeta con icono SVG + explicación + "Redirigiendo al login..." con auto-redirect tras 2s.
- **Suspense**: fallback mejorado con spinner centrado.

### `components/dashboard/DashboardView.tsx`
- `<OfflineBanner />` condicional.
- Muestra `<DashboardSkeleton />` mientras `isHydrated === false` o `isAuthenticated === false`.
- Sin cambios en el grid ni en los widgets individuales.

### `components/profile/ProfileView.tsx`
- **Offline**: `<OfflineBanner />` condicional + manejo de error con `<ErrorState onRetry />`.
- **Empty**: si `!profile.spotify_id`, muestra estado explicativo con icono perfil + "Perfil no disponible".
- **Nulls**: `profile.email ?? "No disponible"`, `profile.country ?? "No especificado"`.
- Tipos: usa `apiFetch<UserProfile>` con tipado estricto.

### `app/etl/page.tsx`
- **Skeleton**: `<ETLPageSkeleton />` reemplaza texto "Loading...".
- **Offline**: deshabilita botón "Sincronizar ahora" + `<OfflineBanner />`.
- **Timeout**: errores de fetch manejados con `ApiError.status`.
- **Auto-refresh**: tras sync exitoso, espera 1.5s y recarga historial.
- **Empty**: `<EmptyState icon="sync" action={...} />` cuando `runs.length === 0`.
- **Spinner**: animación CSS inline en `etl.module.css`.

### `app/docs/page.tsx`
- **Timeout**: `AbortController` con 10s para `fetchOpenApiSchema`.
- **Offline**: `<OfflineBanner />` condicional.
- **Error**: `<ErrorState onRetry />` con mensaje específico de timeout vs error general.
- **Hydration**: skeleton loading para sidebar y endpoint cards.

---

## Verificación

```bash
npx tsc --noEmit      # ✅ sin errores
npm run build          # ✅ sin errores, 12 rutas generadas
```

## Archivos tocados (14)

| Archivo | Estado |
|---|---|
| `frontend/src/lib/api.ts` | modificado |
| `frontend/src/lib/api-client.ts` | eliminado |
| `frontend/src/hooks/useOnlineStatus.ts` | creado |
| `frontend/src/components/ui/EmptyState.tsx` | modificado (SVG) |
| `frontend/src/components/ui/ErrorState.tsx` | creado |
| `frontend/src/components/ui/OfflineBanner.tsx` | creado |
| `frontend/src/components/ui/Skeleton.tsx` | modificado |
| `frontend/src/app/login/page.tsx` | modificado |
| `frontend/src/app/callback/page.tsx` | modificado |
| `frontend/src/components/dashboard/DashboardView.tsx` | modificado |
| `frontend/src/components/profile/ProfileView.tsx` | modificado |
| `frontend/src/app/etl/page.tsx` | modificado |
| `frontend/src/app/etl/etl.module.css` | modificado |
| `frontend/src/app/docs/page.tsx` | modificado |
