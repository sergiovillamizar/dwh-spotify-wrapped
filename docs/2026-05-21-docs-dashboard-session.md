# Sesión 2026-05-21 — Interactive API Docs Dashboard (Swagger UI replacement)

## Metadata

- **Fecha**: 2026-05-21
- **Branch**: `feature/oauth-fix`
- **Commit**: `58c29dd` — `feat(docs): add interactive API docs dashboard replacing Swagger UI`
- **Dev**: Sergio + Didier (via Claude Code)
- **Estado**: Build exitoso, commit pusheado, pendiente de mejoras UI

---

## Objetivo

Construir un dashboard de documentación interactiva estilo SaaS/premium que reemplace Swagger UI para el backend FastAPI del proyecto. Debe consumir el schema OpenAPI desde `https://34-54-8-28.nip.io/v1/openapi.json`, detectar endpoints automáticamente, y permitir probarlos con autenticación JWT.

---

## Requerimientos

- Next.js 14, TypeScript, TailwindCSS, App Router, responsive
- Dark theme con colores Spotify (verde, negro, gris), glassmorphism, animaciones suaves
- Tipado estricto — sin `any`
- Auto-detección de endpoints desde schema OpenAPI
- Inyección automática de `Authorization: Bearer <token>` en cada request
- Secciones: Dashboard, Auth, Profile, Artists, Tracks, History, ETL, Health
- Componentes extra: skeletons de carga, empty states, errores, toasts, copy cURL, syntax highlighting, "Open in Swagger" link

---

## Decisiones Técnicas

| Decisión | Alternativa | Elección |
|---|---|---|
| Estilos | CSS modules vs Tailwind | **TailwindCSS 3** (nuevo en el proyecto, no conflictivo) |
| Syntax highlighting | `prism-react-renderer` vs regex | **Regex inline** (0 dependencias, ligero) |
| Estado del token | Context vs localStorage | **localStorage** (clave `docs_bearer_token`, aislada de `app_token`) |
| Schema fetch | Server-side proxy vs directo | **Proxy route** `/api/proxy` (evita CORS desde el browser) |
| Toast system | Biblioteca vs custom | **Context + portal** propio (~80 líneas, sin dependencias) |
| Animaciones | framer-motion vs CSS | **CSS nativo** (glass, skeleton-pulse, transiciones) |
| Manejo de clases | `clsx` vs template strings | **`clsx`** ya disponible en el proyecto |

---

## Archivos Creados (26 archivos)

### Configuración
- `frontend/tailwind.config.ts` — Tema Spotify (colores, glass tokens, animaciones)
- `frontend/postcss.config.js` — PostCSS con Tailwind + Autoprefixer
- `frontend/src/styles/tailwind.css` — Directivas Tailwind + utilidades custom (glass, skeleton, scrollbar)

### Tipos y Servicios
- `frontend/src/types/openapi.ts` — Tipos TypeScript para schema OpenAPI completo (~400 líneas)
- `frontend/src/services/openApiService.ts` — Fetch, parse y agrupación de endpoints por tag
- `frontend/src/services/apiService.ts` — Ejecución de requests con JWT, generación de cURL

### Utilidades
- `frontend/src/lib/utils.ts` — `cn()`, `formatDate()`, `pluralize()`

### Componentes UI (primitivas reutilizables)
- `frontend/src/components/ui/MethodBadge.tsx` — Badge de método HTTP (GET, POST, etc.)
- `frontend/src/components/ui/TokenInput.tsx` — Input de token con show/hide, copy, clear
- `frontend/src/components/ui/Toast.tsx` — Provider + hook + portal para notificaciones
- `frontend/src/components/ui/Skeleton.tsx` — Skeletons de card y sidebar
- `frontend/src/components/ui/EmptyState.tsx` — Estado vacío con icono, título, acción

### Componentes Docs (página de documentación)
- `frontend/src/components/docs/Navbar.tsx` — Top bar con branding, token input, link Swagger
- `frontend/src/components/docs/Sidebar.tsx` — Sidebar con categorías y endpoints
- `frontend/src/components/docs/Dashboard.tsx` — Grid de resumen con stats y cards de categorías
- `frontend/src/components/docs/EndpointCard.tsx` — Card colapsable con detalles y botón Try It
- `frontend/src/components/docs/EndpointList.tsx` — Lista de endpoints filtrados por tag activo
- `frontend/src/components/docs/TryItPanel.tsx` — Modal completo de request builder + response
- `frontend/src/components/docs/JsonViewer.tsx` — JSON formateado con colores syntax + schema view

### Páginas y Layouts
- `frontend/src/app/docs/layout.tsx` — Layout con metadata SEO
- `frontend/src/app/docs/layout-client.tsx` — Layout client-side con ToastProvider y Sidebar
- `frontend/src/app/docs/page.tsx` — Página principal: carga schema, muestra Dashboard o lista de endpoints
- `frontend/src/app/api/proxy/route.ts` — Route handler para proxy del schema OpenAPI

### Archivos Modificados
- `frontend/src/app/layout.tsx` — Añadido import de `tailwind.css`
- `frontend/next.config.mjs` — Añadido `remotePatterns` para `*.nip.io`
- `frontend/package.json` — Dependencias nuevas: `tailwindcss@3`, `postcss`, `autoprefixer`
- `frontend/package-lock.json` — Actualizado

---

## Verificación

```bash
$ npm run build
✓ Compiled successfully
Route (app)                              Size     First Load JS
┌ ○ /                                    545 B          87.9 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ○ /api/health                          0 B                0 B
├ ƒ /api/proxy                           0 B                0 B
├ ○ /callback                            733 B          88.1 kB
├ ○ /dashboard                           4.67 kB         102 kB
├ ○ /docs                                9.3 kB         96.7 kB   # <-- NUEVO
├ ○ /etl                                 2.39 kB        99.3 kB
├ ○ /login                               1.91 kB        89.3 kB
└ ○ /profile                             3.49 kB        90.8 kB
```

Arquitectura del flujo:
```
Browser → /docs (Next.js SSR)
         → /api/proxy (Next.js API route) → 34-54-8-28.nip.io/v1/openapi.json
         → TryItPanel → 34-54-8-28.nip.io/v1/... (directo, con JWT)
         → localStorage (docs_bearer_token)
```

---

## Commits

```bash
58c29dd feat(docs): add interactive API docs dashboard replacing Swagger UI
 30 files changed, 3238 insertions(+), 9 deletions(-)

- Add TailwindCSS with Spotify dark theme, glassmorphism, animations
- Create OpenAPI schema types, fetch service with endpoint grouping
- Add interactive TryItPanel with JWT auth injection, cURL generation
- Build Dashboard overview, EndpointCard, Sidebar, Navbar components
- Include UI primitives: MethodBadge, JsonViewer, Toast, Skeleton, TokenInput, EmptyState
- Proxy route for OpenAPI schema to avoid CORS issues
- Full layout at /docs with responsive sidebar and category navigation
```

---

## Pendiente / Próximos Pasos

El usuario solicita seguir mejorando el frontend. Opciones planteadas:

1. **Nav link** — enlazar `/docs` desde el header del dashboard principal
2. **Mobile responsive** — mejorar sidebar y navbar docs en pantallas pequeñas
3. **Más animaciones** — transiciones suaves en EndpointCard, TryItPanel
4. **Página de login** — rediseñar con el theme Spotify
5. **Dashboard principal** — enriquecer con gráficos, sparklines, datos reales
6. **Estado global** — theme provider con JWT token compartido entre módulos
7. **End-to-end test** — verificar que el dashboard carga datos reales desde producción
