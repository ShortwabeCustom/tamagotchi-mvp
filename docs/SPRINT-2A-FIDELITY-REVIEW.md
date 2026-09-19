# Sprint 2A — ajuste local de fidelidad artística

2026-09-19 · Mac Apple M4 · rama `feat/miso-3d-space`.

**Modelo modificado y evidencia nueva. La fidelidad artística requiere revisión del usuario; no se declara aprobada.**

Esta iteración sucede a `75a27fb` y `85f4fd8`, que se preservan. El informe `SPRINT-2A-LOCAL-REVIEW.md` conserva el QA previo como historia; su nota sobre referencia ausente ya no describe esta iteración.

## Referencia utilizada

Se abrió visualmente `ChatGPT Image 18 sept 2026, 09_47_52 p.m..png`, existente en la raíz del clon. No se movió, sobrescribió ni incorporó al commit. Se priorizó el personaje de cuerpo completo del render principal para identidad y rostro; el turnaround para postura y volumen, y las viñetas para gestos. No se copiaron tipografía ni composición de la lámina.

La lámina no es un plano técnico coherente: la cola cambia de lado aparente entre el retrato principal y algunas viñetas; también varían anchura de cabeza y apertura ocular. El modelo mantiene una sola anatomía y una cola en su lado izquierdo (+X local); no se espeja ni se deforma al cambiar de cámara para imitar esas discrepancias.

## Cinco ajustes implementados

1. **Silueta:** cabeza superelipsoidal más ancha con mejillas, mandíbula y cavidades oculares deformadas en la propia malla. Torso piriforme, grupa redondeada y antepatas continuas, con cuerpo más corto. Conserva grupos y pivotes; no se limita a escalar el modelo anterior.
2. **Rostro y gestos:** ojos mayores, pupilas oscuras redondeadas, iris amarillo verdoso, brillos pequeños; hocico crema en la superficie facial, nariz y boca pequeñas. Párpados hemisféricos rotan dentro de una cavidad elipsoidal sin aplastar el globo ocular. Al cierre completo se oculta el ojo cubierto. Happy mantiene arcos cerrados; awakening tiene prioridad sobre happy y blink; curious inclina la cabeza. El video permitió corregir una intersección intermedia del párpado que las poses estáticas no mostraban.
3. **Detalles:** orejas con dos superficies, concavidad y dorso grueso; cola tubular de radio variable y punta cerrada, más corta y recogida; patas integradas con dedos discretos; pañuelo con espesor, pliegues modelados, collar envolvente y nudo lateral. Sin simulación de tela.
4. **Carey:** máscaras de color deliberadas en coordenadas locales: franja carbón hasta la nariz, naranja alrededor de los ojos, corona oscura, mejillas crema y zonas amplias en flancos, patas y cola. Se eliminó el patrón anterior por vértices y la franja naranja horizontal del lateral de la cabeza. No se usa tiempo ni semilla aleatoria para el color.
5. **Materiales y presentación:** acabado mate/satinado con sheen moderado; pañuelo más mate y ojos con reflejos controlados. Luz cálida de contorno, relleno equilibrado y sombra VSM con filtrado, manteniendo una sola luz con sombra de 1024. Cámara final menos cenital. Escenario y objetos ambientales conservados.

## Evidencia y separación de cámara/modelo

Todo en [artifacts/sprint-2a-fidelity](../artifacts/sprint-2a-fidelity), sin sobrescribir el QA anterior. Las vistas neutrales finales usan reduced motion para fijar la pose y evitar que un parpadeo altere la comparación; el clip muestra el movimiento habilitado.

- `before/`: seis copias exactas verificadas contra `artifacts/sprint-2a/`. Son capturas del QA anterior, **no nuevas**.
- `after/comparison-*-baseline.jpg`: modelo nuevo, neutral, cámara, FOV e intensidades del QA anterior, 1200×900. Sirven para comparar silueta y tamaño aparente. Los materiales son nuevos; no aíslan por completo el efecto del material y el filtrado de sombras.
- `after/front.jpg`, `desktop-three-quarter.jpg`, `side.jpg`: nuevas vistas con presentación final; tres cuartos también muestra la composición desktop completa, 1200×900.
- `after/mobile-390x844.jpg`: nueva composición con viewport mobile emulado.
- `after/curious.jpg`, `happy.jpg`, `fallback-2d.jpg`, `reduced-motion.jpg`: nuevas capturas de estados.
- `after/miso-expressions.webm`: captura original del Canvas, secuencia awakening → idle → curious → happy, aproximadamente 9 segundos, sin audio ni montaje. `miso-expressions.mp4` es una conversión H.264 para reproducción accesible: añade una columna negra (975→976 px) por la restricción de dimensiones pares; no reencuadra ni retoca al personaje.
- `after/clip-check-*.jpg`: fotogramas extraídos del video, **no capturas independientes del navegador**.

