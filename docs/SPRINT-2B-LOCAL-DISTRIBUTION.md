# Sprint 2B — remediación y distribución local

2026-09-19. Workspace `/Users/alexisvaldez/Developer/bety-miso-3d`, Darwin arm64, rama `feat/miso-3d-space`. Base preservada `8ab3718`; commits locales de implementación: **664c448** (dependencias y comprobación específica), **ea4f812** (standalone, construcción, verificación y prueba del paquete). El commit posterior de documentación no cambia runtime ni lockfile. No se tocó arte, conversación, schema, firma ni coordinación de identidad.

| Área | Resultado |
| --- | --- |
| DEPENDENCIAS | **RESUELTAS** para los avisos reportados y el árbol auditado |
| PAQUETE LOCAL | **PASS** |
| COMPROBACIÓN DE SECRETOS | **PASS EN ALCANCE DOCUMENTADO**, no una garantía universal |
| EJECUCIÓN DESDE PAQUETE | **PASS** |
| COMPATIBILIDAD LINUX | **NOT RUN** |
| QA VISUAL | **PENDING DE APROBACIÓN** |
| PRODUCCIÓN | **NO DESPLEGADA** |

## Dependencias: antes, después y compatibilidad

Overrides exactos y acotados, autorizados expresamente para esta ronda:

```json
"overrides": {
  "@prisma/config": { "deepmerge-ts": "8.0.0" },
  "prisma": { "mysql2": "3.23.1" }
}
```

No se añadió mysql2 como dependencia directa. Prisma, Next.js, React y Three no cambiaron de versión. Las consultas al registro solo encontraron `7.10.0` en las líneas patch del padre Prisma y `@prisma/config`; por eso no había un patch compatible del padre que sustituyera estos overrides. Se eligieron las versiones mínimas exactas que cubren los avisos contrastados, sin rangos flotantes, downgrade, `--force` ni `--legacy-peer-deps`.

Cadenas verificadas con npm explain y lockfile:

- `prisma@7.10.0` → `@prisma/config@7.10.0` → `deepmerge-ts`, ahora **8.0.0** (antes 7.1.5).
- `prisma@7.10.0` → `mysql2`, ahora **3.23.1** (antes 3.15.3).
- `@prisma/client@7.10.0` también incorpora el peer opcional Prisma: las cadenas estaban presentes en la auditoría omit=dev, aunque la aplicación usa PostgreSQL/PrismaPg. No se ocultaron mediante cambios de categoría.

`npm ls deepmerge-ts mysql2 --all --json` confirma las resoluciones y no deja otra copia vulnerable de estos paquetes. El diff del lockfile incluye los cambios transitivos exigidos por mysql2 (sql-escaper reemplaza sqlstring/seq-queue) y seis entradas de metadatos de dependencias ya empaquetadas en el optional WASI de Tailwind que npm incorporó al regenerar el lockfile. No hubo actualización de versión de Tailwind ni actualización general del árbol. `npm ci` reprodujo el lockfile tanto en el workspace como desde una carpeta vacía.

| Aviso oficial | Resultado | Comprobación del arreglo |
| --- | --- | --- |
| [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), CVE-2026-40345 | **FIXED**, deepmerge-ts 8.0.0 | La fusión de dos objetos autoreferentes termina y conserva el ciclo; no desborda la pila. |
| [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) | **FIXED**, mysql2 3.23.1 incorpora corrección desde 3.22.0 | Solicitud real de plugin cleartext al módulo instalado: rechazada con `MYSQL_CLEAR_PASSWORD_NOT_ENABLED`, sin escribir credenciales. |
| [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) | **FIXED**, mysql2 3.23.1 | El módulo instalado limita inflate al tamaño declarado; una muestra de 4 KiB con límite de 16 bytes produce `ERR_BUFFER_TOO_LARGE`. |

