# Miso — ajuste focalizado desde mobile

Base de comparación: `6293dac` en `feat/miso-3d-space`. Cambios locales posteriores, sin revertir la iteración de fidelidad.

## Identificación de la captura

El nombre mobile-390x844.jpg aparece en dos versiones:

- `artifacts/sprint-2a-fidelity/before/mobile-390x844.jpg`: QA antiguo del modelo `75a27fb`, preservado por `85f4fd8`.
- `artifacts/sprint-2a-fidelity/after/mobile-390x844.jpg`: modelo de fidelidad `ca0f8ac`, con QA entregado en `6293dac`; era el modelo actual al comenzar este ajuste.

Ambas imágenes se abrieron visualmente. En la versión reciente seguían presentes el tamaño relativo pequeño, el oliva de la base, la lectura de antepatas separadas y el límite crema horizontal. El hocico separado, los ojos pequeños y la cola fina del QA original ya estaban corregidos.

## Comparación equivalente

Los archivos de `before/` son **capturas nuevas del modelo actual antes de editar**, no reutilizaciones del QA antiguo. Los de `after/` muestran este ajuste. Misma cámara tres cuartos, FOV, luces, encuadre y viewport; pose neutral con movimiento reducido. No se agrandó la plataforma ni se acercó la cámara.

| Vista | Antes, 6293dac | Después del ajuste |
| --- | --- | --- |
| Mobile 390×844 | [Antes](before/mobile-390x844.jpg) | [Después](after/mobile-390x844.jpg) |
| Tres cuartos / desktop 1200×900 | [Antes](before/desktop-three-quarter.jpg) | [Después](after/desktop-three-quarter.jpg) |

Vistas adicionales del resultado: [frente](after/front.jpg), [perfil](after/side.jpg).

## Cambios limitados a los cuatro puntos autorizados

1. Escala del grupo de Miso `1 → 1.15`, anclada en el suelo. Cabeza, cuerpo y cola crecen juntos; proporción de ojos respecto a la cara sin cambios. Plataforma, objetos, cámara, iluminación y layout conservados.
2. Parte superior del pecho adelantada; hombro de antepatas ensanchado suavemente y curvado hacia el torso; antepatas más cortas, manteniendo su base a nivel del suelo. La transición de color del hombro se desplazó hacia la unión oculta para evitar dos tapas oscuras que acentuaban la separación. Siguen siendo mallas procedurales locales, no una unión esculpida perfecta.
3. Material de plataforma `#464236 → #302c2a`, carbón cálido. Se conserva geometría, espesor, rugosidad, recepción de sombras y separación respecto al fondo. La luz cálida conservada sigue aportando un matiz cálido al render.
4. Máscara crema con dos elevaciones suaves hacia las mejillas y transición más amplia. No cambia la malla facial, la franja carbón central, los parches naranja, ojos, iris, pupilas, nariz ni expresiones.

## Lo resuelto previamente y conservado

Cabeza ancha, hocico ya integrado en la malla, ojos grandes encajados, párpados independientes, cola gruesa recogida, orejas con volumen y pañuelo envolvente. No se revirtió ninguna de estas mejoras ni se aumentaron los ojos independientemente. Sin pelo, microfibra, objetos, funciones o dependencias nuevas. No se rediseñaron QA, carta, conversación ni persistencia.

## Validación

`npx tsc --noEmit`, `npm test` (35 pruebas / 7 archivos, sin DB) y `npm run lint`: salida 0 tras el último cambio. Logs en `logs/`. Esas comprobaciones corresponden exactamente al código actual: no hubo cambios de código después de su ejecución ni durante este cierre. Se conserva su evidencia sin repetir el QA.

El pase principal mantiene 37.873 triángulos / 44 draw calls; con sombras, 60.593 / 63. No se añadieron geometrías ni materiales por frame. Esto no es una medición de FPS. Browser QA sobre Apple M4, viewports emulados; no teléfono físico.

Las capturas son reales del navegador. La aprobación artística queda pendiente de revisión del usuario. Se conservan los cuatro avisos high y las pruebas de integración con DB pendientes. Sin acceso a VPS/DB, push, merge o despliegue. La referencia original y las evidencias previas no se modifican.


