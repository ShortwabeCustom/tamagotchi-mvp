# Bety / Miso — Sprint 2A: traspaso a desarrollo local

## Estado real al cerrar el traspaso

Todavía no hay modelo ni escena 3D. Esta rama contiene preparación de dependencias y documentación, no una entrega visual.

- Repositorio: `ShortwabeCustom/tamagotchi-mvp`.
- Rama de trabajo: `feat/miso-3d-space`.
- Commit base publicado: `1536a313ce673e46878a943d21e609f61d4585f3`.
- Worktree de origen: `/home/alexis/worktrees/bety-miso-3d` en el VPS. Continuar en un checkout local del Mac, no en este servidor.
- V1 publicada: https://bety.productdesign.mx. Recuerda el nombre y reconoce la visita de regreso mediante identidad, cookie y PostgreSQL.
- Entorno usado para preparar dependencias: Linux x86_64, Node `22.22.1`, npm `9.2.0`.
- Archivos de este traspaso: `package.json`, `package-lock.json`, `SPRINT-2A-STATUS.md` y este documento.
- No se cambió código de aplicación. No hay `.env` ni `.next` en el worktree de origen; sus `node_modules` son independientes y no se versionan.
- Las evidencias antiguas `artifacts/` y `visual-gate-report.md` pertenecen al checkout publicado y quedan fuera de este commit.

### Dependencias declaradas y lockfile

| Paquete | Declaración | Versión resuelta |
| --- | --- | --- |
| three | 0.186.0 | 0.186.0 |
| @react-three/fiber | 9.7.0 | 9.7.0 |
| @react-three/drei | 10.7.8 | 10.7.8 |
| @types/three | Todavía no es dependencia directa | 0.186.0, transitiva |
| next | 16.3.5 | 16.3.5 |
| react / react-dom | 19.2.8 | 19.2.8 |
| prisma / @prisma/client | ^7.10.0 | 7.10.0 |
| tailwindcss | ^4 | 4.3.3 |

El lockfile añade 54 entradas de paquetes sin cambiar versiones ni eliminar paquetes previamente presentes. Incluye dependencias transitivas de los helpers de Drei; su presencia no autoriza usar física, vídeo ni funciones adicionales. No se regeneró el lockfile durante el cierre del traspaso.

Compatibilidad declarada: Fiber admite React `>=19 <19.3` y Three `>=0.156`; Drei admite React `^19`, Fiber `^9.0.0` y Three `>=0.159`.

Avisos conocidos:

- `camera-controls@3.1.2` pide Node >=22 y npm >=10.5.1. Node cumplía, npm 9.2.0 no: la instalación mostró `EBADENGINE`. Resolver usando herramientas compatibles del entorno local antes de validar la instalación; no ocultarlo con force ni modificar npm global de otros proyectos.
- `@types/three` debe declararse directamente como dependencia de desarrollo durante la implementación local si se usa en el código.
- La instalación mostró un aviso de deprecación de `eslint@9.39.5` ya presente en el lockfile base.
- Auditoría anterior a la preparación: cuatro entradas high relacionadas con `prisma`, `@prisma/config`, `deepmerge-ts` y `mysql2`. Al finalizar la instalación también se reportaron cuatro high. No se compararon individualmente los advisories posteriores ni se ejecutó una nueva auditoría en este cierre; no afirmar que se resolvieron o que no puede haber otros hallazgos.

### Por qué se detuvo en el VPS

El servidor tiene 1914 MiB de RAM. Antes de instalar había 788 MiB disponibles y 1703 MiB de swap ocupada. npm alcanzó 1138400 KiB de RSS; quedaron 223 MiB disponibles y la swap llegó a 2992 MiB. La instalación terminó antes de que pudiera detenerse. Se suspendieron build y navegador para proteger los servicios activos. El detalle histórico está en `SPRINT-2A-STATUS.md`.

No se ejecutaron tests, TypeScript, lint, build, revisión WebGL ni capturas para estas dependencias nuevas. Los resultados aprobados de V1 no validan Sprint 2A. No hay métricas de FPS, triángulos, draw calls ni fidelidad artística.

## Objetivo pendiente y dirección artística

