# Reestructuración: Eliminar Dashboard e integrar "Versiones" en Legado

## 1. Eliminar la sección Dashboard

- Borrar `src/pages/Index.tsx`.
- En `src/App.tsx`:
  - Quitar el import de `Index`.
  - Cambiar la ruta `/` por `<Navigate to="/objetivos" replace />` para que la app abra directamente en Legado.
- En `src/config/nav.ts`: eliminar la entrada `Dashboard` (`/`) del array `navItems`. El resto de items se mantienen tal cual y el sidebar seguirá funcionando sin cambios.
- Verificar que `Countdown` y `SummaryCard` ya no se usan en ninguna otra parte; si quedan huérfanos, dejarlos (no es lo que pide el usuario tocar).

## 2. Integrar Versiones dentro de Legado mediante pestañas

`src/pages/Objetivos.tsx` se reorganiza para envolver su contenido en un sistema de tabs sin perder ninguna funcionalidad existente:

- Importar `Tabs, TabsList, TabsTrigger, TabsContent` de `@/components/ui/tabs` y `VersionsModule` desde `@/features/versions/VersionsModule`.
- Extraer el JSX actual del `return` principal del componente `Objetivos` (Master Clock + sueños/objetivos/hitos + modal) a un sub-componente local `VisionActualPanel` dentro del mismo archivo, manteniendo intacto todo el estado y handlers actuales (no cambia la lógica del Reloj Maestro, goals, modal, etc.).
- El nuevo `return` de `Objetivos` renderiza:
  - Encabezado breve de la sección (puede ser el mismo título existente o se omite si ya estaba dentro del panel).
  - `<Tabs defaultValue="vision">` con dos triggers minimalistas estilo subrayado:
    - `Visión Actual` (icono `Target`)
    - `Evolución Temporal` (icono `History`)
  - `TabsContent value="vision"` → `<VisionActualPanel />`.
  - `TabsContent value="evolution"` → `<VersionsModule />`.
- Estilo de tabs acorde a la estética premium oscura:
  - `TabsList` transparente (`bg-transparent border-b border-border/60 rounded-none`).
  - `TabsTrigger` con padding holgado, texto en mayúsculas tracking-widest, indicador inferior animado (`data-[state=active]:text-foreground data-[state=active]:after:scale-x-100`, pseudo-borde inferior con `bg-gradient-primary`).
  - Transición de contenido con un `motion.div` envolviendo cada `TabsContent` (`initial opacity 0, y 6 → opacity 1, y 0`, duración 0.25s).
- Conservar la estructura responsiva existente (`mx-auto max-w-7xl ...`).

## 3. Ajustes en `VersionsModule`

- El módulo ya consume snapshots desde localStorage y renderiza la comparación dual (Salud, Viajes, Conocimiento, Finanzas, Legado). No requiere cambios funcionales: al moverse dentro de Legado seguirá tirando de los mismos datos.
- Quitar cualquier margen superior excesivo (`mt-12` que tenía cuando vivía bajo el dashboard) si genera un hueco extraño dentro del `TabsContent`. Se ajusta solo si visualmente sobra.

## 4. Limpieza

- Eliminar el import de `VersionsModule` en cualquier lugar que ya no lo use (sólo estaba en `Index.tsx`, que se borra).
- No tocar `Cerebro`, `Salud`, `Finanzas`, `Viajes`, ni los contextos/snapshots.

## Archivos afectados

- Eliminar: `src/pages/Index.tsx`
- Editar: `src/App.tsx`, `src/config/nav.ts`, `src/pages/Objetivos.tsx`, opcionalmente `src/features/versions/VersionsModule.tsx` (sólo si hay que retocar el margen superior).