Regresiones verificadas en esta iteración:

- Neutral, frente y perfil: contacto visual con la plataforma, ojos sin agrandamiento independiente, orejas/cola completas.
- [Curious mobile](after/mobile-curious.jpg) y [happy mobile](after/mobile-happy.jpg): inclinación y cierre de ojos conservados, sin recorte de la silueta. Capturas de poses; no representan una revisión exhaustiva de toda la trayectoria animada.
- [Mobile 390×500](after/mobile-390x500.jpg): personaje completo, nombre y CTA visibles, sin overflow horizontal. No simula teclado físico.
- [Fallback 2D](after/fallback-2d.jpg): Canvas desmontado, nombre «Bety local» y Alegría conservados. Pérdida WebGL real: `context-lost`, sin Canvas y con el mismo borrador/fixture; reinicio explícito devuelve `frame`.
- Reduced motion: contador de 8 frames sin avance durante 59,383 segundos; estado `frame` mantenido.
- Pruebas existentes de prioridades de expresión, ejecución única de PetAction, poses reducidas y disposición de recursos: pasan. No cambió la lógica de animación/fallback ni se agregaron tests que duplican valores artísticos.

Evidencia estructurada de regresiones y métricas en `browser-checks.json`. Los avisos intencionales del fixture de pérdida WebGL no se presentan como fallos del modelo. Los cuatro cambios de código se limitan a `MisoProceduralModel.tsx`, `geometry.ts`, `materials.ts` y al color de la base en `Stage.tsx`.

Preview: http://127.0.0.1:3000/preview/miso. Servidor local de desarrollo. Este cierre guarda el ajuste mediante el commit local autorizado `style: refine miso scale posture and stage balance`.

Pausa fuera de vista: `data-active=false`, contador sin avance durante 30.328 s.


## Cierre local y build

- Workspace verificado: `/Users/alexisvaldez/Developer/bety-miso-3d`; rama `feat/miso-3d-space`; HEAD previo al cierre `6293dac03a9b4d2314b6ddce51db5ea7a801aabe`.
- Diff revisado: cuatro archivos de código, 21 inserciones / 8 eliminaciones, correspondientes únicamente a escala, postura, color de plataforma y transición crema. `git diff --check`: sin errores.
- **Build local ejecutado y correcto (salida 0)** con `DATABASE_URL='postgresql://preview:preview@127.0.0.1:1/miso_preview' npm run build`. Configuración ficticia local, ya utilizada en la validación anterior; no hay archivos `.env` en el clon. Sin credenciales, consultas o migraciones de producción.
- Se detuvo el servidor de desarrollo antes del build para ejecutarlo secuencialmente. Compilación, TypeScript del build y prerender terminaron correctamente. Registro conservado en `logs/build.log`, fuera del commit.
- Se compararon hashes de los archivos de código/configuración antes y después del build: sin cambios. No se repitieron capturas, pruebas de navegador ni mediciones.
- Tests previamente ejecutados: **35/35**, 7 archivos, integración DB excluida. `npx tsc --noEmit` y lint previos: salida 0, sobre este mismo código. El build de este cierre es una ejecución nueva, no un resultado heredado.
- Métricas y capturas arriba son las del ajuste focalizado ya revisado: **37.873 triángulos y 44 draw calls principales**, viewports emulados de escritorio y mobile; no teléfonos físicos. Antes/después conserva cámara, luces y encuadre equivalente.
- El commit incluye solo los cuatro archivos de código del ajuste y este informe. Capturas, registros, referencia original y demás archivos ajenos quedan preservados sin incorporarlos al commit. Sin push, merge, cambios en main ni despliegue. Renderer 2D, fallback, PetAction, controles, persistencia y conversación se conservan.

## Pendientes explícitos tras el cierre

- **Aprobación artística final pendiente.** El build no constituye aprobación visual.
- **Cuatro entradas altas de auditoría abiertas:** prisma, @prisma/config, deepmerge-ts y mysql2. No se instalaron dependencias ni se intentó resolverlas en este cierre.
- **Integración con una base de datos de pruebas pendiente.** No se ejecutaron pruebas DB.
- **Validación en teléfonos físicos pendiente.** Los viewports emulados no la sustituyen.
