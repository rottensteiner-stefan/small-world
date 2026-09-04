# App-First: Genre-Specific Gameplay Code Stays Out of Core Until a Second Project Needs It

## Context

Small World is a general-purpose 3D engine. Every new project idea (a Doom-like shooter, a
light-cycle arena, a post-apocalyptic exploration game, and now a hypothetical Yoshi-style
platformer) tempts a natural shortcut: build the genre's specific mechanics — a flutter-jump
character controller, an egg-throw projectile, a side-scroll follow-camera, a light-trail
collision grid — directly into `src/core`, since "the engine should support this." Left
unchecked, this turns the engine into a pile of one-off, mutually irrelevant gameplay systems,
each carrying its own API-stability and backward-compatibility burden forever, for a feature only
one project ever used.

We already have four apps under `src/apps/` (`yad`, `light-cycle-arena`, `and-now`,
`neon-labyrinth`), each with its own genre-specific gameplay code living entirely in its own app
folder, not in `src/core`. And earlier in this session we made the same call at a smaller scale:
`Optics.refract()`/`Optics.cauchyIndex()`/`Ray2D.intersectSegment()` were extracted from
`showcases/28`'s prism-dispersion code into `src/math/` only once we deliberately wanted them
reusable — the extraction didn't happen speculatively while writing the showcase, and the showcase
itself still owns `outwardFaceNormal()` and the whole `computeSpectralRays()` orchestration, which
stayed local because nothing else needs it (yet).

## Decision

**New genre-specific gameplay code for a new project starts in `src/apps/<project>/`, never in
`src/core`.** This applies to things like: character controllers with genre-specific movement feel
(flutter jump, coyote time, jump buffering), weapon/projectile mechanics, genre-specific camera
follow behavior, and any other system that only makes sense in the context of one game's design.

The engine's job is to provide the *primitives* these are built from, not the genre mechanics
themselves — e.g. for a side-scrolling platformer: the `Behavior` system for the character
controller itself, `BillboardInstancer`/`Sprite` for 2D-in-3D rendering, `GridLevelBuilder`
(`tools/procgen`) for tile-based level data, and the `CameraStrategy` architecture as the seam a
new side-scroll-follow strategy plugs into (a new strategy class, following the existing pattern,
not a new core concept).

**Extraction into a shared, reusable place (a `src/math`/`src/core` utility, or eventually a
standalone plugin package) happens only when a *second* real project needs the same thing** — not
speculatively while building the first one. Until then, apparent duplication between two apps'
genre-specific systems is not a problem to pre-solve; it's just two apps that haven't yet proven
they need the same abstraction.

## Consequences

- The engine stays usable as a *general* 3D engine — a consumer who only wants materials/renderers/
  physics never inherits an egg-throw projectile system or a light-cycle collision grid in their
  bundle.
- Each app is free to make locally-optimal, opinionated design choices for its genre without
  negotiating them as permanent public engine API.
- The cost is paid at the second project: some deliberate, retrospective extraction work when a
  real second use case appears, instead of a speculative abstraction designed for a hypothetical
  one. This is the trade we want — see [[project_public_api_surface]] and the `Optics`/`Ray2D`
  precedent above for what that extraction looks like in practice.

**Reconsider this if:** a single genre-specific project turns out to need the *exact same*
mechanic in two of its own scenes/showcases internally (not across separate projects) — that's
already the "second need" signal and justifies extracting within that project's own boundary
immediately, same as `Optics`/`Ray2D` did within this repo.
