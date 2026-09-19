# Sprint 2B — cierre técnico local

Fecha: 2026-09-19. Workspace `/Users/alexisvaldez/Developer/bety-miso-3d`, macOS (Darwin), sin variables de sesión SSH. Rama `feat/miso-3d-space`. Base `b8c520db5ee3b1ad92ab8fa945d2a9e3023c672c`; se preservan `053e988`, `c244fde` y `b8c520d`. Código validado y guardado en `8a30205` (`fix: coordinate initial registration across browser tabs`). El commit posterior de este documento no cambia código ni dependencias.

**No se autoriza ni se declara lista una publicación en producción.** La corrección local está validada; dependencias, aprobación visual y dispositivos físicos siguen pendientes. No hubo acceso al VPS, migración, push, merge, modificación de main, diseño, renderer, conversación ni persistencia de producción.

## Estados separados

| Área | Estado | Alcance |
| --- | --- | --- |
| REINTENTO TRAS RESPUESTA PERDIDA | PASS | Nueva ejecución HTTP contra build local y consultas PostgreSQL independientes; mismo UUID, un perfil, una memoria y un pet. |
| DOS PESTAÑAS | PASS EN ENTORNOS PROBADOS | Chromium 153, mismo contexto y origen localhost, orden controlado descrito abajo. |
| DEPENDENCIAS | REQUIEREN DECISIÓN | Tres avisos agrupados; cuatro entradas high de paquetes. Overrides propuestos, no autorizados ni aplicados. |
| CONFIGURACIÓN DE IDENTIDAD | PASS | Firma, ausencia de clave, manipulación, origen, legacy y reinicio comprobados. Hallazgo de caché local explícito abajo; no se afirma ausencia de secretos en toda `.next`. |
| QA VISUAL | PENDING DE APROBACIÓN | Dos capturas nuevas de `/`, no de preview. |
| DISPOSITIVOS FÍSICOS | NOT RUN | Viewport emulado; no pruebas en teléfonos físicos. |
| PRODUCCIÓN | NO DESPLEGADA | Solo servidor de producción local en loopback para validar build. |

## Dependencias: auditoría real y cadenas

Auditorías ejecutadas el **2026-09-19T15:01:43.744371+00:00**, npm **11.9.0**, Node **24.14.0**, sobre `b8c520d`. SHA-256 de `package-lock.json`: `c42373cc53f1f3d6b4b4a6457ba838a3d142a4b26b4150e49382c576f3892bc8`. `package.json` y lockfile no cambiaron durante este cierre, por lo que este resultado también corresponde al árbol final.

| Comando | Exit code | Resultado |
| --- | --- | --- |
| `npm audit --json` | 1 | Ejecutado; reporta vulnerabilidades. |
| `npm audit --omit=dev --json` | 1 | Ejecutado; mismas cuatro entradas high. |

Las cuatro entradas son `deepmerge-ts`, `mysql2`, `@prisma/config` y `prisma`. No son cuatro avisos independientes: los dos últimos heredan los avisos de los primeros. `mysql2` agrupa un aviso high y otro moderate, por lo que npm muestra esa entrada como high.

Cadenas conservadas en `artifacts/sprint-2b-release/dependency-explanations.json`:

- Dependencia directa de desarrollo `prisma@7.10.0` → `@prisma/config@7.10.0` → `deepmerge-ts@7.1.5`.
- Dependencia directa de desarrollo `prisma@7.10.0` → `mysql2@3.15.3` (versión fijada por Prisma).
- Dependencia directa runtime `@prisma/client@7.10.0` → peer opcional `prisma@7.10.0` → ambas cadenas anteriores. El árbol instalado conserva estos paquetes con `--omit=dev`; no se descartan por llamarlos tooling.

### GHSA-ggr8-5vv4-36mx / CVE-2026-40345 — MITIGATION PROPOSED

`deepmerge-ts@7.1.5`, high, versiones afectadas `<8.0.0`; corregido en **8.0.0**. Agotamiento de pila al fusionar grafos de objetos recursivos/cíclicos. JSON plano no crea por sí solo referencias cíclicas, pero objetos JavaScript construidos en un proceso sí pueden hacerlo.

Aplicación observada: `@prisma/config` lo carga para configuración (desarrollo/build); permanece además en el árbol instalado runtime por el peer de Prisma. `prisma.config.ts` usa configuración estática y `DATABASE_URL`, no grafos externos proporcionados por usuarios; no hay imports de deepmerge en la aplicación. Esto reduce la exposición del recorrido observado, **no elimina la vulnerabilidad del paquete** ni permite declarar todo el proyecto NOT AFFECTED.

