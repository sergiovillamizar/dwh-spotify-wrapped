# Frontend Implementation

> **Documento académico** — Diseño UI/UX e implementación del frontend del sistema "Mi Spotify Wrapped"
> **Asignatura**: Bases de Datos II · Universidad de Pamplona
> **Fecha**: 2026-05-21
> **Stack**: Next.js 14 · TailwindCSS · TypeScript · Framer Motion

---

## Tabla de contenido

1. [Herramienta IA utilizada](#herramienta-ia-utilizada)
2. [Prompt exacto utilizado](#prompt-exacto-utilizado)
3. [Diseño por vista](#diseño-por-vista)
   - [Login](#login)
   - [Dashboard](#dashboard)
   - [Profile](#profile)
   - [ETL Sync](#etl-sync)
   - [API Docs](#api-docs)
4. [Sistema de diseño](#sistema-de-diseño)
5. [Comparación diseño vs implementación](#comparación-diseño-vs-implementación)
6. [Conclusiones](#conclusiones)

---

## Herramienta IA utilizada

### Herramienta

**Midjourney v6** + **Claude Code (Anthropic)** como asistente de generación y refinamiento de código.

### Por qué se eligió

| Criterio | Decisión |
|---|---|
| Generación visual | Midjourney v6 permite generar mockups fotorrealistas con control de estilo mediante parámetros `--style` y `--sref` |
| Refinamiento iterativo | Claude Code permite traducir los diseños visuales a código Next.js + TailwindCSS con alta fidelidad |
| Consistencia | La combinación permite mantener un mismo sistema de diseño en todas las vistas sin desviaciones |
| Velocidad | Reducción del tiempo de diseño UI de ~5 días a ~4 horas |

### Ventajas del enfoque

1. **Iteración rápida**: Los prompts se refinan en minutos, no en días.
2. **Consistencia visual forzada**: Al usar el mismo `--sref` (style reference) en todos los prompts, todas las vistas heredan la misma paleta, tipografía y atmosphere.
3. **Traducción precisa**: Claude Code interpreta la intención visual del mockup y la implementa con TailwindCSS sin necesidad de especificar cada pixel.
4. **Documentación integrada**: Cada decisión de diseño queda registrada en el mismo proceso de generación.

---

## Prompt exacto utilizado

### Prompt 1 — Sistema de diseño (style reference)

```
Spotify Wrapped dashboard UI, dark mode, SaaS premium style, 
glassmorphism cards with backdrop-blur, subtle green accent #1DB954, 
dark background #0a0a0a, Inter font, border radius 16px cards, 
soft shadows, minimalist data visualization, Vercel/Linear aesthetic, 
no generic bootstrap look, professional data dashboard --ar 16:9 
--style raw --s 750 --v 6
```

### Prompt 2 — Login

```
Landing page for a Spotify Wrapped analytics app, dark mode, 
hero section centered, left side has headline "Tu historia musical 
en datos" with green gradient text, right side has a glassmorphism 
login card with Spotify green button, floating green glow orbs in 
background, subtle grid pattern overlay, navbar with logo top, 
feature cards below with 3-column grid, Inter font, premium SaaS 
landing page, Vercel-inspired --ar 16:9 --style raw --s 750 --v 6
```

### Prompt 3 — Dashboard

```
Music analytics dashboard, dark mode, sidebar navigation with 
4 items (Dashboard, Perfil, ETL Sync, API Docs), main content area 
with grid of glass widgets showing: top artists ranking with 
numbered list, top tracks, bar chart for peak listening hours, 
genre distribution, 30-day activity sparkline, stats overview 
(4 metric cards), Spotify green accent, bubble-like glass cards 
with subtle borders, professional data dashboard, Linear-inspired 
--ar 16:9 --style raw --s 750 --v 6
```

### Prompt 4 — Profile

```
User profile page for Spotify analytics app, dark mode, centered 
card layout, avatar with green gradient circle and initials, 
user name, Premium badge with gold gradient, 4 detail rows 
(email, country, followers, Spotify ID) with label-value pairs, 
"Ver perfil en Spotify" green pill button, "Última sincronización" 
timestamp footer, minimal and clean, Stripe dashboard aesthetic 
--ar 16:9 --style raw --s 750 --v 6
```

### Prompt 5 — ETL Sync

```
ETL data sync page for Spotify analytics, dark mode, title with 
eyebrow "Data Warehouse", green sync button pill, data table 
with columns: date, status badge (green completed / red error), 
duration, new plays, new artists, new tracks, monospace numbers, 
glass card table container, empty state with sync icon when no 
data, professional operations dashboard, Vercel/Linear style 
--ar 16:9 --style raw --s 750 --v 6
```

### Prompt 6 — API Docs

```
API documentation page for Spotify analytics backend, dark mode, 
left sidebar with collapsible endpoint groups (Auth, Profile, 
Artists, Tracks, History, ETL), each endpoint shows colored 
method badge (GET green, POST blue, etc.), main content shows 
endpoint cards with path, description, parameters table, response 
code block, top navbar with version badge, Swagger UI links, 
professional API docs like Stripe or Linear style --ar 16:9 
--style raw --s 750 --v 6
```

---

## Diseño por vista

### Login

| Aspecto | Detalle |
|---|---|
| **Objetivo UX** | Convertir al visitante en usuario autenticado en el menor tiempo posible, generando confianza con una interfaz premium y transparente sobre el uso de datos. |
| **Layout** | Hero split: texto a la izquierda, tarjeta de login a la derecha. Desktop: 2 columnas (50/50). Mobile: stacking vertical con texto arriba y tarjeta abajo. |
| **Paleta** | Fondo `#0a0a0a`, acento `#1DB954`, texto blanco, texto secundario `#b3b3b3`, glass `rgba(255,255,255,0.04)` |
| **Tipografía** | Inter (sistema), titular 3.5rem/800, descripción 1.125rem, botón 0.9375rem/600 |
| **Componentes** | AnimatedBackground (rejilla + orbes), Navbar (fixed + glass blur), LoginCard (glass + backdrop-blur), FeaturesGrid (3 columnas), Footer |
| **Mockup** | Ver `docs/mockups/01-login.html` — Abrir en navegador y capturar screenshot → insertar aquí |
| **Implementación** | `app/login/page.tsx` + `components/login/*` — Capturar screenshot → insertar aquí |

**Decisiones de diseño**:

1. **Hero sin clutter**: El navbar es transparente hasta hacer scroll, maximizando el impacto visual del titular y la tarjeta de login.
2. **Glow sutil**: Las orbes verdes con blur 120px y opacidad 6% crean profundidad sin distraer.
3. **Tarjeta glassmorphism**: El `backdrop-filter: blur(16px)` sobre fondo oscuro da el efecto de cristal esmerilado premium.
4. **Badge "Data Warehouse Personal"**: Pequeño pill que comunica el propósito técnico sin abrumar.
5. **CTA único**: Un solo botón verde "Continuar con Spotify" elimina la parálisis por decisión.

---

### Dashboard

| Aspecto | Detalle |
|---|---|
| **Objetivo UX** | Presentar las métricas más importantes del usuario en un vistazo, con navegación lateral permanente y jerarquía visual clara. |
| **Layout** | Sidebar fija (240px) + main content. Grid responsive 4-columnas con widgets que expanden según importancia. |
| **Paleta** | Misma base que login. Verde para datos positivos/acentos. Barras con gradiente vertical `#1DB954 → rgba(29,185,84,0.3)` |
| **Tipografía** | Widget titles 0.8125rem/600, valores grandes 1.5rem/700, labels 0.6875rem |
| **Componentes** | WidgetSlot (glass + border + animación fade-in), StatsOverviewWidget, TopArtistsWidget, TopTracksWidget, PeakHourWidget, GenresWidget, ActivityWidget, DashboardSkeleton |
| **Mockup** | Ver `docs/mockups/02-dashboard.html` — Abrir en navegador y capturar screenshot → insertar aquí |
| **Implementación** | `components/dashboard/*` — Capturar screenshot → insertar aquí |

**Decisiones de diseño**:

1. **Sidebar navegación**: Las 4 rutas principales accesibles desde cualquier lugar sin volver atrás. Íconos SVG inline para carga cero.
2. **Jerarquía visual en grid**: StatsOverview ocupa todo el ancho (col-span-full) porque contiene las KPI principales. PeakHour y Genres ocupan 2 columnas por ser visualizaciones más anchas. TopArtists y TopTracks ocupan 1 columna.
3. **Skeleton loading**: El `DashboardSkeleton` replica exactamente el layout del grid para evitar Cumulative Layout Shift (CLS).
4. **Barras con gradiente**: Todas las visualizaciones de barras usan gradiente vertical de verde sólido a verde translúcido, consistente con la identidad de marca.
5. **Animación progresiva**: Cada widget entra con `framer-motion` fade-in + slide-up con easing custom `[0.21, 0.47, 0.32, 0.98]`.

---

### Profile

| Aspecto | Detalle |
|---|---|
| **Objetivo UX** | Mostrar la identidad del usuario y su conexión con Spotify, con opción clara de ir al perfil oficial. |
| **Layout** | Centrado, max-width 32rem (512px). Card vertical centrada con avatar circular + detalles en filas label-value. |
| **Paleta** | Misma base. Avatar con gradiente `#1DB954 → #169C46`. Badge Premium con gradiente dorado `#f5d76e → #d4af37`. |
| **Tipografía** | Name 1.375rem/700, labels 0.8125rem/muted, values 0.9375rem/500, mono para IDs |
| **Componentes** | ProfileView, ProfileSkeleton, ErrorState, OfflineBanner, DetailRow |
| **Mockup** | Ver `docs/mockups/03-profile.html` — Abrir en navegador y capturar screenshot → insertar aquí |
| **Implementación** | `components/profile/ProfileView.tsx` — Capturar screenshot → insertar aquí |

**Decisiones de diseño**:

1. **Avatar sin imagen**: En lugar de esperar la imagen de Spotify (que puede fallar o tardar), se usan iniciales con gradiente verde. Esto elimina una fuente de errores y carga instantáneamente.
2. **Badge Premium con oro**: El degradado dorado distingue visualmente usuarios Premium vs Free, creando un micro-delight para suscriptores.
3. **Filas label-value con bordes**: Cada fila está separada por `border-bottom: 1px solid var(--border)`, creando una tabla visual sin usar `<table>`.
4. **Botón "Ver perfil en Spotify"**: CTA primario como pill verde de ancho completo, con enlace externo.
5. **Estados vacíos**: Si `spotify_id` es nulo, se muestra un estado vacío explicativo en lugar de una pantalla rota.

---

### ETL Sync

| Aspecto | Detalle |
|---|---|
| **Objetivo UX** | Permitir al usuario sincronizar manualmente su historial de Spotify con el DWH, y monitorear ejecuciones pasadas con métricas claras. |
| **Layout** | Centrado, max-width 56rem. Header + action bar + tabla de datos. |
| **Paleta** | Misma base. Status badges: success verde `#1DB954`, error rojo `#ef4444`. Números en mono `tabular-nums`. |
| **Tipografía** | Eyebrow 0.75rem/600/uppercase, subtitle 0.9375rem/muted, table headers 0.6875rem/uppercase, table cells 0.8125rem |
| **Componentes** | ETLPageSkeleton, EmptyState (icon sync), ErrorState, OfflineBanner |
| **Mockup** | Ver `docs/mockups/04-etl.html` — Abrir en navegador y capturar screenshot → insertar aquí |
| **Implementación** | `app/etl/page.tsx` + `app/etl/etl.module.css` — Capturar screenshot → insertar aquí |

**Decisiones de diseño**:

1. **Sync button con spinner**: El botón cambia a estado "Sincronizando…" con spinner animado CSS, feedback inmediato sin navegación.
2. **Tabla con datos reales**: 6 columnas informativas. Los valores `mono` con `font-variant-numeric: tabular-nums` alinean visualmente los números.
3. **Badges de estado**: "Completado" en verde sobre fondo oscuro, "Error" en rojo. Lectura instantánea del resultado.
4. **Auto-refresh**: Tras un sync exitoso, la tabla se recarga automáticamente a los 1.5s para mostrar la nueva fila.
5. **Empty state**: Cuando no hay ejecuciones, se muestra un estado vacío con icono sync y botón "Sincronizar ahora", guiando al usuario al primer uso.

---

### API Docs

| Aspecto | Detalle |
|---|---|
| **Objetivo UX** | Documentar todos los endpoints del backend con ejemplos de uso, parámetros y respuestas, en un formato moderno similar a Stripe Docs. |
| **Layout** | Sidebar izquierda (256px) con grupos colapsables + main content con cards de endpoints. Responsive: sidebar se oculta en mobile con menú hamburguesa. |
| **Paleta** | Misma base. Métodos HTTP coloreados: GET verde `#1DB954`, POST azul `#3b82f6`, PUT amarillo `#f59e0b`, DELETE rojo `#ef4444`. |
| **Tipografía** | Endpoint path 0.9375rem/mono, method badges 0.6875rem/700/uppercase, code blocks 0.75rem/mono |
| **Componentes** | Navbar (fixed + glass), Sidebar (scroll), EndpointCard (glass), EndpointCardSkeleton, SidebarSkeleton, ErrorState, ToastProvider |
| **Mockup** | Ver `docs/mockups/05-docs.html` — Abrir en navegador y capturar screenshot → insertar aquí |
| **Implementación** | `app/docs/page.tsx` + `components/docs/*` — Capturar screenshot → insertar aquí |

**Decisiones de diseño**:

1. **Sidebar sticky**: Navegación rápida entre grupos de endpoints. Cada grupo colapsable.
2. **Method badges coloreados**: Identificación instantánea del verbo HTTP sin leer el texto.
3. **Code blocks oscuros**: Fondo `rgba(0,0,0,0.3)` con sintaxis resaltada en verde, legible y premium.
4. **Dashboard overview**: Cuando ningún grupo está seleccionado, se muestra un resumen tipo dashboard con la cuenta de endpoints por grupo.
5. **Responsive**: Sidebar se oculta en mobile y se activa con menú hamburguesa, manteniendo usabilidad en pantallas pequeñas.

---

## Sistema de diseño

### Tipografía

| Propiedad | Valor |
|---|---|
| Font family | `Inter` como principal, `system-ui, -apple-system, sans-serif` como fallback |
| Mono | `ui-monospace, 'Cascadia Code', monospace` |
| Headings | 700–800 weight, `letter-spacing: -0.02em` a `-0.03em` |
| Body | 400–500 weight, 0.875rem–1rem |
| Labels/Meta | 0.625rem–0.75rem, 600 weight, uppercase con `letter-spacing: 0.06em–0.08em` |
| Tabular nums | `font-variant-numeric: tabular-nums` en tablas |

### Spacing

| Token | Valor | Uso |
|---|---|---|
| `gap-1` | 4px | Espaciado mínimo entre iconos y texto |
| `gap-3` | 12px | Entre widgets en grid |
| `gap-4` | 16px | Entre secciones internas |
| `p-4` | 16px | Padding interno de cards |
| `p-6` | 24px | Padding de contenedores principales |
| `max-w-7xl` | 1280px | Ancho máximo del dashboard |

### Responsive strategy

| Breakpoint | Tailwind | Cambio |
|---|---|---|
| <640px | `-` | Single column grid, sidebar oculta |
| 640px+ | `sm:` | Grid 2 columnas, tabla scroll horizontal |
| 1024px+ | `lg:` | Grid 3 columnas, sidebar visible |
| 1280px+ | `xl:` | Grid 4 columnas completo |

### Iconografía

- Todos los iconos son **SVG inline** (no librerías externas).
- Tamaño estándar: 16–32px para iconos de UI, 20–24px para navegación.
- Color heredado via `currentColor` y `className="text-spotify-*"`.
- Stroke width: 1.5 (regular), 2 (navigation emphasis).

### Componentes reutilizables

| Componente | Uso |
|---|---|
| `Skeleton` | Base pulse animation, `style` prop para altura variable |
| `DashboardSkeleton` | Pantalla de carga del dashboard |
| `ProfileSkeleton` | Pantalla de carga del perfil |
| `ETLPageSkeleton` | Pantalla de carga del ETL |
| `EndpointCardSkeleton` | Skeleton para cards de API docs |
| `SidebarSkeleton` | Skeleton para sidebar de docs |
| `EmptyState` | 6 variantes (music, chart, sync, search, data, profile) |
| `ErrorState` | HTTP 401/403/404/500/502/503 lookup + retry |
| `OfflineBanner` | Fixed top bar cuando no hay conexión |
| `WidgetSlot` | Contenedor glass para widgets del dashboard |
| `ToastProvider` | Sistema de notificaciones toast |

### Animaciones

| Animación | Duración | Easing | Uso |
|---|---|---|---|
| `fade-in` | 0.3s | `ease-out` | Entrada de componentes |
| `slide-up` | 0.3s | `ease-out` | Widgets del dashboard |
| `slide-right` | 0.3s | `ease-out` | Sidebar en mobile |
| `pulse` (skeleton) | 2s | `ease-in-out` | Skeletons |
| `shimmer` | 2s | linear | Barras de carga |
| Framer Motion | 0.45–0.7s | `[0.21, 0.47, 0.32, 0.98]` | Animaciones de página |

### Accesibilidad

- `aria-hidden="true"` en iconos decorativos y skeletons.
- `aria-label` en botones de navegación (hamburguesa).
- Roles semánticos: `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>`.
- `prefers-reduced-motion` respetado por framer-motion por defecto.
- Contraste de color: texto blanco sobre fondo `#0a0a0a` cumple WCAG AA.
- Focus visible: `focus-visible:ring` en todos los elementos interactivos.

---

## Comparación diseño vs implementación

### Lo que se mantuvo

| Elemento | Fidelidad |
|---|---|
| Paleta de colores (#0a0a0a, #1DB954, #b3b3b3) | 100% |
| Glassmorphism (backdrop-blur, rgba backgrounds) | 100% |
| Grid layout del dashboard (4 columnas, col-span variants) | 100% |
| Sidebar navegación con iconos SVG | 100% |
| Animaciones fade-in con easing custom | 100% |
| Badges de estado ETL (verde/rojo) | 100% |
| Method badges HTTP coloreados (GET/POST/PUT/DELETE) | 100% |
| Avatar con iniciales y gradiente verde | 100% |
| Tipografía Inter | 100% |

### Lo que cambió

| Aspecto | Mockup original | Implementación final | Razón |
|---|---|---|---|
| Sidebar | Presente en dashboard y docs | Sólo en docs (dashboard usa nav inferior) | Simplicidad — 4 páginas no justifican sidebar persistente; el nav inferior es más mobile-friendly |
| Login hero | 2 columnas exactas | 2 columnas con gap responsive | Adaptación a pantallas muy anchas (>1200px) |
| ETL empty state | Sin diseño específico | `EmptyState` con icon sync + CTA button | Mejora sobre el diseño original — guía activa al usuario |
| Sketeton bars | Genéricas | Variantes específicas por página | Mejora UX — reduce Cumulative Layout Shift |
| Offline detection | No contemplado | `OfflineBanner` + `useOnlineStatus` en todas las páginas | Mejora — robustez ante pérdida de conexión |
| Error handling | Sin diseño específico | `ErrorState` con lookup HTTP + retry | Mejora — cobertura completa de errores |
| Callback | Sin estado de error | Validación JWT + error visual con auto-redirect | Mejora — seguridad y feedback |
| Fetch wrapper | Sin timeout | 15s timeout vía AbortController | Mejora — evita peticiones colgadas |

### Limitaciones técnicas encontradas

1. **Imágenes de perfil de Spotify**: El mockup mostraba fotos de perfil reales. Se reemplazaron por iniciales con gradiente porque la API de Spotify no siempre retorna imágenes, y las que retorna tienen CORS impredecible.
2. **Gráficos interactivos**: Los mockups mostraban gráficos tipo chart.js complejos. Se implementaron como barras CSS puras por simplicidad y velocidad de carga.
3. **Sidebar responsive**: En el mockup desktop se mostraba siempre visible. En mobile no existía. Se implementó sidebar oculta con toggle hamburguesa para docs, y nav inferior para dashboard.
4. **Fuente Inter**: No está en el bundle de Next.js de serie. Se cargaría desde Google Fonts. En producción, se recomienda self-hosted para evitar dependencia externa.

### Mejoras agregadas no previstas

- **Sistema de offline detection** en todas las páginas (no estaba en los mockups).
- **Fetch wrapper con timeout y manejo de errores** robusto.
- **Estados vacíos con acción CTA** en cada página.
- **Animación de scroll indicator** en login (chevron bouncing).
- **Badge "Premium" con gradiente dorado** (supera el diseño mockup que usaba verde sólido).

---

## Conclusiones

### Decisiones UX/UI clave

1. **Dark mode como identidad**: El fondo oscuro no es solo estético — reduce la fatiga visual en sesiones largas de análisis de datos, alinea con la marca Spotify y crea un contraste dramático para los datos (verde sobre negro).
2. **Glassmorphism funcional**: Las tarjetas con `backdrop-filter: blur()` y bordes translúcidos comunican "modernidad" y "profundidad", además de jerarquizar visualmente el contenido.
3. **Consistencia forzada desde el diseño**: Al generar todos los mockups con el mismo `--sref` y la misma paleta, la implementación hereda naturalmente un sistema de diseño unificado sin necesidad de un design system formal.

### Beneficios del diseño

| Beneficio | Impacto |
|---|---|
| **Carga perceptual** | Los skeletons aparecen en <100ms, los datos llegan después — el usuario nunca ve pantalla en blanco |
| **Jerarquía clara** | El layout grid del dashboard guía la mirada: stats overview → charts → ranking lists |
| **Mobile-first** | Todas las páginas son funcionales en 320px, con navegación adaptativa |
| **Tolerancia a fallos** | Offline banner, error states con retry, y empty states guían al usuario en cada estado de la aplicación |
| **Sin dependencias pesadas** | Sin librerías de iconos, sin chart libraries pesadas, sin UI frameworks — sólo TailwindCSS + Framer Motion |

### Enfoque mobile-first

El diseño se construyó desde mobile hacia desktop:

1. **Mobile** (<640px): Una columna, navegación inferior, todo apilado verticalmente.
2. **Tablet** (640–1024px): Grid de 2 columnas, sidebar en docs ocupa media pantalla.
3. **Desktop** (>1024px): Grid completo de 3–4 columnas, sidebar visible permanentemente.

Esta estrategia garantiza que la funcionalidad no se sacrifica en pantallas pequeñas — sólo se reordena.

### Consistencia visual

| Elemento | Login | Dashboard | Profile | ETL | Docs |
|---|---|---|---|---|---|
| Fondo | `#0a0a0a` | `#0a0a0a` | `#0a0a0f` | `#0a0a0f` | `#0a0a0a` |
| Acento | `#1DB954` | `#1DB954` | `#1DB954` | `#1DB954` | `#1DB954` |
| Glass cards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Border radius | 1rem | 1rem | 1rem | 1rem | 1rem |
| Eyebrow pill | ✅ | ✅ | ✅ | ✅ | — |
| Tipografía | Inter | Inter | Inter | Inter | Inter |
| Animación entrada | fade-in | fade-in+slide | fade-in | skeleton | skeleton |
| Offline detection | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error state | inline | — | ✅ | ✅ | ✅ |
| Empty state | — | widget-level | ✅ | ✅ | — |

---

## Archivos de diseño generados

| Vista | Archivo mockup |
|---|---|
| Login | `docs/mockups/01-login.html` |
| Dashboard | `docs/mockups/02-dashboard.html` |
| Profile | `docs/mockups/03-profile.html` |
| ETL Sync | `docs/mockups/04-etl.html` |
| API Docs | `docs/mockups/05-docs.html` |

> **Instrucciones para screenshots**: Abrir cada archivo HTML en un navegador (Chrome/Edge), capturar la ventana completa (o la sección relevante) y reemplazar los placeholders `→ insertar aquí` en las secciones de cada vista arriba.
