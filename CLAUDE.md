# central-life — Notas para Claude

Resumen del proyecto para no tener que re-analizar la estructura en cada sesión.
Actualízalo cuando cambie algo estructural importante (nuevas features, cambio de stack, etc.).

## Qué es

App personal de "gestión de vida" (roadmap de objetivos, salud, finanzas, viajes,
notas/segundo cerebro). Nombre interno del manifest PWA: "My Life NB". Generada
originalmente con **Lovable** (quedan restos: `.lovable/plan.md`, `lovable-tagger`
en devDependencies, el `package.json` se llama `vite_react_shadcn_ts`).

- Repo: https://github.com/nassreddine-0711/central-life
- Carpeta local: `C:\Users\nasse\central-life`
- Owner del proyecto: org.docc@gmail.com

## Stack

- **Build**: Vite 5 + React 18 + TypeScript, plugin `@vitejs/plugin-react-swc`.
- **UI**: shadcn/ui (componentes en `src/components/ui/*`, generados, normalmente
  no se tocan a mano salvo necesidad puntual) + Tailwind CSS + `tailwindcss-animate`
  + `framer-motion` para animaciones.
- **Routing**: `react-router-dom` (rutas en `src/App.tsx`).
- **Estado/datos**: React Context por feature (ver abajo) + `@tanstack/react-query`.
- **Backend**: Supabase (`@supabase/supabase-js`, cliente en
  `src/integrations/supabase/client.ts`, project_id en `supabase/config.toml` =
  `lxjqhkshnxdtxredtpla`). Auth propio vía `AuthContext`.
- **PWA**: `vite-plugin-pwa`, manifest e iconos en `public/`, cache de red para
  Supabase con `NetworkFirst`.
- **Gráficos/3D**: `recharts` (gráficas), `three` + `@react-three/fiber` + `@react-three/drei`
  (usado en `Globe3D.tsx` de Viajes).
- **Tests**: `vitest` + Testing Library (`src/test/`).
- **Lint**: ESLint (`eslint.config.js`).
- **Gestor de paquetes**: hay `bun.lockb` Y `package-lock.json`. El usuario no
  sabe cuál usa (todo generado con IA/Lovable). No hay CI (`.github` no existe)
  que lo aclare. Como no es crítico, usar **npm** por defecto (`npm install` /
  `npm run dev`) salvo que se compruebe que tiene bun instalado — es la opción
  más compatible y no rompe nada si en algún momento se decide fijar una sola.

## Despliegue

- **Vercel** (`vercel.json` con rewrite SPA a `index.html`). Cada push a la rama
  desplegada en Vercel se publica automáticamente → por eso conviene trabajar
  siempre en rama + PR, nunca commitear directo a `main`.
- Build: `npm run build` (o `bun run build`) → Vite genera estático en `dist/`.
- Dev local: `npm run dev` (puerto 8080, host `::`).

## Estructura de carpetas

```
src/
  App.tsx            # rutas + providers anidados (orden importa)
  main.tsx           # entry point
  components/        # layout compartido (AppLayout, AppSidebar, ThemeToggle...)
  components/ui/      # shadcn/ui — generados, no tocar salvo necesidad
  config/nav.ts       # items del menú lateral (título, url, icono) + TARGET_DATE (sin uso, ver abajo)
  pages/              # una página por sección, montadas en App.tsx
  features/           # lógica y componentes de cada módulo, con su propio Context
  hooks/              # hooks genéricos (use-mobile, use-toast, useSupabaseSync)
  integrations/supabase/  # cliente y types de Supabase
  lib/utils.ts        # helper cn() de clases (shadcn)
  test/               # setup y ejemplo de vitest
supabase/config.toml  # solo project_id
.lovable/plan.md       # último plan de refactor generado por Lovable (histórico,
                        # puede no reflejar el estado actual del código)
```

## Secciones / features (nav.ts)

| Título (menú) | Ruta          | Página                  | Feature/Context                          |
|---|---|---|---|
| RoadMap       | `/objetivos`  | `pages/Objetivos.tsx`   | (objetivos + `features/versions`)        |
| Health        | `/salud`      | `pages/Salud.tsx`       | `features/health/HealthContext`          |
| Second Brain  | `/cerebro`    | `pages/Cerebro.tsx`     | `features/cerebro/CerebroContext`        |
| Trips         | `/viajes`     | `pages/Viajes.tsx`      | `features/travel/TravelContext`          |
| Finance       | `/finanzas`   | `pages/Finanzas.tsx`    | `features/finance/FinanceContext`        |

Notas:
- `/objetivos` (Objetivos.tsx, ~65 KB, el archivo más grande del repo) integra
  además un tab de "Evolución Temporal" con `features/versions/VersionsModule.tsx`,
  que compara snapshots guardados en localStorage.
- `/conocimiento` redirige a `/cerebro` (ruta legacy).
- Hay una sección "knowledge" (`features/knowledge/`: Library, Audiovisual,
  SkillTree, LanguageRadar...) que no aparece en el nav.ts actual — puede estar
  en desarrollo, integrada dentro de otra página, o ser código huérfano. Revisar
  si se pregunta por ella.
- Toda la app requiere login (`AuthContext` + Supabase); si no hay `user`, se
  muestra `Login.tsx` en vez de las rutas.
- Providers en `App.tsx` están anidados en este orden: Finance > Health > Travel
  > Knowledge > Audiovisual > Cerebro. Si una feature necesita datos de otra,
  revisar este orden (el que está más afuera está disponible para los de dentro).

## Convenciones observadas

- Nombres de páginas y rutas en español (Objetivos, Salud, Viajes, Finanzas),
  nombres de archivos/componentes en inglés o español mezclado.
- Cada feature grande tiene su propio `*Context.tsx` con estado + persistencia
  (localStorage y/o Supabase vía `useSupabaseSync`).
- Estética oscura/premium (ver comentarios de estilo en `.lovable/plan.md`:
  `bg-gradient-primary`, tracking-widest, etc.) — mantener consistencia visual
  al tocar UI.
- `src/components/ui/*` son componentes shadcn "de librería": para cambios de
  diseño puntuales es mejor no editarlos directamente sino envolver/estilizar
  desde el componente que los usa, salvo que el cambio deba aplicar globalmente.

## Cómo trabajar en este proyecto (flujo con el usuario)

- El usuario clona/tiene el repo en su PC y lo conecta a Claude Desktop; yo edito
  archivos ahí directamente.
- Cambios siempre en una rama nueva, nunca directo a `main` (Vercel despliega
  automáticamente desde la rama de producción).
- El usuario revisa (`git diff`), hace commit y push, y abre/mergea el PR él mismo
  salvo que pida lo contrario.
- Para tareas puntuales ("arregla X", "añade Y"), no hace falta releer todo el
  repo: usar este archivo como mapa y solo leer los archivos concretos afectados.

## Pendiente / cosas a confirmar con el usuario

- Si `bun` o `npm` es el gestor de paquetes real que usa.
- Qué es exactamente `features/knowledge/` y si está en uso.
- `TARGET_DATE` en `nav.ts` tiene un TODO pendiente ("replace with the user's
  actual date").