Remediación propuesta: override acotado `@prisma/config → deepmerge-ts@8.0.0`, que es major y necesita autorización y comprobación de la API consumida por Prisma. [Aviso oficial](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).

### GHSA-3f6p-5ww8-9rcr — MITIGATION PROPOSED

`mysql2@3.15.3`, high, afectado `<3.22.0`; corregido en **3.22.0**. Un servidor MySQL malicioso o un intermediario en conexión sin TLS puede solicitar cambio a `mysql_clear_password` y obtener credenciales en claro.

Aplicación observada: Prisma incorpora mysql2 para sus capacidades de tooling; también está presente en el árbol runtime instalado. La aplicación usa `PrismaPg`/`pg` y PostgreSQL, sin imports ni conexiones MySQL en el recorrido revisado. La condición de explotación no se ejercita en estas pruebas; el paquete continúa afectado y un futuro cambio de conector cambiaría la exposición.

Remediación propuesta: override `prisma → mysql2@3.23.1` para cubrir también el siguiente aviso; es minor respecto a 3.15.3, requiere autorización y validación. [Aviso oficial](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr).

### GHSA-rgwj-5xj2-c3m3 — MITIGATION PROPOSED

`mysql2@3.15.3`, moderate, afectado `<=3.23.0`; corregido en **3.23.1**. Descompresión zlib no acotada con protocolo MySQL comprimido (`compress: true`) frente a servidor malicioso o intermediario en transporte no protegido: consumo de memoria/DoS.

