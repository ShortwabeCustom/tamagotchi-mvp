# Design QA — Bety / Miso Sprint 1.6

- Source visual truth: Miso character reference board supplied in the conversation. It has no local source-image path; the last pre-polish browser captures in `/tmp/bety-visual-qa` are the implementation baseline.
- Implementation evidence: 17 final captures and `observations.json` in `/tmp/bety-visual-qa-after`.
- Normalized viewports: desktop `1440 × 900` CSS px at DPR 1; mobile `390 × 844` CSS px at DPR 1; virtual-keyboard simulation `390 × 500` CSS px.
- States: `SEALED`, `LETTER`, `REVEAL`, `ASKING_NAME`, pending persistence, recoverable error, timeout, retry success, `COMPANION`, return visit and reduced motion.
- Runtime: local production build on loopback port 4011 with Chromium 153; no PM2, proxy or production process was changed.

## Full-view comparison evidence

The source reference, baseline captures and final captures were inspected side by side. Representative pairs:

| Surface | Before | After | Result |
| --- | --- | --- | --- |
| Letter and CTA | `/tmp/bety-visual-qa/desktop-04-letter-cta.png` | `/tmp/bety-visual-qa-after/desktop-02-letter.png` | Warm material surface and editorial underlined invitation replace the pill button. |
| Returning Miso | `/tmp/bety-visual-qa/desktop-09-return-companion.png` | `/tmp/bety-visual-qa-after/desktop-06-companion-return.png` | Eyes, muzzle, bandana, rim light and body volume are clearer while the dark premium composition is retained. |
| Focused mobile name entry | `/tmp/bety-visual-qa/mobile-05-keyboard-viewport-simulation.png` | `/tmp/bety-visual-qa-after/mobile-04-keyboard-open.png` | Conversation, input and submit action remain usable in the reduced viewport. |

The final suite also includes desktop and mobile sealed, letter, reveal, name and return states, plus dedicated error, timeout and reduced-motion captures.

## Focused-region comparison evidence

- Miso's face: the final eyes use thinner edges, a green-yellow iris, larger catchlights and softer surrounding shadows. The muzzle and nose remain readable without a cartoon outline.
- Silhouette: the darker fur separates from the background through restrained warm rim light and value variation rather than a game-like glow.
- Bandana: the cream fabric is visibly separated from the chest and remains legible in the name and companion compositions.
- Name control: a transparent input with a warm focus underline replaces the boxed form treatment; its textual action stays adjacent and reachable.
- Letter CTA: the pill surface was removed in favor of text, underline expansion and a restrained heart response, with a persistent keyboard focus indicator.
- Envelope-to-letter continuity: the paper begins spatially inside the envelope, rises and scales into the settled letter rather than appearing as an unrelated screen.

## Finding history and disposition

| # | Original finding | Severity | Final status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Memory could be confirmed before PostgreSQL persisted the name. | High | FIXED | Pending stays in `ASKING_NAME`; `REMEMBERING_NAME` starts only after a successful response. `/tmp/bety-visual-qa-after/desktop-05-name-pending.png`. |
| 2 | A stalled request lacked an explicit timeout and recovery path. | High | FIXED | Abort after 8 seconds, preserved draft and retry without reload. `/tmp/bety-visual-qa-after/timeout-01-pending-no-confirmation.png`, `timeout-02-recoverable.png`. |
| 3 | Technical network/server details could reach the visitor. | High | FIXED | One safe in-character message is used for network, HTTP, parsing and abort failures. `/tmp/bety-visual-qa-after/error-01-safe-recoverable.png`. |
| 4 | The mobile keyboard could hide the submit action or break the composition. | High | FIXED | At `390 × 500`, the conversation, input and action remain visible and usable. `/tmp/bety-visual-qa-after/mobile-04-keyboard-open.png`. |
| 5 | Scroll and autofocus did not adapt safely to desktop, coarse pointers and reduced motion. | Medium | FIXED | Desktop autofocuses; mobile does not open the keyboard aggressively; nearest-block scroll respects reduced motion. |
| 6 | Miso looked flat and less premium than the reference. | Medium | IMPROVED | Eyes, proportions, face, shadows, bandana and tortoiseshell treatment were refined. Full 3D character parity remains outside this CSS-placeholder sprint. |
| 7 | Dark fur lost separation against the background. | Medium | FIXED | Subtle rim illumination and fur/background value separation restore the silhouette without neon glow. |
| 8 | The letter CTA resembled a SaaS button. | Medium | FIXED | Editorial text and underline treatment now carries the invitation. `/tmp/bety-visual-qa-after/desktop-02-letter.png`. |
| 9 | The name entry resembled a conventional boxed form. | Medium | FIXED | Transparent conversational input and small textual action replace the rectangle/button pair. |
| 10 | Envelope and letter read as separate screens rather than one physical transition. | Low | IMPROVED | The paper now emerges from the envelope and settles through a restrained rise/scale transition. |

