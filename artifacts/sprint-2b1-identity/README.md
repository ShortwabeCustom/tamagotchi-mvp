# Evidencias Sprint 2B.1

Código base 7a17d3c → corrección 053e988 → tests c244fde. Informe: ../../docs/SPRINT-2B1-IDENTITY.md.

- before-committed-loss.json: fallo anterior con SQL confirmado ANTES de descartar respuesta/cookie; dos UUID después del retry.
- before-retry.json: reproducción resumida adicional del comportamiento anterior.
- after-http.json: caso corregido, HTTP dev y PostgreSQL real; mismo UUID y conteos 1/1/1.
- after-production-http.json: caso corregido en build local de producción, mismo UUID y conteos 1/1/1, ocho reintentos concurrentes y refresh.
- unit-tests.log: 50 unitarios PASS; incluye transporte mock explícito y timeout de cliente.
- db-tests.log: 9 tests reales PASS, incluyendo ocho primeros guardados concurrentes.
- typescript.log, lint.log, build.log: PASS. TypeScript sin salida indica ejecución correcta (exit code observado 0).
- typescript-preflight.log: chequeo intermedio, no sustituye la validación final.
- production-routes.log: / 200, /preview/miso 404.
- browser-timeout-before-retry.json / browser-timeout-after-retry.json: pausa real de DB causó error HTTP 503, no commit confirmado antes del retry; el reintento creó un solo perfil. No confundir con after-production-http.json.
- confirmed-3d.jpg / return-3d.jpg: interfaz real del guardado y regreso de Elena Lucía, DB local. El regreso se capturó durante la carga del renderer; el saludo HTML ya estaba disponible.
- timeout-input-preserved.jpg: estado recuperable y nombre preservado durante fallo de DB; no demuestra por sí sola un timeout de ocho segundos.

Las tres capturas son nuevas del navegador integrado en Mac, no teléfonos físicos ni referencias artísticas. No se generaron videos ni ZIP. Cookies/credenciales no están incluidas. Los registros de prueba se eliminaron por sus identidades/UUID, después de verificar los resultados.