Mismas cadenas y categorías anteriores. El proyecto observado no conecta con mysql2 ni activa ese protocolo, pero no se elimina ni se reclasifica artificialmente el paquete. Remediación propuesta: el mismo override a 3.23.1. [Aviso oficial](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

### Decisión pendiente

La consulta al registro no encontró otro patch `prisma@7.10.x`; Prisma fija mysql2 3.15.3 y las correcciones necesarias no son patch de esas transitivas. npm sugiere también un downgrade a Prisma 6.19.3; no se aplicó ni se propone como actualización automática.

Propuesta concreta presentada para autorización, **no aplicada**:

```json
"overrides": {
  "prisma": { "mysql2": "3.23.1" },
  "@prisma/config": { "deepmerge-ts": "8.0.0" }
}
```

Después de autorización: comprobar compatibilidad de API, peers, generación/validación Prisma sin migraciones, diff limitado del lockfile, auditorías completas y runtime y regresiones de identidad/DB/build. No se promete que el override sea compatible antes de comprobarlo. Alternativa: esperar corrección upstream compatible. No se ejecutó `audit fix`, actualización general, instalación, override, downgrade ni cambio de categorías/umbrales. No se acepta riesgo de producción en nombre del usuario. Las tres mitigaciones propuestas siguen pendientes y no equivalen a FIXED.

## Dos pestañas: reproducción y corrección

Navegador realmente utilizado: Browser integrado de Codex, Chromium **153.0.0.0** en este Mac. User-agent reporta `Macintosh; Intel Mac OS X 10_15_7`. Dos páginas creadas con el mismo contexto y origen `http://localhost:3000`. Antes de cada escenario, el servidor verificó ausencia de identidad; no se inspeccionaron ni imprimieron cookies desde JavaScript.

El auxiliar opt-in `/preview/identity-race` llama a los handlers reales. Para controlar la carrera, el servidor construye una respuesta real de preparación con Set-Cookie y retiene **la respuesta HTTP**, no solo el consumo de JSON en el cliente. La identidad nunca se entrega al JavaScript del navegador: solo estados booleanos y UUID de perfiles sintéticos. Esto se usa porque la herramienta de navegador disponible no expone interceptación de red. Es una prueba manual controlada en navegador; los tests unitarios de locks son dobles y no se presentan como otra prueba real de dos pestañas.

**Antes:** B prepara con respuesta retenida; A prepara y guarda mientras B está pendiente. A crea `bf9faa6f-ea7f-41d4-ac10-657147330297`. Se libera B: la cookie compartida cambia y el perfil activo queda vacío aunque el de A sigue en SQL. Al refrescar ambas páginas vuelve la carta; guardar B crea `494d1cf4-b77a-4acb-aa97-f7d062fb34cb`. Dos perfiles y pérdida de reconocimiento reproducidos. Evidencia: `two-tabs-before.json`.

**Después:** Web Locks, nombre fijo por origen `bety:visitor-registration:v1`, abarca verificación → preparación → verificación → persistencia. `ifAvailable: true` detiene la segunda operación antes de sus peticiones, muestra error recuperable y no encola un guardado automático. A retiene preparación; B intenta y se detiene; solo una preparación y cero perfiles mientras A está pendiente. Se libera A y guarda; B reintenta explícitamente con la cookie compartida. Queda un solo UUID `4081c2c5-7625-4da3-9142-16dfb4ff575a`. Ambas páginas refrescadas reconocen el mismo perfil. Evidencia: `two-tabs-after.json`.

Sin Web Locks: una identidad ya verificada puede guardar/reintentar; la creación de una identidad nueva se detiene con un mensaje de navegador incompatible. Prueba unitaria nueva para ambas ramas. No se expone token, no hay mutex inseguro de localStorage ni fusión por nombre/IP/user-agent. Se conserva la protección que impide preparar otra identidad tras un guardado incierto.

Límites: solo Chromium y el orden descrito; no prueba universal de navegadores, cierres forzados, ventanas privadas, todas las carreras de red o pestañas con código antiguo abierto. **Dos contextos independientes de navegador: NOT RUN** por falta de esa capacidad en esta herramienta. El test de integración con dos identidades distintas y mismo nombre vuelve a pasar, pero no se confunde con dos contextos browser. Las ocho escrituras concurrentes con una misma identidad siguen siendo una prueba distinta.

## Firma y limpieza local

Variable real: **`BETY_IDENTITY_SECRET`**, aleatoria estable de 32 bytes representados por 64 dígitos hexadecimales. El runner lee la configuración privada existente `~/.local/state/bety-sprint2b/local.json` (modo 600, directorio privado) y la inyecta en servidor. No se regenera al arrancar; no hay clave fija de fallback, prefijo NEXT_PUBLIC ni acceso desde componentes cliente. `signed-visitor.ts` se consume desde resolución de identidad/handlers/servidor, y las respuestas no contienen token.

Nueva prueba de integración: quitar temporalmente la variable al handler de preparación produce 503, sin Set-Cookie y sin escrituras; después se restaura en finally. Se repiten pruebas de firma manipulada (409 sin alterar perfil), origen ajeno (403), respuestas `private, no-store`, Vary Cookie y reconocimiento de token legacy ya asociado a perfil. El test HTTP comprueba HttpOnly, SameSite y ausencia de cookie/token en HTML. Se preserva Secure por defecto y la excepción explícita del runner solo para HTTP local.

Reinicio real del servidor con la misma configuración: identidad verificada y UUID `4081c2c5-7625-4da3-9142-16dfb4ff575a` conservados; la ruta real reconoce el nombre tras reiniciar. Evidencia `restart-same-secret.json`. No se creó ni configuró secreto de producción.

Inspección de la clave real sin mostrarla: cero coincidencias en bundles cliente y servidor, HTML, artefactos/logs guardados, archivos versionados y objetos Git alcanzables. Resultado y conteos en `signing-artifacts-check.json`.

**Hallazgo adicional, no ocultado:** tres ficheros `.sst` de caché local de Turbopack contienen el entorno inyectado, incluida la clave. Son `.next/cache` y `.next/dev/cache`, ignorados por Git; no son bundles de entrega y no se copiaron ni publicaron. No se afirma que toda `.next` esté libre de secretos. Para una futura preparación de distribución se requiere excluir esas cachés, tratar sus copias como material privado y revisar la inyección de variables durante build; esta mitigación de empaquetado queda pendiente, no se da por implementada. El secreto estable debe aprovisionarse server-side en el entorno futuro con gestión privada, sin copiar cachés locales ni regenerarlo por cada arranque. Cualquier rotación necesita una decisión explícita sobre cookies existentes.

Limpieza: el runner verifica loopback, nombre `bety_integration_test`, puerto de configuración, etiqueta de contenedor, rol SQL y marcador de propiedad. El auxiliar browser verifica destino local/rol/marcador y solo borra hashes de cookies emitidas por ese auxiliar y registrados en su manifiesto privado (600); rechaza limpiar una cookie ajena y una respuesta aún pendiente. No acepta UUID de evidencias antiguas como autorización. El manifiesto sobrevive reinicios. Los dos auxiliares temporales antiguos de `/tmp` quedaron deshabilitados; no se usaron para borrar datos. El test HTTP y los tests DB eliminan únicamente hashes generados por su ejecución. Los perfiles sintéticos de esta ronda fueron limpiados por esos mecanismos; no hubo limpieza general de tablas.

## Recorrido final y evidencia visual

Pruebas nuevas con el código final en `/`: carta, reveal 3D, nombre, confirmación solo tras guardar, refresh y reconocimiento. Para mantener propiedad verificable de los datos de limpieza en las pruebas de UI, el auxiliar emitió primero una cookie firmada **sin perfil**; el recorrido real verificó esa cookie y escribió mediante el coordinador de producto. La preparación desde ausencia total de cookie se cubrió por separado en el escenario real de dos pestañas y por HTTP/DB. No se presenta esa fixture como preparación disparada por el formulario.

También se comprobó en el formulario real el bloqueo por otra pestaña: nombre conservado, mensaje comprensible, reintento posterior y un solo perfil. `recoverable-error.json` y `recovered-error.json`.

Fallback: escenario de desarrollo `context`, pérdida de renderer inyectada; queda 2D, input conservado y guardado real confirmado (`fallback.json`). La extensión WebGL de pérdida de contexto no estaba soportada en este runtime; se verificó la ruta de fallback inyectada, no un fallo físico de GPU. Reduced motion: escenario de desarrollo existente, renderer `data-reduced-motion=true`, primer frame y confirmación persistida (`reduced-motion.json`); no se cambió el ajuste global de macOS ni se probó un teléfono.

Solo dos capturas nuevas finales, ambas de **`http://localhost:3000/`**, viewport **390 × 844 emulado**, nombres sintéticos, modelo 3D listo:

1. `artifacts/sprint-2b-release/question-3d.png`: pregunta del nombre.
2. `artifacts/sprint-2b-release/return-3d.png`: return visit, “Prueba Cierre Local”.

No son imágenes generadas ni capturas del preview. No se regeneró ZIP ni auditoría visual masiva. Arte y renderers conservan exactamente los archivos previos; la aprobación artística sigue pendiente.

## Validaciones nuevas, secuenciales

| Comprobación | Resultado final | Evidencia en `artifacts/sprint-2b-release/` |
| --- | --- | --- |
| `npm test` | PASS, 52 tests / 11 archivos, exit 0 | `unit-tests.log` |
| `node scripts/local-integration.mjs test` | PASS, 10 tests / 2 archivos, PostgreSQL real exclusivo, exit 0 | `db-tests.log` |
| `npx tsc --noEmit` | PASS, exit 0 | `typescript.log` |
| `npm run lint` | PASS, exit 0 | `lint.log` |
| `PET_RENDERER=3d node scripts/local-integration.mjs build` | PASS, exit 0 | `build.log` |
| HTTP contra build local 127.0.0.1:3001 | PASS, respuesta perdida y reintento, 8 guardados, reconocimiento SSR | `production-http.json`, `.log` |
| Rutas QA en modo producción local, incluso con flag QA=1 | 404 en ambos previews y API de carrera; `/` 200 | `signing-artifacts-check.json` |
| `git diff --check` | PASS | Antes de commit |

Lint falló inicialmente por un enlace HTML en el auxiliar; se corrigió a Link y se ejecutó nuevamente la secuencia indicada. La nueva prueba de ausencia de clave elevó la integración de 9 a 10 tests. No se presenta el resultado previo 50/9 como una ejecución nueva. Se detuvieron solo servidores propios antes de build: no se sobrescribió `.next` bajo un dev activo. Aviso de deprecación THREE.Clock observado, sin modificación artística o de renderer para ocultarlo.

El HTTP de producción local verifica SQL antes de tratar como perdida la respuesta: mismo UUID `591fef06-7e8a-4171-bf7c-6433427ed130`, un perfil, una memoria, un pet; reintento `firstMemoryCreated=false`. Es pérdida simulada en el cliente de transporte después de respuesta/commit, no desconexión física de red.

## Pendientes reales

- Autorizar o rechazar la propuesta de overrides; resolver los tres avisos y cuatro entradas de paquetes antes de afirmar dependencias resueltas. Ningún riesgo de producción aceptado.
- Mitigación de empaquetado de cachés privadas de Turbopack, descrita arriba.
- Aprobación visual de las dos capturas.
- Teléfonos físicos, otros navegadores y dos contextos browser independientes: no probados en este cierre.
- PostgreSQL local de pruebas sí fue ejecutado; no equivale a validación de producción ni autoriza tocarla.

Las referencias, capturas, videos y logs sin seguimiento existentes se preservan. Los commits incluyen únicamente código/tests auxiliares pertinentes y este informe; ninguna imagen, credencial, caché, `.env` o evidencia binaria.