Sustituir el placeholder por Miso de cuerpo completo dentro de un escenario 3D real. Conservar el gato carey, cabeza grande ligeramente cúbica de bordes suaves, cuerpo compacto, patas cortas, cola curva, orejas altas con grosor, ojos verde amarillento y pañuelo crema con manchas oscuras. Paleta carbón, naranja cálido, crema y oliva. Buscar un juguete suave, cálido y expresivo; evitar robot, ojos desconectados, esferas apiladas y manchas como globos pegados.

Crear suelo/base mate redondeada con grosor y sombra de contacto, cuenco cerámico crema con cavidad y un sobre pequeño apoyado. Cuenco y sobre son ambientales, sin interacciones ficticias. Compartir escala, perspectiva e iluminación. Fondo oscuro continuo con la página, luz cálida principal, relleno moderado y luz de contorno; como máximo una luz con sombras dinámicas. Sin HDRI remoto obligatorio ni postprocesado.

Usar PerspectiveCamera contenida cerca de la altura de los ojos, mostrando suficiente suelo y sin cortar orejas, patas o cola. Sin navegación libre en el producto; vistas frontal, tres cuartos y lateral solo para QA.

No se encontró GLB en los assets públicos del repositorio. Volver a comprobar el checkout local: si aparece uno real, verificar geometría, materiales, nodos, animaciones y licencia sin inventar nombres. En caso contrario construir `MisoProceduralModel` con geometría volumétrica, pivotes independientes para cuerpo, cabeza, orejas, ojos/pupilas/párpados, cola y pañuelo. No usar un plano con la imagen del gato ni referencias a archivos inexistentes. La aproximación procedural no equivale a fidelidad artística aprobada.

Las imágenes de referencia no están guardadas en este repositorio: se adjuntarán nuevamente en la sesión local si faltan. La lámina de Miso de cuerpo completo es el objetivo artístico; una captura de producción solo describe el punto de partida. No afirmar haber visto imágenes ausentes.

## Integración existente que se debe conservar

Leer `AGENTS.md` y la documentación de Next instalada antes de editar. Rutas reales:

- `src/components/pet/PetRenderer.tsx`: frontera actual, recibe `{ action: PetAction }` y renderiza PlaceholderPet.
- `src/types/pet.ts`: contrato PetAction con `emotion`, `animation`, `intensity`.
- `src/lib/pet-engine/actions.ts`: traducción de fases del producto a acciones.
- `src/components/pet/PlaceholderPet.tsx`: fallback 2D actual.
- `src/components/experience/Experience.tsx` y `experience-machine.ts`: flujo de onboarding y confirmación.
- `src/components/conversation/`: conversación, input y recuperación en HTML.
- `src/app/page.tsx`: reconocimiento server-side; importa el servicio de memoria.
- `src/lib/db/prisma.ts`: inicializa Prisma y exige DATABASE_URL. Evitar esta dependencia en la previsualización.

Conservar PetRenderer y PetAction; separar geometría, animación, cámara, luces y calidad del estado de producto. Carta, diálogo, input, botones y errores siguen en HTML accesible. No alterar identidad, memoria, API, schema ni la máquina de estados para facilitar el 3D. Happy en el producto real depende de `NAME_PERSISTED`, nunca de un temporizador visual.

Implementar selección reversible 2D/3D con 2D por defecto fuera de la previsualización, documentando si se resuelve en build o runtime. Carga diferida desde una frontera Client Component con SSR desactivado: no importar Three en el código necesario para SEALED ni mantener Canvas oculto en LETTER. Distinguir módulo disponible, assets disponibles y primer frame; poner espera acotada y fallback sin remontar Experience ni perder el nombre escrito.

Animaciones: idle/respiración, blink irregular, awakening, curious, listening, thinking durante pending y happy breve tras éxito. Recuperación vuelve a atención amable. Acciones explícitas prevalecen sobre puntero e idle; evitar repetir acciones únicas por rerender. Delta time, sin setState por frame, limpiar recursos y listeners al desmontar. Mirada desktop sutil y retorno neutral; sin capturar gestos o scroll ni parallax táctil.

Un Canvas, DPR 1–1.5 inicial, geometrías/materiales reutilizados. Objetivos a medir, no garantías: menos de 60000 triángulos y 80 draw calls del pase principal; texturas de hasta 1024 px preferentemente. Pausar fuera de vista y con document.hidden. Reduced motion usa poses estables y elimina idle continuo/parallax. Si hay frameloop demand, no afirmar ahorro si se invalida continuamente.