## Required fidelity surfaces

- Fonts and typography: Cormorant Garamond continues to carry the intimate display voice; Geist supports labels and controls. Scale, line-height, tracking and wrapping remain legible at all captured sizes.
- Spacing and layout: desktop uses a centered, quiet composition; mobile adapts fluidly. The `390 × 500` focused state deliberately lets Miso peek above the conversation while preserving the actionable content.
- Colors and tokens: charcoal, warm cream, muted orange and olive-green eyes remain aligned with the reference board. Status/error copy does not introduce alarm-red visual noise.
- Image quality and asset fidelity: the user explicitly required refinement of the existing CSS/SVG `PlaceholderPet` and prohibited Three.js in this sprint. The result is deliberate and sharper, while exact 3D reference parity is deferred.
- Shapes and surfaces: the letter is warm and lightly material; both CTA and input avoid generic pill/card patterns.
- Copy and content: letter and primary Miso phrases are unchanged. Only the authorized pending and recoverable-error copy was added.
- Icons: no new icon family was introduced; the heart remains restrained and aligned with the editorial interaction.
- Accessibility: semantic controls and labels remain present; error and pending feedback use live semantics; focus-visible, Tab, Shift+Tab and Enter were exercised; reduced motion preserves progression and hierarchy.

## Functional and interaction evidence

- Pending name submission disables input and CTA, shows `Guardando…` / `Un momento…`, and never displays the memory promise.
- Repeated submit is ignored while the first request is in flight.
- Recoverable network failure preserves `Bety QA Polish Retry`; retry succeeds without a reload.
- Forced timeout preserves `Bety QA Timeout`, aborts after the configured window and exposes the same safe retry path.
- Desktop autofocus is present; coarse-pointer mobile does not autofocus on entry.
- Tab and Shift+Tab return focus correctly on the envelope, letter and name controls; Enter advances and submits.
- Reduced-motion progression completed without long decorative transitions.
- Return visits render the companion path without a sealed-envelope flash.
- Chromium reported zero console errors and zero unexpected network failures during the final suite.

## Iterations completed

1. Persistence gating, timeout, safe failure and retry were implemented and exercised.
2. Responsive name entry, smart focus, scroll behavior and editorial surfaces were refined.
3. First visual pass exposed a rectangular focus treatment, an obscured bandana and a transition-state letter capture.
4. The focus treatment was reduced to the intended underline, bandana layering was corrected, and final screenshots were recaptured after the letter settled.

## Remaining notes

- P3: confirm the keyboard viewport once on physical iOS and Android hardware before production deployment; the browser simulation passes but cannot reproduce every vendor keyboard behavior.
- P3: a future authorized character-rendering phase can pursue full 3D material and pose fidelity. It is intentionally deferred because Sprint 1.6 prohibits Three.js and requires the existing lightweight renderer.
- No remaining Critical or High finding was observed in the authorized Sprint 1.6 scope.

final result: passed
