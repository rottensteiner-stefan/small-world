# Hit-stop scales gameplay time globally, not per entity

`SmallWorld.triggerHitStop()` scales the single `gameplayDeltaTime` passed to the app's own
`update()`, `physics.step()`, and `scene.update()` — every entity in the scene slows down
together, not just the one that got hit. This wasn't the ideal design, it's what the engine
actually supports: `RigidBody` has no per-body time-scale field, and `PhysicsSystem.step()`
takes one global `dt` for the whole scene, so true selective hit-stop (freeze only the struck
entity, keep everything else at full speed) isn't something the current physics/update
architecture can express. The camera is deliberately excluded from the scaling (it keeps
running at real `deltaTime`) so its shake/flash effects still play during the freeze — that's
what actually sells the impact, and doesn't require per-entity support.

**Reconsider this if:** a showcase needs genuinely selective hit-stop (freeze the world, keep
one character animating). That would need a per-`RigidBody` (and per-`Behavior`?) time-scale
field threaded through `PhysicsSystem.step()`, not a fix to `triggerHitStop()` itself.
