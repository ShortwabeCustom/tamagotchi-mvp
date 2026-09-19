# Sprint 2A — primera previsualización local implementada

Actualizado: 2026-09-19. Rama `feat/miso-3d-space`, clon local del Mac.

**3D funcional local: listo para revisar. Fidelidad artística: pendiente importante de aprobación.**

- Miso procedural de cuerpo completo con geometría real, escenario, cuenco con cavidad, sobre, cámara y luces.
- PetRenderer/PetAction conservados, carga diferida, 2D por defecto en el producto, selector runtime en preview.
- Microinteracciones, control de carga/primer frame, fallback por errores y pérdida de contexto, reduced motion y pausa fuera de vista.
- Preview aislada sin Prisma/identidad/API: http://127.0.0.1:3000/preview/miso. Ruta 404 en producción.
- 24 pruebas unitarias pasan; TypeScript, lint y build pasan. Integración DB pendiente; no se usó producción.
- Medición Apple M4: 24.889 triángulos / 34 draw calls principal; 37.969 / 48 con sombras. DPR 1–1.5.
- Capturas reales desktop/mobile/tablet y estados en `artifacts/sprint-2a/`.
- No se recibieron imágenes de referencia en esta sesión. La descripción del handoff guió una aproximación procedural; no equivale a fidelidad aprobada.
- Auditoría: cuatro entradas high siguen abiertas; sin reparación forzada ni cambios mayores de Prisma.
- Sin acceso al VPS, secretos copiados, migraciones, cambios en main o despliegue.

Arranque desde este clon, sin variables de base de datos:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Ctrl+C detiene el servidor. Informe, evidencias, limitaciones y validación: [docs/SPRINT-2A-LOCAL-REVIEW.md](docs/SPRINT-2A-LOCAL-REVIEW.md).

El documento [docs/SPRINT-2A-HANDOFF.md](docs/SPRINT-2A-HANDOFF.md) conserva el estado histórico previo: preparación en VPS y suspensión por recursos. No describe el estado actual de esta implementación local.
