# Continuous Collision Detection (CCD) covers sphere bodies only

`PhysicsSystem.ccdMotionThreshold` automatically sweeps a body for tunneling only when it's a
sphere moving farther than `radius * ccdMotionThreshold` in one substep. Box/OBB bodies stay
purely discrete — no sweep, no CCD — even though they can tunnel through thin geometry at high
speed too. Real swept-OBB CCD needs GJK/Conservative Advancement-style continuous math; sphere
sweeps reduce to closed-form ray/slab tests we already had (`Ray.intersectsBox`,
radius-expanded). Spheres also cover the overwhelming majority of real tunneling cases in
practice (fast balls/projectiles) at a fraction of the implementation cost.

**Reconsider this if:** a showcase needs fast-moving box/OBB bodies that tunnel through thin
walls/floors. That's new work (real convex-sweep math), not a bug fix to the existing CCD path
— don't expect `ccdMotionThreshold` to help box bodies as-is.
