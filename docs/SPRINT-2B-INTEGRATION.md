# Sprint 2B — integración local del recorrido real

Fecha: 2026-09-19. Workspace: `/Users/alexisvaldez/Developer/bety-miso-3d`.
Rama: `feat/miso-3d-space`. Base preservada: `d74dfde`.
Código integrado: `b53cf24`. Tests y ejecución local protegida: `e52dbae`.

## Estado real

| Área | Estado | Alcance comprobado |
| --- | --- | --- |
| Integración UI | PASS | Ruta `/`: sobre, carta, reveal, despertar, pregunta, espera, confirmación y companion. |
| Persistencia local real | BLOCKED | Guardado, nombre canónico y refresh pasan con PostgreSQL real; queda el defecto previo de reintento sin cookie descrito abajo. |
| Fallback y accesibilidad | PASS | Continuidad del formulario ante pérdida de contexto, error recuperable, timeout, 2D por defecto y progreso con reduced motion inyectado. Límites de emulación abajo. |
| QA visual del recorrido | PENDING | Capturas reales disponibles; aprobación humana final pendiente. |
| Producción | NO DESPLEGADA | Solo build y servidor de producción locales en loopback. |

No se declara completo el sprint ni resueltos los avisos de seguridad.

## Implementación

`src/app/page.tsx` resuelve la selección en servidor y la identidad como antes. La ruta es dinámica: `PET_RENDERER` se lee en runtime; solo `3d` activa Three, cualquier otro valor o ausencia conserva `2d`. No hay selector visible ni identidad asociada al renderer.

`Experience` conserva un único reducer de producto. La preparación del renderer es independiente. `PetRenderer` mantiene el import dinámico con `ssr:false` dentro de Client Component. Sobre/carta no montan Canvas; no se agregó precarga con loop oculto. El wrapper de import puede aparecer en los scripts iniciales, pero Three y la escena se solicitan al montar el renderer.

El ciclo distingue módulo, recursos y primer frame renderizado mediante `gl.render`, no solo `onCreated`. Tiene un plazo total desde montaje de 6.000 ms, configurable por `PET_RENDERER_TIMEOUT_MS` (100–30.000 ms; inválido vuelve a 6.000). No reinicia el plazo al avanzar de etapa. El primer frame no exige intersección visible. El fallo es persistente durante el recorrido y los callbacks tardíos no restauran 3D.

Durante reveal Miso conserva ojos cerrados; se libera awakening al terminar reveal y quedar listo 3D o fallback. Hay señal de final de animación más salida temporal acotada, con eventos duplicados ignorados por el reducer. El formulario y la conversación permanecen fuera del renderer y no se remontan al cambiar a 2D.

La petición pendiente conserva thinking; happy se produce después de la respuesta exitosa. Se usa el nombre canónico del servidor. El timeout de ocho segundos ahora también cubre la lectura del cuerpo JSON. Se conservan endpoint, transacción, cookie, límite de 60 caracteres, mensajes principales y validación existentes. Al regresar se muestra saludo HTML inmediatamente y acción neutral/idle, sin otro nacimiento. DB indisponible produce un estado recuperable con recarga; no se borra la cookie ni se presenta una visita nueva ficticia.

La composición reserva una caja para escena/fallback y permite scroll. El viewport corto adapta la caja y el tamaño del fallback, sin modificar arte. Se preservaron Stage, geometrías, materiales, carey, escala 1,15, objetos y cámara aprobados. El único cambio en `MisoProceduralModel` coordina sueño y final de awakening.

## Base exclusiva y ejecución

Mac/Darwin, Node 24.14.0, npm 11.9.0. Se reutilizaron Docker Desktop y la imagen `postgres:16-alpine` ya instalados. No se instalaron paquetes ni se cambió el lockfile.

Instancia creada únicamente para estas pruebas:

- Contenedor `bety-sprint2b-878244805cce`, publicado exclusivamente en `127.0.0.1:55432`.
- DB `bety_integration_test`; rol y credenciales nuevos locales.
- Label `com.bety.integration=878244805cce`; comentario de pertenencia `bety-sprint2b:878244805cce`.
- Configuración privada en `~/.local/state/bety-sprint2b/local.json` y `postgres.env`, permisos 600, directorio 700. No se versionan ni se imprimen secretos.
- `scripts/local-integration.mjs` verifica URL loopback, nombre de DB, puerto, label del contenedor, rol SQL y comentario de pertenencia antes de ejecutar.
- Se aplicó solo la migración existente `20260919050000_init_bety_memory`, con `prisma migrate deploy`. Sin `db push`, reset ni migraciones nuevas.
- Test automatizado limpia su propio `visitorHash`; pruebas HTTP y navegador identificaron los UUID creados y eliminaron únicamente esos registros. La base no contiene datos reales.

Desde este clon, con Docker Desktop activo y el contenedor iniciado:

