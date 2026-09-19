# Sprint 2B.1 — identidad antes del primer guardado

Fecha: 2026-09-19. Workspace local `/Users/alexisvaldez/Developer/bety-miso-3d`, rama `feat/miso-3d-space`.
Base preservada `7a17d3c` (incluye `b53cf24` y `e52dbae`). Código: `053e988`. Tests/herramientas: `c244fde`.

| Área | Estado |
| --- | --- |
| Integración UI | PASS |
| Reintento tras respuesta perdida | PASS, misma identidad verificada |
| Persistencia local real | PASS |
| QA visual | PENDING DE APROBACIÓN |
| Producción | NO DESPLEGADA |

## Causa y reproducción antes del cambio

El endpoint anterior generaba un token al recibir un nombre sin cookie, confirmaba la transacción y solo entonces intentaba entregar la identidad mediante Set-Cookie. Perder esa respuesta dejaba al cliente sin vínculo con un perfil que ya existía.

Se reprodujo contra PostgreSQL local: primera respuesta 200, consulta SQL independiente antes del retry encontró `ce2db1b9-4a04-4e8c-828a-bbcb87ac98a6`; tras descartar cuerpo y cookie de esa respuesta, el segundo POST sin cookie creó además `d8222622-8c8e-4557-b490-150a0feefb9e`.

Punto de pérdida simulado: **después de recibir la respuesta completa y verificar el commit por SQL, antes de entregarla al cliente de registro**. No se abortó una petición antes de llegar al servidor. La pérdida es una inyección explícita del cliente de pruebas, no una afirmación de pérdida espontánea de paquetes. Evidencia: `artifacts/sprint-2b1-identity/before-committed-loss.json`. Los dos registros se eliminaron después de demostrar la duplicación, nunca para hacer pasar la prueba.

## Solución y procedencia de la identidad

Rutas:

- `POST /api/identity/prepare`: emite cookie firmada si hace falta; reutiliza la válida existente sin rotarla. No crea UserProfile, Memory ni PetState.
- `POST /api/identity/verify`: exige que la siguiente petición devuelva una identidad válida; responde solo `{ verified: true }` o error recuperable. Un 200 de prepare no basta.
- `POST /api/profile/name`: vuelve a validar la identidad antes de escribir. Ausencia/invalidez devuelve HTTP 409 con `IDENTITY_REQUIRED`; no crea registros ni emite una cookie alternativa.
- `/`: resuelve la cookie firmada o legacy antes de recuperar el nombre server-side.

La nueva cookie `bety_visitor` tiene formato versionado con token aleatorio de 256 bits, fecha de emisión y HMAC-SHA256. La firma usa criptografía nativa, comparación constante y un secreto exclusivo del entorno. Se verifica formato, firma, antigüedad máxima de un año y fecha no futura (tolerancia 60 s). El formato no es una prueba de procedencia por sí solo.

Se mantiene el hash SHA-256 del token aleatorio en PostgreSQL; no se guarda el token ni la firma allí. Ninguno se entrega en JSON, estado React, HTML, URLs, localStorage, sessionStorage o logs. El cliente conoce únicamente el resultado booleano de verificación. La prueba HTTP comprueba que el HTML de regreso no contiene cookie ni token.

Compatibilidad: un token legacy de 43 caracteres solo se acepta si su hash ya corresponde a un perfil persistido. No se invalida ni rota esa cookie. Un valor arbitrario con ese formato, sin perfil, no permite escribir. Las identidades nuevas firmadas **sí son válidas antes de tener perfil** y no se rotan por ese motivo.

Cookie: httpOnly, sameSite=lax, path=/ (necesario para `/` y las rutas API), Max-Age de un año, Secure por defecto. La única excepción es `BETY_LOCAL_HTTP=1` en el runner local, con Host exacto 127.0.0.1 y protocolo HTTP. Se contempla que Next normaliza su nextUrl local a localhost, sin ampliar la excepción a hosts externos. HTTPS sigue usando Secure. Las respuestas de identidad y nombre son `private, no-store`, con Vary: Cookie. Se conservó la comprobación de Origin y se rechaza además Sec-Fetch-Site cross-site.

`BETY_IDENTITY_SECRET` debe ser un secreto aleatorio estable de 32 bytes, codificado en 64 dígitos hexadecimales. Se creó una sola vez en la configuración privada existente `~/.local/state/bety-sprint2b/local.json` (permisos 600), fuera de Git. El runner lo inyecta sin imprimirlo. No se copió ningún secreto de otro entorno. No hay clave predeterminada ni fallback inseguro: sin configuración correcta la preparación falla de forma recuperable. No rotar/borrar ese secreto como parte de un reinicio: cambiarlo requiere una estrategia explícita para las cookies firmadas existentes. No se configuró ningún entorno remoto.

