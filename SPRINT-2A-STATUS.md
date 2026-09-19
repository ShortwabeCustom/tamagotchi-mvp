# Sprint 2A — detenido por margen de recursos del VPS

Fecha: 2026-09-19. Implementación y QA 3D pendientes.

## Estado verificado

- Producción y origin/main: `1536a313ce673e46878a943d21e609f61d4585f3`.
- Worktree independiente: `/home/alexis/worktrees/bety-miso-3d`.
- Rama: `feat/miso-3d-space`, creada desde origin/main.
- Producción conserva main, sus node_modules, configuración y evidencias sin seguimiento.
- El worktree tiene node_modules propios, no tiene `.env` ni `.next`.
- No se copió ni enlazó configuración privada ni se accedió a PostgreSQL.
- No hay GLB en public/; la implementación prevista es procedural volumétrica.
- La lámina original está disponible en el historial de conversación. No llegaron dos imágenes adicionales junto al Prompt 06.

## Motivo de detención

El VPS tiene 1914 MiB de RAM. Antes de instalar había 788 MiB disponibles y 1703 MiB de swap utilizada. Durante la instalación aislada, npm alcanzó 1138400 KiB de RSS, la memoria disponible cayó hasta 223 MiB y la swap llegó a 2992 MiB. No se ejecutaron build y navegador simultáneamente: ninguno se inició.

Se intentó detener únicamente el proceso npm al observar este margen, pero ya había terminado correctamente. Tras la instalación quedaron aproximadamente 1302 MiB disponibles y 2047 MiB de swap ocupada. La recuperación de memoria no demuestra que compilación y QA WebGL sean seguros en este VPS compartido. Se suspendieron las siguientes operaciones de carga conforme a la sección 3 del encargo.

Bety respondió HTTP 200 y Finanzas HTTP 307 después de la instalación. PM2 conservó sus PID y contadores (bety: 1 reinicio previo; finanzas-hogar: 0). No se ejecutó ninguna operación de PM2, Nginx, Certbot, firewall o sudo que cambie servicios.

## Dependencias preparadas para el traspaso

- three: 0.186.0
- @react-three/fiber: 9.7.0
- @react-three/drei: 10.7.8

Los peerDependencies de Fiber aceptan React >=19 <19.3 y Three >=0.156. Drei acepta React ^19, Fiber ^9 y Three >=0.159. Next, React, Prisma y Tailwind mantienen sus versiones declaradas. La instalación terminó sin force ni legacy-peer-deps.

Aviso pendiente: camera-controls 3.1.2, transitiva de Drei, pide npm >=10.5.1; el servidor usa npm 9.2.0 y Node 22.22.1. No se actualizó npm global. Resolver esta compatibilidad en el entorno de desarrollo antes de aprobar las dependencias. @types/three todavía no se añadió como dependencia directa de desarrollo.

Auditoría previa: 4 hallazgos high (prisma, @prisma/config, deepmerge-ts y mysql2). La instalación reportó también 4 high; no se ha efectuado todavía una comparación detallada posterior por advisory. No se aplicaron reparaciones automáticas.

## Trabajo pendiente

No se han implementado el modelo, escena, selector, animaciones ni fallback. No hay nuevas pruebas, build, métricas GPU, capturas o clip. No hay base de pruebas configurada. El commit de traspaso agrupa únicamente package.json, package-lock.json, este estado y docs/SPRINT-2A-HANDOFF.md. No incluye implementación, merge ni despliegue.

Continuar en un checkout local u otro entorno de desarrollo con más memoria: conservar la rama desde el commit publicado, revisar el cambio de dependencias, completar la compatibilidad de herramientas y ejecutar implementación/build/QA allí. Mantener la base de producción desconectada y usar fixtures. La autorización del Prompt 06 para implementar y publicar la feature sigue vigente; el cambio de entorno no requiere rediseñar el alcance.

El documento autónomo de continuación es [docs/SPRINT-2A-HANDOFF.md](docs/SPRINT-2A-HANDOFF.md). Las referencias visuales deberán adjuntarse nuevamente en la sesión local; no están incorporadas al repositorio. Durante el cierre del traspaso no se ejecutaron instalaciones, builds, navegadores ni pruebas: solo revisión, documentación y operaciones Git autorizadas.
