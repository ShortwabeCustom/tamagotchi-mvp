# Sprint 2A — primera previsualización local

Fecha: 2026-09-19. Rama: `feat/miso-3d-space`. Commit de implementación: `75a27fb`. Commits locales; sin push ni despliegue.

**3D funcional local entregado. Fidelidad artística pendiente de aprobación.**

## Arranque seguro

```sh
cd /Users/alexisvaldez/Developer/bety-miso-3d
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir **http://127.0.0.1:3000/preview/miso**. Detener con **Ctrl+C** en la terminal que ejecuta Next. Esta ruta no necesita `.env`, DATABASE_URL ni PostgreSQL. No abrir `/` para probar este sprint: esa ruta conserva su dependencia original de identidad/memoria. El puerto de desarrollo es 3000; `npm start` mantiene la configuración previa de producción en 4001 y no sirve esta preview.

Si es necesario reinstalar en este Mac:

```sh
DATABASE_URL='postgresql://preview:preview@127.0.0.1:1/miso_preview' npm ci
```

La URL es ficticia y solo satisface la evaluación de prisma.config.ts durante `prisma generate`; no se ejecutaron migraciones ni consultas. El desarrollo de la preview se validó sin esa variable.

## Entorno comprobado antes de instalar

- Darwin 25.6.0, arm64; clon `/Users/alexisvaldez/Developer/bety-miso-3d`, rama correcta, Git inicialmente limpio, handoff presente.
- Sin SSH_CONNECTION, SSH_CLIENT ni SSH_TTY; `who` mostró solo consola local; no se encontraron procesos ssh/sshd activos.
- 24 GiB RAM, 10 CPU lógicas, 106 GiB libres de disco. `memory_pressure -Q`: 64% libre al inicio; swap usada 2778 MiB. Durante instalación 63%; después de QA 59%. Se comprobó margen, no se supuso capacidad por ser Mac.
- Node 24.14.0, npm 11.9.0, herramientas locales existentes. Cumplen engines de Next, Prisma y camera-controls. Sin sudo, force, legacy-peer-deps ni modificaciones globales.
- Instalación y build separados de la navegación visual. No se accedió al VPS, copiaron secretos, usó PostgreSQL de producción, modificó main ni desplegó.

## Qué se implementó

- `PetRenderer` conserva `PetAction` y usa **2D por defecto**. Selección reversible en runtime mediante prop `mode="3d"` / `mode="2d"`; no requiere cambiar variables de build. La preview permite elegirla en su menú Render. El flujo real conserva el valor predeterminado 2D.
- `next/dynamic` con SSR desactivado desde Client Component; Three queda tras esa frontera. Experience sigue sin montar PetRenderer en SEALED/OPENING/LETTER. No se modificaron Experience, identidad, memoria, API, schema ni la máquina de estados.
- `MisoProceduralModel`: volúmenes de superelipsoide con pigmentación carey por vértice, cuatro patas, orejas extruidas con grosor, iris/pupilas y párpado, cola tubular curva con punta cerrada y pañuelo volumétrico crema con manchas. Pivotes independientes para animación. No hay GLB, imagen del gato en un plano, assets remotos, HDRI ni física.
- Base redondeada con grosor, cuenco con perfil interior/exterior y sobre ambiental; cámara PerspectiveCamera sin controles de navegación. Vistas frente/tres cuartos/lateral solo en QA.
- Una luz con sombras dinámicas de 1024, relleno y contorno, fondo oscuro continuo, sin postprocesado. Geometrías/materiales reutilizados y liberados al desmontar.
- Respiración, parpadeo irregular, despertar, curiosidad, escucha, thinking y rebote happy breve. Acciones comparadas por valor, sin repetir one-shots al cambiar la identidad del objeto en rerenders. Delta acotado, sin actualizaciones React por frame salvo la señal única de primer frame. Mirada solo con ratón en idle neutral, sin capturar scroll ni gestos táctiles.
- Estados independientes de módulo, geometría disponible y primer frame realmente renderizado; avance monotónico para evitar carreras. Espera de 12 s por etapa pendiente, con fallback. Error boundary, protección de render-frame y evento de pérdida de contexto; no se recrea automáticamente un Canvas fallido. Reinicio explícito solo en QA.
- Reduced motion por preferencia del sistema o override QA: poses estables, sin respiración/parallax ni animación CSS de fallback. Canvas en demand; invalida continuamente solo mientras hay animación activa. Pausa por IntersectionObserver y document.hidden. Métricas a 1 Hz; no fuerzan frames reducidos.
- Preview `/preview/miso` con fixtures locales, input HTML accesible y sin fetch. No simula persistencia. Alegría del menú es un fixture; el producto sigue dependiendo de NAME_PERSISTED.
- La ruta responde **404 en build de producción**. Los controles no se sirven allí.

## Resultados reales

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | Correcta, Prisma generado con URL ficticia |
| `npm test` | 24 pruebas, 6 archivos, todas pasan; integración DB excluida |
| `npx tsc --noEmit` | Pasa tras generación de tipos de ruta |
| `npm run lint` | Pasa |
| `npm run build` | Pasa usando únicamente URL ficticia local |
| `/preview/miso` con next start local | HTTP 404 |
| Selector 2D | Desmonta Canvas, conserva `Bety local` |
| Fallo de import, geometría y renderer | Fallback conserva borrador |
| WEBGL_lose_context | Evento real, fallback con reason=context-lost; Canvas desmontado |
| Sin primer frame | Fallback por timeout, conserva borrador; observado después del plazo, no es medición precisa del temporizador |
| Reduced motion | Frames idénticos durante 18.458 s y estado `frame` conservado |
| Fuera de vista | data-active=false; contador de frames sin avance |
| Viewports | 1440×900, 768×1024, 390×844 y 390×500 sin overflow horizontal |
| 390×500 | Input y CTA terminan en y=424.2, visibles; no representa teclado físico |

Logs y observaciones: [artifacts/sprint-2a](../artifacts/sprint-2a). `browser-checks.json` registra las verificaciones del navegador. `browser-console.json` incluye **errores intencionales de los fixtures** y avisos de iteraciones previas; no es una consola limpia. Se corrigió el uso de PCFSoftShadowMap (eliminado en Three 0.186) por PCFShadowMap. Persiste la deprecación de THREE.Clock creada dentro de Fiber 9.7.0, sin fallo de render. La liberación de un contexto ya perdido puede emitir un aviso de extensión no soportada.

## Métricas observadas

En tres cuartos: **24.889 triángulos / 34 draw calls del pase principal**. Incluyendo la sombra: **37.969 / 48**. 13 geometrías, 3 texturas reportadas por el renderer (recursos internos de sombras; sin imágenes de color externas). DPR observado 1 y 1.5 según el viewport del navegador, configurado entre 1–1.5.

El contador toma el valor antes del primer draw principal para separar las sombras y resta ese valor al terminar el frame. No es un recuento estimado de primitivas. Renderer reportado: **ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)**. Se usó GPU física del Mac con viewports emulados; no dispositivos móviles físicos. No se midieron FPS sostenidos, temperatura, consumo energético ni memoria GPU en bytes. El contador de frames no se presenta como benchmark de FPS.

## Evidencias visuales

Capturas reales del navegador, sin generación de imágenes ni retoques. El formato nativo de captura es JPEG.

- [Desktop completo, tres cuartos, 1200×900](../artifacts/sprint-2a/desktop-three-quarter.jpg)
- [Desktop viewport 1440×900, área capturable 1250×900](../artifacts/sprint-2a/desktop-1440-viewport-visible-area.jpg)
- [Mobile 390×844](../artifacts/sprint-2a/mobile-390x844.jpg)
- [Mobile 390×500 con input](../artifacts/sprint-2a/mobile-390x500.jpg)
- [Tablet 768×1024](../artifacts/sprint-2a/tablet-768x1024.jpg)
- [Frente](../artifacts/sprint-2a/front.jpg), [lateral](../artifacts/sprint-2a/side.jpg)
- [Despertar](../artifacts/sprint-2a/awakening.jpg), [curiosidad](../artifacts/sprint-2a/curious.jpg), [happy](../artifacts/sprint-2a/happy.jpg), [thinking](../artifacts/sprint-2a/thinking.jpg), [recuperación](../artifacts/sprint-2a/recovery.jpg)
- [2D](../artifacts/sprint-2a/fallback-2d.jpg), [pérdida de contexto](../artifacts/sprint-2a/context-loss.jpg), [reduced motion](../artifacts/sprint-2a/reduced-motion.jpg)

Limitación del capturador del navegador integrado: a 1440 CSS px devuelve solo 1250 px del área visible. Se verificaron las dimensiones reales y ausencia de overflow por DOM y se entrega también una captura desktop completa a 1200. No se reescaló ni inventó una captura 1440. Las capturas de estados son instantáneas, algunas después del impulso breve; no prueban por sí solas la trayectoria completa de una animación. No se grabó clip.

## Evaluación separada y pendientes

| Dimensión | Estado |
| --- | --- |
| Volumen 3D | Funcional: frente y lateral demuestran espesor, cuerpo completo y escena común |
| Microinteracciones | Implementadas con PetAction; acción única/reduced motion cubiertos por unit tests; fixtures revisados en navegador |
| Integración | Frontera conservada, 2D predeterminado, preview aislada; sin pruebas DB ni E2E de persistencia real |
| Rendimiento | Presupuesto de triángulos/draw calls cumplido en este Mac; no constituye validación de hardware móvil |
| Fallback | Selector y fallos probados; borrador conservado; no pérdida de estado de la página |
| Fidelidad artística | **Pendiente importante, no aprobada** |

No llegaron imágenes adjuntas a esta sesión ni hay lámina guardada en el repositorio. Se siguió la descripción del handoff, sin afirmar comparación visual con una referencia ausente. El personaje todavía tiene simplificación de juguete: rostro bastante cúbico, iris gráficos, pigmentación menos orgánica y pañuelo rígido. Próxima revisión artística: contrastar la lámina real y refinar silueta, uniones de patas/cuerpo, integración de ojos, distribución de manchas y caída del pañuelo. No clasificar esta aprobación pendiente como detalle menor.

Pendientes de validación: integración PostgreSQL con base de pruebas propia; E2E del flujo real 3D habilitado; preferencia reduced-motion del SO (se verificó override que activa el mismo camino 3D); document.hidden en segundo plano (implementado, no medido aparte); fallo de creación en un equipo sin WebGL; rendimiento de dispositivos físicos y clip de animación.

## Dependencias y auditoría

Se mantienen Three 0.186.0, Fiber 9.7.0 y Drei 10.7.8; Drei no se importa en la escena. Se añade `@types/three` 0.186.0 como devDependency directa. No cambiaron versiones resueltas del lockfile; npm ajustó metadatos devOptional/license.

`npm audit` sigue reportando cuatro entradas high: prisma, @prisma/config, deepmerge-ts y mysql2. Informe completo: `artifacts/sprint-2a/npm-audit.json`. Advisories actuales incluyen GHSA-ggr8-5vv4-36mx, GHSA-3f6p-5ww8-9rcr y GHSA-rgwj-5xj2-c3m3 (moderate dentro de mysql2). No se afirma igualdad exacta con la auditoría histórica ni resolución. La reparación propuesta por npm implica cambio mayor de Prisma; no se aplicó automáticamente.