El grabador está en la preview de desarrollo, usa MediaRecorder/captureStream, mantiene el Canvas visible y permite descarga local. No sube archivos ni llama a APIs. La grabación no equivale a un benchmark de FPS ni a una validación exhaustiva de todas las transiciones.

## Evaluación por área

| Área | Cambio y evidencia | Pendiente artístico o técnico |
| --- | --- | --- |
| A. Silueta/postura | Cabeza ensanchada, cuerpo sentado y compacto; comparar frente, tres cuartos y perfil baseline | La transición cuello/pecho y la continuidad entre hombros y antepatas aún son más geométricas que el render. Una malla corporal esculpida y retopologizada permitiría una unión más orgánica. |
| B. Rostro/expresiones | Ojos encajados, hocico integrado, curious visible, happy cerrado y video de apertura | Happy aún muestra párpados algo abombados; el reborde orbital y la distribución del iris necesitan ajuste artístico fino o párpados esculpidos/blendshapes. No se promete identidad exacta mediante escalado. |
| C. Detalles | Perfil prueba espesor de oreja; tres cuartos muestra cola y pañuelo | El nudo lateral y los bordes de oreja son simplificados; falta una forma de tela más orgánica y dedos/almohadillas artísticamente terminados. |
| D. Patrón | Franja central, flancos naranja, crema facial y patas diferenciadas en las tres vistas | Las máscaras son deliberadas pero más simétricas y sus límites más regulares que la lámina; una máscara pintada sobre una malla final daría mejor control por zona. |
| E. Materialidad | Mate/satinado y luz de contorno; nueva composición separada de baseline | La piel sigue siendo lisa frente al peluche premium. Haría falta un normal/roughness de microfibra art-directed y ajuste de sheen; no pelo individual ni ruido fuerte. |
| F. Funcionamiento | PetRenderer/PetAction, fixtures, fallback, reduced motion y pausa preservados; tests y registro browser | Integración real 3D/DB, dispositivos físicos y preferencia de SO siguen fuera de esta validación. |

## Cómo editar el patrón

`src/components/pet/three/materials.ts` contiene `coatMaterial(region)` y los bloques `head`, `body`, `leg`, `tail`, `scarf`, `orange`. `vCoatPosition = position` fija el color al espacio local de reposo antes de transformar cada grupo; no depende de la cámara, del tiempo ni de UV. Ejes: +Y arriba, +Z rostro, +X lado izquierdo del personaje.

En `head`, `stripe`/`center` controlan la franja central; `crown` la corona; `islandA/B` los parches de lados/espalda; `muzzle` y `noseStripe` el crema facial y su límite con la nariz. `body.flank/shoulder` controla flancos y hombros; `leg.sock` los extremos oscuros; el umbral Y de `tail` la punta naranja. `scarf.a/b` ubica las dos manchas. Paleta en valores RGB lineales `charcoal`, `ginger`, `cream`. El ruido determinista solo irregulariza bordes y añade variación cromática muy leve; no simula pelaje.

Cambiar estas constantes y revisar frente, ambos lados y espalda antes de aprobar una nueva distribución. Las máscaras de mallas separadas no garantizan continuidad exacta en sus uniones. Para mayor fidelidad, pintar una máscara dedicada sobre UV de una malla artística es el paso concreto, sin reconstruir la aplicación.

## Límites preservados

Sin nuevas dependencias, cambios de persistencia, identidad, conversación, carta, schema o APIs. El producto mantiene 2D por defecto y NAME_PERSISTED sigue determinando happy en su integración. Fixtures y grabador solo se sirven por la ruta de desarrollo. Sin VPS, PostgreSQL, secretos copiados, cambios en main, push, merge ni despliegue.

**Siguen abiertas las cuatro entradas high del informe previo:** prisma, @prisma/config, deepmerge-ts y mysql2. No se ejecutó una reparación ni se declara resuelta ninguna por esta revisión visual. **Pruebas de integración con DB pendientes**, además del E2E real de persistencia y rendimiento en dispositivos físicos.

## Revisión local

