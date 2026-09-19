# Candidato Linux x64 — Sprint 2B

El workflow `.github/workflows/miso-linux-candidate.yml` se dispara únicamente con push a `feat/miso-3d-space`. No despliega ni accede al VPS. La aprobación visual humana y los teléfonos físicos siguen pendientes.

## Construcción y ejecución independientes

Dos jobs estándar `ubuntu-24.04`, Node 24.14.0 y npm 11.9.0, sin cachés. El primero valida Prisma, unitarias, PostgreSQL, pruebas negativas del verificador, TypeScript, lint y ambas auditorías. Reutiliza el empaquetador en un directorio limpio sin configuración privada. El segundo descarga el mismo tar.gz, comprueba SHA-256 y manifiesto, lo extrae y ejecuta sin instalar dependencias dentro del paquete. El harness se instala por separado.

Cada job crea PostgreSQL 16 Alpine desechable con rol de aplicación NOSUPERUSER/NOCREATEDB/NOCREATEROLE, credenciales aleatorias enmascaradas y configuración privada fuera del checkout. No utiliza configuración del Mac ni del VPS. La adaptación conserva la configuración local existente. El build usa únicamente una URL ficticia; la clave de identidad se inyecta solo al servidor de prueba.

El runtime comprueba rutas, recursos estáticos, prepare/verify, guardado, visita de retorno, reinicio y reintento sin duplicación después de confirmar el commit SQL y descartar la respuesta. Chrome verifica un frame 3D, renderer 2D y fallback con SwiftShader: no es rendimiento de GPU ni teléfono físico.

## Artefactos y seguridad

Candidate y validated se conservan 7 días. Solo se publican tar.gz, SHA-256, manifiesto y resumen revisado. El paquete validated conserva exactamente los bytes del candidato probado. No se publican logs completos ni archivos privados.

El verificador inspecciona rutas, enlaces, tamaños, hashes y bytes, valores privados conocidos y variantes codificadas, además de patrones de claves privadas, AWS y npm. Se inspeccionan también los objetos de los commits pendientes antes del push. Esto no garantiza ausencia absoluta de secretos desconocidos. Los módulos nativos deben ser ELF64 x86_64; se registran bibliotecas y versiones GLIBC/GLIBCXX. El destino deberá proporcionar Node y esas bibliotecas, además de configuración privada de runtime. La compatibilidad con el VPS concreto NO se ha probado.

Acciones oficiales fijadas a commits completos, comprobados contra sus versiones: checkout v7.0.1, setup-node v7.0.0, upload-artifact v7.0.1 y download-artifact v8.0.1. Permisos contents: read, checkout sin credenciales persistentes, concurrencia por rama, timeouts 25/20 minutos.

## Estado antes de la primera ejecución

Lint, 10 pruebas locales PostgreSQL y 7 pruebas del verificador pasaron durante la adaptación. Los resultados Linux se obtendrán de la ejecución real; crear este workflow no equivale a PASS. Ante un bloqueo persistente se detendrá la ejecución, sin cambiar facturación, seguridad ni dependencias automáticamente. No hay release, tag, merge ni despliegue.