```sh
cd /Users/alexisvaldez/Developer/bety-miso-3d
node scripts/local-integration.mjs verify
PET_RENDERER=3d node scripts/local-integration.mjs dev
```

Abrir `http://127.0.0.1:3000/`. Para volver a 2D, detener esa instancia con Ctrl+C y ejecutar:

```sh
PET_RENDERER=2d node scripts/local-integration.mjs dev
```

Sin `PET_RENDERER` también se usa 2D. Si el contenedor exclusivo está detenido: `docker start bety-sprint2b-878244805cce`. Si falta la configuración privada, el script falla: no toma `.env` de otro equipo ni crea conexiones alternativas. Su preparación no es un instalador portable; esta instancia queda disponible para la revisión en este Mac.

## Validación ejecutada

Sobre el código de `b53cf24` y los tests de `e52dbae`, secuencialmente:

1. `npm run lint` — PASS.
2. `node_modules/.bin/tsc --noEmit` — PASS.
3. `npm test` — PASS, 40 tests en 8 archivos.
4. `node scripts/local-integration.mjs test` — PASS, 1 test con PostgreSQL real: crear, actualizar, recuperar y unicidad de memoria con la misma identidad.
5. Servidor dev detenido; `node scripts/local-integration.mjs build` — PASS.
6. `PET_RENDERER=3d node scripts/local-integration.mjs production` — servidor local 3001: `/` HTTP 200, `/preview/miso` HTTP 404. Recorrido, espera, timeout, reintento y refresh verificados en navegador. Servidor de producción local detenido al terminar.

El log de build enumera `/preview/miso`; su protección se verificó por respuesta HTTP 404, no por ausencia en esa lista.

| Criterio | Evidencia y límite |
| --- | --- |
| A. Visita nueva | Navegador, ruta `/`, sobre → carta → awakening 3D → pregunta. |
| B. Guardado | POST real; thinking y CTA deshabilitado durante espera, happy/confirmación tras éxito; nombre `María José` canónico. |
| C. Error y timeout | DB exclusiva detenida: 503, input `Lucía Elena` conservado y reintento exitoso. DB exclusiva pausada: timeout de 8 s en cliente, `Prueba Local` conservado, sin promesa falsa; unpause y retry real exitoso. Tests de fetch/body bloqueados usan mocks explícitos. |
| D. Regreso | Refresh con nombre real, saludo disponible mientras carga Canvas; sin carta. DB detenida en regreso: estado recuperable; restaurar DB y recargar conserva reconocimiento. |
| E. 3D no disponible | Fallback por pérdida de contexto y por primer frame no señalado; nombre puede guardarse realmente en 2D. |
| F. Contexto durante escritura | Extensión WebGL de pérdida de contexto activada por inyección de desarrollo; `Lucía Elena`, foco en input y ASKING_NAME conservados. |
| G. Carga lenta | Inyección que retiene la señal de primer frame: termina en fallback con plazo configurado 6.000 ms, continúa hasta pregunta. No es una medición de red móvil. Reducer prueba callback tardío tras timeout. |
| H. Reduced motion | Preferencia inyectada en desarrollo: recorrido completo y guardado real de `Sofía Isabel`; renderer reporta reduced-motion=true. No se cambió la preferencia global de macOS. CSS de media query conservado; no equivale a probar el ajuste de un teléfono físico. |
| I. Duplicados/rerenders | Tests puros de eventos repetidos y tardíos; guard de envío existente preservado; HMR durante prueba conservó input. No se declara idempotencia del endpoint para identidad ausente. |
| J. Mobile | 390×844 y 390×500 emulados, ancho de documento 390; CTA observado en viewport corto con bottom≈366 px, sin overflow horizontal. No se usó teclado de teléfono físico. |
| K. Selección | Sin variable: recorrido y guardado 2D, cero Canvas. `PET_RENDERER=3d`: un Canvas. |
| L. Build | Build PASS y recorrido en servidor local de producción; preview 404. |

Inyección reproducible, solo en `NODE_ENV=development` y nunca mediante controles en el producto:

```sh
PET_RENDERER=3d BETY_INTEGRATION_SCENARIO=context node scripts/local-integration.mjs dev
# context: pérdida de contexto a los 12 s de ASKING_NAME; escribir antes.
# Otros valores: timeout (retiene first-frame), import (rechaza import), reduced-motion.
```

Los escenarios `context`, `timeout` y `reduced-motion` se ejecutaron en la ruta real. `import` queda disponible para repetición dirigida; no se atribuye a esta ronda una prueba nueva de cada fallo de inicialización o de hardware sin WebGL. No se simula éxito de persistencia. Las capacidades disponibles no ofrecían grabación de video del recorrido: no se generó clip ni se sustituyó por un video de preview.

Métricas observadas en DOM del renderer real: **37.873 triángulos / 44 draw calls principales**, 60.593 triángulos / 63 calls contando sombras, 24 geometrías, 4 texturas, DPR 1 en la primera ronda y 1,5 en la pestaña final, un Canvas. Se conserva el límite DPR 1–1,5, render demand, pausa por intersección/document.hidden y animación por delta. Sin afirmar FPS ni rendimiento físico. La pausa por ocultamiento se conserva por código; esta ronda no mide consumo energético ni GPU física en background.