## Coordinación, pérdida de cookies y concurrencia

`createRegistrationSession` existe una vez por Experience y comparte una única promesa en curso. La preparación es lazy al primer envío, no un efecto de montaje: rerenders y Strict Mode no emiten cookies. El nombre permanece en NamePrompt. Internamente se distingue preparing de saving, sin nueva pantalla ni identidad accesible a JS. Miso no celebra en ninguna de esas etapas; happy sigue dependiendo del éxito del endpoint del nombre.

El intercambio completo verificar → preparar si falta → verificar tiene un máximo total de 8 s. El POST del nombre conserva su timeout de 8 s, incluido el cuerpo JSON. Por tanto, en una primera petición lenta puede haber hasta 8 s de preparación y otros 8 s de guardado; el timeout del guardado no se amplió. No hay retries automáticos infinitos: se devuelve el control y se requiere un reintento explícito. Timers, señal Abort y comprobación de cancelación impiden que respuestas tardías de preparación provoquen una escritura.

Después de intentar un POST de nombre, cualquier retry **solo verifica** la identidad existente. Si falta o el endpoint del nombre la rechaza después de verificar, se conserva el input y se detiene la recuperación automática: no se prepara otra identidad ni se reenvía silenciosamente el nombre. Si la respuesta de preparación se pierde, se puede reintentar sin perfil creado. Si la cookie fue aceptada pese a perderse el cuerpo, la verificación posterior permite reutilizarla. Si el navegador rechaza cookies, el chequeo de retorno falla y hay cero escrituras de producto.

No se busca ni fusiona por nombre, IP, user-agent o fingerprint. Dos identidades con el mismo nombre conservan dos perfiles distintos.

La transacción mantiene las tres escrituras y las restricciones existentes:

- UserProfile.visitorHash único.
- Memory(userId, category, key) único.
- PetState.userId único.

Se utiliza aislamiento Serializable y hasta cuatro reintentos adicionales (cinco intentos máximos) únicamente para Prisma P2034, con espera acotada de 10/20/30/40 ms. Otros fallos de DB se propagan; no se consideran duplicados ni se convierten en éxito. La decisión firstMemoryCreated está dentro de esa misma transacción. No se incrementan relación ni recompensas por repetir; el nombre distinto mantiene la actualización existente del mismo perfil. Sin cambios de schema o migraciones.

## Evidencia después del cambio

Prueba HTTP contra **build local de producción**, puerto 3001, y SQL independiente:

| Comprobación | Resultado |
| --- | --- |
| UUID tras primer commit | `507ad974-4ce1-44c8-9ca4-036e154a5a03` |
| UUID tras perder respuesta y reintentar | `507ad974-4ce1-44c8-9ca4-036e154a5a03` |
| UserProfile | 1 |
| Memory identity/displayName | 1 |
| PetState | 1 |
| Nombre canónico | María José |
| firstMemoryCreated en retry | false |
| Ocho reintentos HTTP concurrentes | 8/8 HTTP 200, sin nueva primera memoria |
| Refresh con cookie preparada | Nombre recuperado y saludo de regreso |
| Cookie ausente después de escritura | HTTP 409, sin segundo perfil |
| Preparación | Cero registros de producto |

Evidencia completa sin secretos: `artifacts/sprint-2b1-identity/after-production-http.json`. La ronda dev tiene su propio UUID en `after-http.json`; no se confunden identidades de ejecuciones diferentes.

Además, la integración de Route Handlers con PostgreSQL real prueba **ocho primeros guardados concurrentes**, todos HTTP 200, una sola respuesta firstMemoryCreated=true, un perfil/una memoria/un PetState y relationshipLevel=0. Esto comprueba la carrera del primer insert, además de reintentos sobre un perfil ya existente.

## Validación ejecutada, en orden

1. `npm test` — PASS: 50 tests unitarios, 10 archivos. Dobles de transporte explícitos para cookie rechazada, preparación perdida, respuesta tardía, guardado incierto y pérdida de identidad entre verify y name.
2. `node scripts/local-integration.mjs test` — PASS: 9 tests con PostgreSQL real, 2 archivos ejecutados sin paralelismo entre archivos. Dentro del caso de concurrencia sí se emiten ocho peticiones simultáneas, intencionalmente.
3. `node_modules/.bin/tsc --noEmit` — PASS.
4. `npm run lint` — PASS.
5. Servidor dev propio detenido; `node scripts/local-integration.mjs build` — PASS.
6. Servidor de producción solo local: prueba HTTP de pérdida/retry/refresh PASS; `/` HTTP 200 y `/preview/miso` HTTP 404. Servidor de producción local detenido al finalizar.