Fuentes de mantenedores: [deepmerge 8.0.0](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0), [mysql2 3.22.0](https://github.com/sidorares/node-mysql2/releases/tag/v3.22.0), [mysql2 3.23.1](https://github.com/sidorares/node-mysql2/releases/tag/v3.23.1). Los campos de versiones corregidas coinciden con estas releases. Una precisión de implementación: cleartext sigue registrado en mysql2, pero una comprobación previa impide activarlo por defecto; no se confundió registro con ejecución permitida. Para descompresión el arreglo usa el límite de longitud del paquete, no la cifra ilustrativa de 1 GiB del advisory.

Engines revisados: deepmerge-ts requiere Node >=16 y ofrece exports ESM/CJS; mysql2 requiere Node >=8 y conserva exports raíz/promise/package.json. Entorno comprobado: Node **24.14.0**, npm **11.9.0**. Se cargaron los módulos realmente instalados; no se descargó otro Prisma con npx ni se editó node_modules.

### Comportamiento relevante de Prisma

`@prisma/config/dist/index.js` importa `deepmerge` y lo pasa como `merger` a c12. La versión 8 cambia la fusión de valores Map, nombres de tipos y la mutación en deepmergeInto. Este proyecto no utiliza Map, deepmergeInto ni esos tipos en la configuración: usa registros con rutas y URL.

`scripts/check-prisma-overrides.mjs` comprueba la configuración real con `loadConfigFromFile`, las rutas resueltas de schema/migrations, la URL de prueba, fusión de registros anidados y conservación de entradas. También ejercita los arreglos de seguridad anteriores sin conectar con un servidor MySQL. Esto no demuestra compatibilidad de toda función MySQL o configuraciones arbitrarias de Prisma; sí cubre el uso concreto del proyecto.

Se ejecutaron con el Prisma instalado: **validate**, **generate**, carga de `prisma.config.ts` y **migrate status** contra PostgreSQL LOCAL verificado: una migración existente, esquema actualizado. No se creó/aplicó migración ni se hizo reset.

### Auditorías

Antes: evidencia conservada de `artifacts/sprint-2b-release/`, 2026-09-19T15:01:43Z, npm 11.9.0, lock SHA-256 `c42373cc53f1f3d6b4b4a6457ba838a3d142a4b26b4150e49382c576f3892bc8`. Ambos comandos exit **1**, cuatro entradas high de paquetes que agrupaban tres avisos (dos high y uno moderate). Es evidencia anterior del mismo lock inicial, no una ejecución nueva atribuida a esta ronda.

Después: 2026-09-19T15:39:23Z, npm 11.9.0, lock SHA-256 **3aa1709355b8e122d454dc71ca20e0ab7a290030de6bf47ff31204038ed07e59**. `npm audit --json` y `npm audit --omit=dev --json`: ambos exit **0**, **0 vulnerabilidades**, sin exclusiones especiales. Avisos restantes en estas auditorías: **ninguno**. No implica ausencia de vulnerabilidades desconocidas.

## Delimitación privada del hallazgo de caché

Se buscó el **valor real** de `BETY_IDENTITY_SECRET`, sin imprimirlo ni confundirlo con el nombre de la variable:

| Categoría | Alcance revisado | Resultado |
| --- | --- | --- |
| Caché dev original | `.next/dev/cache` | Presente en `turbopack/v16.3.5-ca2c75eb/00000077.sst` |
| Caché build original | `.next/cache` | Presente en `turbopack/v16.3.5-ca2c75eb/00000042.sst` y `00000050.sst` |
| Ejecutables servidor originales | `.next/server` | Ausente |
| Recursos públicos | `.next/static`, `public` | Ausente |
| Evidencias locales | `artifacts` | Ausente |
| Git | Objetos alcanzables de todos los refs locales | Ausente |
| Paquete conocido de revisión | `/Users/alexisvaldez/Downloads/miso-fidelity-review-6293dac.zip`, 25 miembros descomprimidos | Ausente |
| Build limpio y distribución nuevos | Caché limpia, standalone, estáticos, archivo final y extracción | Ausente en el alcance del verificador |

Inventario limitado al proyecto y al patrón conocido de ZIP de revisión en Downloads; no se exploró indiscriminadamente el Mac. No se puede establecer con esta inspección qué copias desconocidas existen o qué se compartió fuera de estos archivos. **No se detectó exposición en Git, recursos públicos ni en el ZIP conocido.** No se presume filtración pública ni se rotó la clave estable.

Las dos carpetas de caché originales tenían permisos 755; se restringieron a **700** para limitar acceso local. Sus ficheros y evidencias se conservaron, no se borraron para aparentar ausencia. No se afirma que esas cachés dejen de contener la clave: quedan fuera del flujo de distribución. El secreto y la configuración privada existente permanecen fuera de Git y del paquete.

## Construcción limpia y contenido permitido

`next.config.ts` habilita `output: "standalone"`, siguiendo la documentación instalada de Next 16.3.5. `scripts/local-distribution.py build <carpeta-nueva>`:

1. Crea carpeta y HOME nuevos, fuera del workspace.
2. Copia únicamente fuentes versionadas `src/` (sin tests), schema/migraciones `prisma/`, cinco SVG públicos revisados y archivos raíz explícitos de package/lock/configuración.
3. No copia `.env`, `.npmrc`, Git, referencias, QA, node_modules ni ninguna `.next` del workspace.
4. Ejecuta `npm ci` con postinstall/generate, Prisma validate y build mediante un entorno de variables permitido explícitamente. Configuración de build: URL **ficticia**, loopback puerto 1; **sin BETY_IDENTITY_SECRET** y sin credenciales reales. Las variables privadas del proceso padre no se heredan.
5. Registra commit, hashes de entradas y lock, Node, SO y arquitectura. La clave real solo se inyecta después al proceso servidor.

El build definitivo se hizo desde `ea4f812`, con fuentes versionadas sin modificaciones. No se movió, sobrescribió ni borró ningún `.env` principal. La firma sigue evaluándose server-side en runtime: sin clave, preparar identidad devuelve 503 y no emite cookie. No se cambió la firma ni se añadió un valor fijo o NEXT_PUBLIC.

El paquete admite solo:

- `server.js`, `package.json` y runtime de dependencias trazadas en `node_modules/`.
- Salida necesaria de servidor en `.next/` y sus recursos `.next/static/`.
- Cinco SVG revisados: file, globe, next, vercel y window. Miso es procedural: geometría/materiales y escena se distribuyen en los chunks, no hay GLB externo faltante.
- `distribution-manifest.json`: metadatos de versión/runtime y hash, tamaño y modo de cada archivo; sin valores privados.

El verificador inspecciona el standalone trazado **antes** de empaquetarlo: un archivo privado inesperado no se omite silenciosamente. Los alias internos de Next se comprueban contra la raíz trazada y se materializan como archivos; un enlace externo o cíclico falla. El archivo final no contiene symlinks.

Se excluyen/rechazan `.next/cache`, `.next/dev`, SST de Turbopack, `.env*`, `.npmrc`, `.git`, claves por extensión, logs, evidencias, referencias, archivos ajenos a la lista y archivos comprimidos anidados. No se usa `.gitignore` como garantía. No se elimina una dependencia necesaria para pasar el escáner: el WASM de Prisma se conserva. Se afinó el patrón AWS con límites de token porque una cadena dentro de su representación base64 coincidía como subcadena; no había coincidencia de valores conocidos.

## Verificación y pruebas negativas

El verificador enumera los **archivos realmente incluidos** tanto en la carpeta como en el TAR.GZ descomprimido y compara hashes/modos/tamaños con el manifiesto. Inspecciona bytes de todos los archivos, incluidos JS, mapas, JSON, WASM y binarios nativos. Busca valores privados conocidos de la configuración local y variables sensibles de `.env*` sin copiarlos al paquete; comprueba representaciones UTF-8, UTF-16LE, base64 y URL encoding, además de patrones de claves privadas, access keys AWS y npm tokens.

Falla ante coincidencias, entradas ilegibles/especiales, enlaces en el paquete, rutas absolutas/traversal, duplicados, archivos fuera de lista o límites excedidos. Límites explícitos: **128 MiB por archivo y 1 GiB total**; no hace promesas sobre secretos desconocidos, cifrado o codificaciones arbitrarias. No es un detector universal de secretos ni un antivirus.

Pruebas: **7 tests** del verificador, incluidas rutas anidadas, marcador en binario, enlace externo, traversal en archivo, alteración del manifiesto y límite de lectura. Prueba adicional sobre una **copia temporal del paquete real**: añadir `.env.local` provoca rechazo; insertar marcador desechable en `.node` provoca rechazo sin imprimirlo. El archivo original conserva su SHA y vuelve a verificar PASS. No se contaminó el paquete final.

## Paquete definitivo y ejecución independiente

Archivo local:

`/Users/alexisvaldez/.local/state/bety-distribution/miso-local-ea4f812-darwin-arm64.tar.gz`

- **19.478.558 bytes** comprimidos; **1.420 archivos**; 57.950.287 bytes inspeccionados descomprimidos.
- SHA-256: **1fb2efa72b26a590399b3e9fd9f09f7653775fd06f629d1316a66ef6e5c4f505**.
- Manifiesto: commit **ea4f8122ac5ba39001916d1e56cfeee9c49397ac**, Node 24.14.0, Darwin arm64, lock hash anterior y hashes por archivo.
- Inventario externo completo: mismo nombre seguido de `.verification.json`.
- Extracción limpia: `/Users/alexisvaldez/.local/state/bety-distribution/release-20260919-094739-runtime`.

El servidor se lanzó desde esa extracción con `node server.js`, CWD y HOME dentro de ella, NODE_PATH ausente y dependencias propias. No usa el node_modules, .env o caché del workspace. La configuración PostgreSQL LOCAL y la clave estable se inyectan exclusivamente en el entorno del proceso; el ejecutable de pruebas usa una conexión SQL independiente para verificar resultados, no para proporcionar módulos al servidor.

`scripts/check-packaged-runtime.mjs` comprueba:

- `/` 200 y diez recursos CSS/JS 200.
- Identidad prepare/verify 200, cookie HttpOnly, respuesta privada.
- Persistencia real de nombre sintético y reconocimiento SSR.
- Reinicio del proceso con la misma clave: conserva UUID **43844729-a6a5-4740-988a-b393f73c9b2a**; reintento no duplica.
- Arranque sin clave: prepare 503, sin Set-Cookie.
- `/preview/miso`, preview de carrera y API QA: 404.

Browser integrado Chromium 153: ruta real del paquete, carta/reveal, **un Canvas y stage=frame**. Con el timeout runtime existente de 100 ms se ejercitó el fallback real: Miso 2D, cero Canvas y formulario disponible. No se activaron controles de QA en producción ni se añadió un escenario de producto. No hubo nuevo modelado ni capturas masivas. Los registros DOM están en `package-browser-3d.json` y `package-browser-fallback.json`.

El auxiliar verifica primero el contenedor/base/rol/marcador local existente. Cada prueba elimina solo su propio hash de visitante. No hay limpieza global ni datos reales en el paquete. Servidores, instalación, build y pruebas se ejecutaron secuencialmente; no se sobrescribió la caché del servidor principal.

## Validación y uso local

| Comprobación | Resultado |
| --- | --- |
| npm ci workspace; npm ci aislado desde lock | PASS; en carpeta limpia se ejecuta también postinstall |
| Compatibilidad dirigida de overrides | PASS |
| Prisma config/validate/generate | PASS |
| Prisma migrate status local | PASS, esquema actualizado, sin ejecutar migraciones |
| Tests unitarios | PASS, 52 / 11 archivos |
| PostgreSQL local | PASS, 10 / 2 archivos |
| Tests del verificador | PASS, 7 |
| TypeScript | PASS |
| Lint | PASS |
| Build aislado sin secreto | PASS |
| Audit completo / omit=dev | PASS, ambos exit 0, cero avisos |
| Paquete final y extracción | PASS |
| HTTP, SQL y reinicio desde paquete | PASS |
| 3D y fallback en Browser | PASS en Chromium probado |

Evidencia de esta ronda: `artifacts/sprint-2b-distribution/`. Los logs de la construcción aislada están junto a su carpeta (`release-20260919-094739-install.log`, `-validate.log`, `-build.log`); no se incluyen en la distribución.

Comandos reutilizables desde el workspace, siempre con destinos nuevos:

```sh
python3 scripts/local-distribution.py build /ruta/local/nueva
python3 scripts/local-distribution.py package /ruta/local/nueva --output /ruta/local/paquete-nuevo.tar.gz
python3 scripts/local-distribution.py verify /ruta/local/paquete-nuevo.tar.gz --output /ruta/local/inventario.json
python3 scripts/local-distribution.py extract /ruta/local/paquete-nuevo.tar.gz --output /ruta/local/extraccion-nueva
node scripts/check-packaged-runtime.mjs /ruta/local/extraccion-nueva
# Inspección manual local con la configuración privada de pruebas existente:
node scripts/check-packaged-runtime.mjs /ruta/local/extraccion-nueva serve
```

El verificador local requiere la configuración privada existente para comprobar sus valores conocidos; nunca la instala en la carpeta de build o runtime. Para la distribución se debe usar este constructor aislado: `npm run build` ejecutado manualmente en un workspace con variables o .env privados no ofrece esa separación.

## Límites y pendientes

Este TAR.GZ es evidencia **macOS arm64**, no un artefacto de Linux. Destino futuro reportado: **Linux x86_64**, pendiente de comprobar al preparar despliegue. No copiar node_modules ni `.next` del Mac al VPS ni compilar allí con memoria limitada. La futura construcción Linux requiere otro entorno limpio compatible; no se instaló infraestructura ni se creó GitHub Actions.

Compatibilidad MySQL completa, otros Node/OS, otros navegadores y teléfonos físicos no se probaron. No se acepta riesgo residual en nombre del usuario. QA visual sigue pendiente y ningún PASS técnico equivale a aprobación artística. No se accedió al VPS ni se modificaron PM2, Nginx, Certbot, main o producción. No hubo push, merge ni despliegue. Referencias y evidencias sin seguimiento se preservaron; secretos y paquetes generados no se versionaron.