## Defecto previo de persistencia pendiente de autorización

Reproducción contra la DB exclusiva y endpoint existente: enviar `Prueba Reintento` sin cookie, descartar la respuesta/cookie como si se hubiera perdido, volver a enviar sin cookie. Ambas respuestas son 200 con `firstMemoryCreated: true`; aparecen **dos perfiles**. Se eliminaron solo los UUID creados en cada ejecución. Evidencia: `artifacts/sprint-2b-integration/retry-check.json`.

La transacción y unicidad por `visitorHash` funcionan para una identidad estable; no resuelven un reintento que aún carece de cookie. Un timeout del cliente tampoco cancela con certeza una transacción en servidor: en la prueba con DB pausada pudo completarse al reanudarla. No se alteró el copy de incertidumbre.

Se solicitó autorización separada para corregir identidad/idempotencia, tal como requiere el alcance. Sin esa autorización no se rediseña el endpoint ni se agrega schema. Propuesta para una tarea autorizada: mantener una identidad o clave de idempotencia estable desde antes del primer POST y probar pérdida de respuesta, timeout y reintentos, con límites y cookies de seguridad revisados. No se promete solucionarlo solo deshabilitando el botón.

## Cuatro entradas altas de auditoría, sin resolver

`npm audit` de esta ronda: cuatro entradas de paquetes, **tres avisos subyacentes** (dos altos y uno moderado), no cuatro vulnerabilidades distintas. Versiones sin modificar.

| Entrada | Inclusión y ámbito real | Condición / remediación propuesta |
| --- | --- | --- |
| `deepmerge-ts` 7.1.5 | Transitiva: prisma → @prisma/config → deepmerge-ts. | Recursión no acotada con grafos de objetos cíclicos al fusionar; corregido en 8.0.0. Coordinar actualización compatible a través de Prisma/config, sin override mayor a ciegas. |
| `@prisma/config` 7.10.0 | Transitiva de prisma; hereda aviso de deepmerge-ts. | Resolver la cadena anterior; no representa otro defecto independiente. |
| `mysql2` 3.15.3 | Transitiva: prisma → mysql2. | Downgrade de autenticación ante servidor/MITM malicioso puede revelar contraseña sin TLS; parche 3.22.0. También DoS por descompresión con `compress:true` y servidor malicioso/MITM, parche 3.23.1. Evaluar versión compatible que cubra ambos. |
| `prisma` 7.10.0 | Directa en devDependencies y peer opcional de @prisma/client de runtime; hereda las cadenas anteriores. | Actualización compatible de Prisma y sus transitivas con validación dedicada. No aplicar la degradación sugerida automáticamente por audit a 6.19.3. |

Los cuatro paquetes tienen `devOptional:true` en el lockfile y **siguen presentes en `npm ls --omit=dev`** por la cadena `@prisma/client → prisma`. No se clasifican como inocuos por aparecer en tooling. La aplicación usa PrismaPg/pg para PostgreSQL, sin conexión mysql2 identificada en el flujo del nombre; esto delimita el camino observado, no elimina el aviso. JSON simple no crea ciclos por sí solo, pero eso tampoco elimina el riesgo de herramientas que fusionan objetos construidos en código.

Fuentes oficiales de los avisos, consultadas en esta ronda:

- [deepmerge-ts: recursión con objetos cíclicos](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
- [mysql2: downgrade de autenticación](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr).
- [mysql2: descompresión no acotada](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

No se ejecutó audit fix, degradación, actualización mayor ni cambio del lockfile. Logs y cadenas completas en la carpeta de evidencia.

## Evidencia y pendientes

Ver `artifacts/sprint-2b-integration/README.md`. Son capturas nuevas de `/`, con nombres sintéticos y DB local real. No son QA de Sprint 2A ni teléfonos físicos. La imagen con fallback recortado se conserva como evidencia del hallazgo previo a la corrección de caja y está identificada como tal.

Pendientes: autorización/corrección del primer reintento sin cookie; cuatro entradas altas; aprobación visual del recorrido; teléfonos físicos y teclado real, preferencia reduced motion del dispositivo, lector de pantalla y mediciones de background. No se modifica arte para suplir estas validaciones. Producción, VPS, main, secretos remotos y despliegue intactos.

## Seguimiento Sprint 2B.1

El bloqueo histórico de reintento sin cookie fue corregido mediante preparación firmada y verificación de identidad antes del guardado. Ver [SPRINT-2B1-IDENTITY.md](SPRINT-2B1-IDENTITY.md) para la reproducción antes/después, concurrencia real, compatibilidad legacy y límites. Esto no modifica los resultados históricos anteriores ni resuelve las cuatro entradas altas o la aprobación visual pendiente.
