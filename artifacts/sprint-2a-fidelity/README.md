# Evidencia visual de fidelidad — Sprint 2A

2026-09-19. Capturas reales locales. **Fidelidad artística pendiente de aprobación.**

`before` son copias exactas del QA previo; `after` contiene nuevas capturas. Neutral con reduced motion para fijar la expresión. `comparison-*-baseline` conserva cámara, FOV e intensidades anteriores; el modelo y sus materiales son nuevos. Las demás vistas usan la presentación artística final.

| Vista | Antes: QA previo | Modelo nuevo, cámara anterior | Modelo y presentación nuevos |
| --- | --- | --- | --- |
| Frente | [Antes](before/front.jpg) | [Comparación](after/comparison-front-baseline.jpg) | [Después](after/front.jpg) |
| Tres cuartos / desktop | [Antes](before/desktop-three-quarter.jpg) | [Comparación](after/comparison-three-quarter-baseline.jpg) | [Después](after/desktop-three-quarter.jpg) |
| Perfil | [Antes](before/side.jpg) | [Comparación](after/comparison-side-baseline.jpg) | [Después](after/side.jpg) |
| Mobile | [Antes](before/mobile-390x844.jpg) | — | [Después](after/mobile-390x844.jpg) |
| Curious | [Antes](before/curious.jpg) | — | [Después](after/curious.jpg) |
| Happy | [Antes](before/happy.jpg) | — | [Después](after/happy.jpg) |

Estados adicionales nuevos: [fallback 2D](after/fallback-2d.jpg), [reduced motion](after/reduced-motion.jpg).

Video real del Canvas: [MP4](after/miso-expressions.mp4), [WebM original](after/miso-expressions.webm). Aproximadamente 9 s, despertar → calma → curiosidad → alegría. MP4 añade una columna negra para dimensiones pares H.264; no reencuadra ni retoca al modelo. Los archivos `clip-check-*.jpg` son fotogramas extraídos del video.

Desktop 1200×900 y mobile 390×844 emulado en Apple M4; no teléfonos físicos. No hay capturas generadas con IA ni se presenta la referencia como resultado.

Resultados: [registro browser](browser-checks.json), [consola final](browser-final-console.json), [consola de fallos intencionales/HMR](browser-fixture-console.json), [tests](logs/tests.log), [TypeScript](logs/typescript.log), [lint](logs/lint.log), [build](logs/build.log).

[Informe de cambios, métricas y pendientes](../../docs/SPRINT-2A-FIDELITY-REVIEW.md). Las cuatro entradas high y las pruebas DB siguen pendientes.