```sh
cd /Users/alexisvaldez/Developer/bety-miso-3d
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir http://127.0.0.1:3000/preview/miso. No necesita `.env` ni DATABASE_URL. Ctrl+C detiene el servidor. Usar el selector Presentación para alternar la cámara/luz anterior y la revisión artística; Vista QA para frente/tres cuartos/perfil.

## Métricas y verificación

Medidas reales desde `renderer.info`, neutral, tres cuartos, misma escena y FOV. El callback anterior al primer draw principal separa el pase principal de sombras. DPR observado 1 y 1.5 según viewport; estas cuentas de geometría/draws no son FPS.

| Modelo / presentación | Triángulos principal | Draw calls principal | Triángulos con sombras | Draw calls con sombras |
| --- | ---: | ---: | ---: | ---: |
| QA anterior | 24.889 | 34 | 37.969 | 48 |
| Nuevo, cámara/luz anterior (PCF) | 37.873 | 44 | 60.589 | 60 |
| Nuevo, presentación final (VSM) | 37.873 | 44 | 60.593 | 63 |

Aumento de 12.984 triángulos y 10 draw calls principales: cabeza de mayor resolución, superficies de orejas/pañuelo, párpados independientes y detalles faciales. Sigue bajo los objetivos del handoff de 60.000 triángulos y 80 draw calls **del pase principal**. El total incluyendo sombras supera 60.000 y se publica por separado. VSM añade pasadas de filtrado; no se afirma rendimiento equivalente por mantener el presupuesto geométrico.

23 geometrías en montaje neutral reducido; 24 después de mostrar el arco de ojo cerrado, y 4 texturas internas del renderer, frente a 13 y 3 del QA anterior. Dos reinicios explícitos devolvieron 23 geometrías / 4 texturas y estado frame, sin crecimiento entre ellos. Sin texturas de color externas. GPU reportada: ANGLE Metal Renderer Apple M4. Sin medición de bytes GPU, energía, temperatura o FPS sostenidos; viewports emulados, no teléfonos físicos.

La animación reutiliza geometrías/materiales construidos al montar y modifica transformaciones/visibilidad por frame. `disposeResources` libera una vez cada recurso compartido al desmontar; una prueba verifica geometrías y material. No se presenta esto como un perfilador completo de fugas GPU.

Resultados de navegador registrados en `browser-checks.json`: selector 2D y fallos de importación/assets/renderer/contexto/timeout conservaron «Bety local» y Alegría; Canvas desmontado en fallback. Timeout observado después del plazo, no medición exacta de los 12 segundos. Reduced motion sin avance durante 34,177 s; fuera de vista sin avance durante 10,525 s. La consola de fixtures conserva errores provocados y mensajes de HMR; se entrega aparte una consola de revisión limpia. Persiste la advertencia THREE.Clock de la versión instalada de Fiber.

La comprobación de pausa usa override QA y desplazamiento real. No se vuelve a declarar probada la preferencia de SO ni document.hidden de manera independiente. La inspección de idle/curious/happy/awakening no mostró nuevas piezas separadas evidentes; los pequeños solapes de mallas locales siguen sujetos a revisión artística.

## Validación final de esta versión

- `npm test`: **35/35**, 7 archivos; excluye explícitamente `tests/integration/**`.
- `npx tsc --noEmit`: salida 0.
- `npm run lint`: salida 0.
- `npm run build`: salida 0, compilación y prerender correctos. Únicamente para evaluar la configuración de Prisma se proporcionó la URL ficticia `postgresql://preview:preview@127.0.0.1:1/miso_preview`; sin consultas ni migraciones.
- Build servido temporalmente en 127.0.0.1:3001: `/preview/miso` devuelve **HTTP 404**. Servidor temporal detenido; no es un despliegue.
- Servidor de desarrollo reiniciado en 127.0.0.1:3000 sin variable de DB.
- Sin errores en la consola de la revisión limpia; advertencia de deprecación THREE.Clock conservada. Registros de fallos provocados separados.
- Recursos antes del build: 57% de memoria libre reportada por memory_pressure y 104 GiB de disco disponibles. Build realizado con dev detenido.

Logs completos en `artifacts/sprint-2a-fidelity/logs/`. Archivos de dependencias y áreas de producto fuera del alcance permanecen sin cambios. La referencia original permanece sin seguimiento y excluida de los commits.

## Commits locales

- `ca0f8ac`: geometría, materiales, expresiones, presentación 3D y pruebas.
- `bbb6ae0`: comparación de cámara e intensidades y grabador local de QA.
- La entrega de documentación/evidencias se registra en un commit posterior dedicado.

No push. Los commits `75a27fb` y `85f4fd8` permanecen en la historia.