Se corrigió únicamente el quoting del glob de exclusión en el script npm test: con dos archivos de integración, el shell expandía `tests/integration/**` y uno se interpretaba como selección de tests unitarios. No se modificaron dependencias ni lockfile.

Cobertura real de integración: preparación sin producto, preparación perdida, cookie rechazada/ausente, primer guardado, commit confirmado seguido de pérdida, retry, concurrencia, recuperación, legacy sin rotación, firma inválida, nombres iguales en identidades separadas. Las pruebas acceden a PostgreSQL real; la suite de handlers controla el transporte de cookies, mientras que el script adicional utiliza HTTP real.

Navegador en `/`:

- 3D: error de verificación con DB exclusiva detenida conserva `Elena Lucía`; restaurar DB permite guardar y refresh reconoce el nombre con cookie firmada.
- DB pausada con identidad ya establecida: thinking durante espera y mensaje recuperable, input `Prueba Timeout Identidad` conservado, retry exitoso. **Esta pausa produjo timeout de adquisición/transacción y HTTP 503 del servidor (~2 s), no prueba un vencimiento de ocho segundos del cliente.** Los ocho segundos exactos y los callbacks tardíos se verifican con tests de transporte controlado. La consulta antes del retry mostró cero perfiles en esta ejecución; no se presenta como el caso de commit confirmado con respuesta perdida.
- Pérdida de contexto WebGL inyectada por el escenario de desarrollo existente: input `Prueba Fallback Identidad` y foco conservados; guardar desde fallback 2D llega a confirmación real.
- Sin PET_RENDERER, con reduced motion inyectado: cero Canvas, renderer 2D y guardado completo de `Prueba Reducida Identidad`. No se modificó la preferencia global de macOS ni se afirma una prueba en teléfono físico.

Todas las pruebas usaron exclusivamente `bety_integration_test` y el contenedor local ya preparado. Se verificaron nombre, host, rol y marcador de pertenencia antes de probar. Se eliminaron únicamente los hashes/UUID creados por cada ejecución, después de las aserciones. No hubo limpieza global ni borrado de duplicados para ocultar el resultado.

## Repetir localmente

Con Docker Desktop y el contenedor exclusivo activos:

```sh
cd /Users/alexisvaldez/Developer/bety-miso-3d
PET_RENDERER=3d node scripts/local-integration.mjs dev
```

Abrir `http://127.0.0.1:3000/`. Para 2D, detener esa instancia y ejecutar `PET_RENDERER=2d node scripts/local-integration.mjs dev`.

En otra terminal, con ese servidor activo:

```sh
node scripts/local-integration.mjs test
BETY_EVIDENCE_FILE=artifacts/sprint-2b1-identity/repeated-http.json node scripts/onboarding-http-check.mjs
```

El script HTTP verifica el destino exclusivo, no imprime cookies y limpia solo sus hashes. Para probar el build: detener dev, ejecutar `node scripts/local-integration.mjs build`, luego `PET_RENDERER=3d node scripts/local-integration.mjs production`; el cliente admite `BETY_TEST_ORIGIN=http://127.0.0.1:3001`. No ejecutar build mientras dev utiliza `.next`.

## Limitaciones y pendientes

- No se garantiza el bootstrap simultáneo de varias pestañas inicialmente sin cookie. Dos respuestas de preparación pueden competir antes de tener identidad compartida. No hay bloqueo entre pestañas; se probó concurrencia con la **misma cookie ya verificada**. No se fusionan identidades resultantes.
- La protección tras escritura incierta vive en el contexto de registro activo. Una recarga completa sin cookie no prueba pertenencia al perfil anterior; no se reenvía automáticamente el nombre ni se promete recuperación de cookies borradas. Cambiar de navegador tampoco equivale a compartir identidad.
- Sin una clave de firma estable no puede prepararse una nueva identidad. Secretos por entorno y eventual rotación requieren gestión explícita; no se desplegó configuración alguna.
- QA visual sigue pendiente de aprobación. Arte, materiales, geometrías, layout y renderer no fueron modificados en este incremento.
- Cuatro entradas altas de auditoría siguen pendientes según Sprint 2B. Sin npm audit fix, actualización, nueva dependencia o modificación de lockfile.
- Durante la reproducción se reutilizó inicialmente el helper previo y se regeneró su archivo auxiliar `artifacts/sprint-2b-integration/browser-records.json`. No se utiliza como prueba histórica de esta corrección. Las capturas, videos, referencias e informes anteriores no se sobrescribieron; el resto de la evidencia nueva se separó en sprint-2b1-identity.
- Sin VPS, PostgreSQL de producción, push, merge, main o despliegue.
