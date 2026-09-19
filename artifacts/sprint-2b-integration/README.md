# Evidencias — Sprint 2B

Capturas NUEVAS de la ruta real `/`, navegador integrado en este Mac. No son imágenes de referencia ni QA anterior. Nombres sintéticos; persistencia en PostgreSQL local exclusivo, nunca simulada en la aplicación.

Código: base d74dfde → integración b53cf24 → tests e52dbae. Las capturas iniciales se tomaron durante ese diff; la corrección posterior afecta solo el encaje del fallback. Las capturas final-* corresponden al código ya confirmado. Informe: ../../docs/SPRINT-2B-INTEGRATION.md.

Viewports emulados, no dispositivos físicos. Dimensiones de archivo verificadas con sips; las capturas desktop de producción están limitadas a 1250×720 por la herramienta (no prueban un viewport móvil ni un dispositivo físico). No hay clip disponible: no se reutiliza video del estudio.

| Archivo | Píxeles reales | Contexto |
| --- | --- | --- |
| [awakening-desktop.jpg](awakening-desktop.jpg) | 1200×900 | 3D durante PET_AWAKENING, ojos cerrados. |
| [confirmed-mobile.jpg](confirmed-mobile.jpg) | 390×844 | Happy/confirmación de María José tras POST real. |
| [default-2d-question.jpg](default-2d-question.jpg) | 390×844 | Sin PET_RENDERER: pregunta 2D y cero Canvas. |
| [error-fallback-mobile-390x500.jpg](error-fallback-mobile-390x500.jpg) | 390×500 | RESULTADO CORREGIDO: fallback íntegro, error 503 real, Lucía Elena e input/foco conservados. Badge de error de Next dev esperado. |
| [fallback-confirmed.jpg](fallback-confirmed.jpg) | 390×500 | Reintento real exitoso desde fallback 2D. |
| [final-question-390x500.jpg](final-question-390x500.jpg) | 390×500 | Código final e52dbae, 3D normal; viewport y documento 390 px, CTA dentro de 500 px. |
| [final-question-390x844.jpg](final-question-390x844.jpg) | 390×844 | Código final e52dbae, 3D normal sin inyección; viewport emulado 390×844. |
| [final-question-desktop-cropped.jpg](final-question-desktop-cropped.jpg) | 1250×720 | Código final e52dbae: viewport DOM 1280×720, captura limitada por herramienta a 1250×720; borde derecho recortado. No usar como composición completa. |
| [letter-desktop.jpg](letter-desktop.jpg) | 1200×900 | Carta, 2D HTML sin Canvas; antes de guardar. |
| [memory-unavailable.jpg](memory-unavailable.jpg) | 390×844 | DB local detenida: estado recuperable, misma cookie. |
| [pending-desktop.jpg](pending-desktop.jpg) | 1250×720 | Build local: PostgreSQL exclusivo pausado, thinking y CTA deshabilitado, sin confirmación. |
| [production-confirmed.jpg](production-confirmed.jpg) | 1250×720 | Build local: confirmación real de Prueba Local tras reintento. |
| [production-question-desktop.jpg](production-question-desktop.jpg) | 1250×720 | Pregunta 3D del build local, ruta / en puerto 3001. |
| [production-return.jpg](production-return.jpg) | 1250×720 | Build local: saludo de regreso mientras carga renderer. |
| [question-desktop.jpg](question-desktop.jpg) | 1200×900 | Pregunta con escena 3D, primera visita. |
| [question-mobile-390x500.jpg](question-mobile-390x500.jpg) | 390×500 | HALLAZGO ANTERIOR: fallback recortado tras pérdida de contexto; conservar como evidencia del defecto de caja ya corregido, no como resultado final. |
| [question-mobile-390x844.jpg](question-mobile-390x844.jpg) | 390×844 | Pregunta 3D con input visible. |
| [reduced-companion.jpg](reduced-companion.jpg) | 390×500 | Recorrido reducido completado con guardado real de Sofía Isabel. |
| [reduced-question-390x500.jpg](reduced-question-390x500.jpg) | 390×500 | Pregunta 3D con reduced motion inyectado para test, input visible. |
| [return-mobile-ready.jpg](return-mobile-ready.jpg) | 390×844 | Regreso con 3D listo y nombre recuperado. |
| [return-mobile.jpg](return-mobile.jpg) | 390×844 | Saludo server-side inmediato durante carga de 3D. |
| [timeout-fallback-mobile.jpg](timeout-fallback-mobile.jpg) | 390×500 | Inyección explícita: first-frame retenido; timeout del renderer conduce a pregunta 2D. |
| [timeout-name-desktop.jpg](timeout-name-desktop.jpg) | 1250×720 | Timeout real con DB exclusiva pausada: sin confirmación, input conservado. |

Total: 23 capturas JPG, 0 videos.

## Logs y pruebas

- lint.log, typescript.log, unit-tests.log, db-tests.log, build.log: validación secuencial PASS (40 unitarios + 1 integración real). TypeScript sin salida es normal; exit code observado 0.
- production-routes.log: / 200, /preview/miso 404.
- npm-audit.json, dependency-chains.txt, runtime-dependency-chains.txt: cuatro entradas altas aún pendientes.
- retry-check.json: reproducción HTTP real de dos perfiles cuando el primer POST y el reintento carecen de cookie; no es un mock de UI.
- browser-records.json: UUID sintéticos identificados para limpieza del último recorrido; esos registros fueron eliminados. No contiene cookies ni credenciales.

Los escenarios de carga, contexto y reduced motion son inyecciones de desarrollo documentadas, no fallos espontáneos de hardware ni pruebas físicas. El endpoint usa DB real en todos los guardados de estas capturas.