Conservar PlaceholderPet ante fallos de importación, WebGL, renderer, assets o pérdida de contexto no recuperable. Gestionar context loss explícitamente y evitar bucles de recreación. Ninguna tarea esencial depende del Canvas.

## Continuación en el Mac: previsualización sin base de datos

1. Abrir el repositorio local en `feat/miso-3d-space`, leer este documento y verificar estado Git, sistema operativo, ausencia de SSH al VPS, Node/npm, memoria y disco. Preservar cambios ajenos.
2. Seleccionar herramientas compatibles mediante el mecanismo local existente, sin sudo ni actualizaciones globales de otros proyectos. Con recursos suficientes, ejecutar `npm ci` sin force ni legacy-peer-deps. No regenerar el lockfile para ocultar incompatibilidades.
3. Advertencia concreta: `postinstall` ejecuta `prisma generate`; `prisma.config.ts` evalúa `env("DATABASE_URL")`. Una instalación sin esa variable puede requerir resolver la generación del cliente. Si se necesita para generar, usar exclusivamente una URL ficticia local sin servicio/base de producción, documentar su uso y no ejecutar migraciones ni conexiones. No copiar `.env` del VPS.
4. Crear previsualización de PetScene3D con fixtures y PetAction locales, aislada de módulos de Prisma e identidad. No necesita PostgreSQL. Controles solo en desarrollo, inaccesibles en build de producción. No simular persistencia en el flujo real ni llamar a la API publicada.
5. Instalar, compilar y ejecutar navegador de forma secuencial. Inspeccionar scripts: `dev` es `next dev`; `start` está configurado para producción en 4001. Para desarrollo elegir un puerto libre, preferentemente `npm run dev -- --hostname 127.0.0.1 --port 3000`. La ruta de preview todavía no existe: crearla antes de entregar una URL, documentar cómo detener el proceso con Ctrl+C y cerrar procesos temporales al terminar.

## Validación y entrega pendientes

- Revisar desktop 1440×900, tablet 768×1024, mobile 390×844 y viewport reducido 390×500. El último simula espacio útil, no teclado físico. Reservar espacio desde el inicio y priorizar input/CTA sin autofocus agresivo móvil.
- Capturar frente, tres cuartos, lateral, escenario desktop, companion mobile, awakening, curious, happy, input reducido, fallback y reduced motion. Clip corto si es posible. Evidencias persistentes fuera de public y paquete descargable si el entorno lo permite.
- Tests seguros de mapeo de acciones, acción única ante rerender, fallback sin pérdida de estado, reduced motion, selector 2D/3D, carga fallida y confirmación dependiente del servidor. Ejecutar tests existentes seguros, TypeScript, lint y build cuando sus requisitos estén satisfechos.
- Si una prueba necesita DB y no hay base de pruebas configurada, marcarla pendiente; no utilizar producción ni túneles PostgreSQL, ni crear/eliminar perfiles reales.
- Medir draw calls, triángulos y recursos. Distinguir GPU física, software rendering, viewport emulado y dispositivo real. No inventar FPS ni validaciones de móviles físicos.
- Evaluar por separado volumen del escenario/personaje, fidelidad artística, microinteracciones, integración, rendimiento y fallback. Si parece un conjunto de primitivas o difiere mucho de la lámina, registrar pendiente artístico importante e iterar; no degradarlo automáticamente a P3.
- Entregar rama/commit, dependencias, tipo de modelo, geometría, animaciones, evidencias, diferencias con referencia, pruebas/limitaciones, métricas medidas, arranque seguro y selector 2D. Separar «3D funcional» de «fidelidad artística aprobada».

## Límites y autorización

Continuar implementación local, commits pequeños y push normal exclusivamente de `feat/miso-3d-space`, tras revisar secretos. No merge a main, force push ni despliegue. Sin IA/OpenAI, nuevas preguntas o recuerdos, migraciones, alimentación funcional, física ni mundo explorable. Sin PM2, Nginx, Certbot, firewall, swap u otros cambios de infraestructura. No volver al VPS para instalación, build o navegador. Preservar V1 publicada.
