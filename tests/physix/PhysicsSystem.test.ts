import { describe, it, expect, beforeEach } from "vitest";
import { PhysicsSystem } from "../../src/physix/PhysicsSystem.js";
import { Scene } from "../../src/core/Scene.js";
import { Object3D } from "../../src/core/Object3D.js";
import { RigidBody } from "../../src/physix/RigidBody.js";
import { Vector3D } from "../../src/math/index.js";
import { Cube, Sphere } from "../../src/geometry/index.js";
import { BoundingSphere } from "../../src/physix/BoundingSphere.js";
import { BoundingBox } from "../../src/physix/BoundingBox.js";
import { OBB } from "../../src/physix/OBB.js";
import { StaticCollider } from "../../src/physix/StaticCollider.js";
import { EventDispatcherImpl } from "../../src/core/events/EventDispatcherImpl.js";

describe("PhysicsSystem", () => {
  let system: PhysicsSystem;
  let scene: Scene;
  let events: EventDispatcherImpl;

  beforeEach(() => {
    events = new EventDispatcherImpl();
    system = new PhysicsSystem(events);
    // Default gravity is -9.81 on Y, set to 0 for controlled tests
    system.gravity.set(0, 0, 0);
    system.maxDeltaTime = 1000.0;
    system.maxDeltaTime = 1000.0;
    scene = new Scene();
  });

  it("should integrate linear velocity and position", () => {
    const obj = new Object3D();
    const rb = new RigidBody(1.0);
    rb.friction = 1.0; // no damping
    obj.rigidBody = rb;
    scene.add(obj);

    rb.applyForce(new Vector3D(10, 0, 0));

    // dt = 1.0s
    system.fixedTimeStep = 1.0;
    system.fixedTimeStep = 1.0;
    system.step(scene, 1.0);

    // a = 10 / 1 = 10
    // v = v + a*dt = 10
    // p = p + v*dt = 10
    expect(rb.acceleration.x).toBe(10);
    expect(rb.velocity.x).toBe(10);
    expect(obj.position.x).toBe(10);

    // Forces should be cleared
    expect(rb.forces.x).toBe(0);
  });

  it("should apply global gravity", () => {
    const obj = new Object3D();
    const rb = new RigidBody(2.0);
    rb.friction = 1.0;
    obj.rigidBody = rb;
    scene.add(obj);

    system.gravity.set(0, -10, 0);

    system.fixedTimeStep = 0.5;
    system.fixedTimeStep = 0.5;
    system.step(scene, 0.5);

    // Force = mass * gravity = 2 * -10 = -20
    // a = -20 / 2 = -10
    // v = 0 + (-10) * 0.5 = -5
    // p = 0 + (-5) * 0.5 = -2.5
    expect(rb.velocity.y).toBe(-5);
    expect(obj.position.y).toBe(-2.5);
  });

  it("should apply linear friction", () => {
    const obj = new Object3D();
    const rb = new RigidBody(1.0);
    rb.friction = 0.5;
    obj.rigidBody = rb;
    scene.add(obj);

    rb.velocity.set(10, 0, 0);

    system.fixedTimeStep = 1.0;
    system.fixedTimeStep = 1.0;
    system.step(scene, 1.0);

    // After friction, velocity should be 10 * 0.5 = 5
    expect(rb.velocity.x).toBe(5);
    // position = p + v * dt = 0 + 5 * 1 = 5
    expect(obj.position.x).toBe(5);
  });

  it("should integrate angular velocity and apply rotation via Quaternions", () => {
    const obj = new Object3D();
    const rb = new RigidBody(1.0, 1.0);
    rb.angularDamping = 1.0; // no damping
    obj.rigidBody = rb;
    scene.add(obj);

    // Apply torque on Y axis
    rb.applyTorque(new Vector3D(0, Math.PI, 0));

    // step 0.5s
    system.fixedTimeStep = 0.5;
    system.fixedTimeStep = 0.5;
    system.step(scene, 0.5);

    // a_angular = PI / 1 = PI
    // w = 0 + PI * 0.5 = PI/2 (90 degrees)
    expect(rb.angularVelocity.y).toBeCloseTo(Math.PI / 2);

    // object rotation around Y should be approx PI/2 * dt = PI/4 (45 degrees)
    // Wait, step does: deltaW = a_angular * dt -> w += deltaW -> apply w * dt
    // w = PI/2. Then angle = w * dt = (PI/2) * 0.5 = PI/4.
    expect(obj.rotation.y).toBeCloseTo(Math.PI / 4, 5);

    // Torque should be cleared
    expect(rb.torque.lengthSq()).toBe(0);
  });

  it("should not move static bodies (mass = 0)", () => {
    const obj = new Object3D();
    const rb = new RigidBody(0);
    obj.rigidBody = rb;
    scene.add(obj);

    system.gravity.set(0, -10, 0);
    rb.applyForce(new Vector3D(100, 100, 100));
    rb.applyTorque(new Vector3D(100, 100, 100));

    system.fixedTimeStep = 1.0;
    system.fixedTimeStep = 1.0;
    system.step(scene, 1.0);

    expect(rb.velocity.lengthSq()).toBe(0);
    expect(rb.angularVelocity.lengthSq()).toBe(0);
    expect(obj.position.lengthSq()).toBe(0);
    expect(obj.rotation.lengthSq()).toBe(0);
  });

  it("should safely ignore dt <= 0 without modifying anything", () => {
    const obj = new Object3D();
    const rb = new RigidBody(1.0);
    obj.rigidBody = rb;
    scene.add(obj);

    rb.applyForce(new Vector3D(100, 100, 100));
    rb.velocity.set(10, 10, 10);
    obj.position.set(5, 5, 5);

    system.fixedTimeStep = 0;
    system.fixedTimeStep = 0;
    system.step(scene, 0);
    expect(rb.forces.lengthSq()).toBe(30000); // not cleared
    expect(rb.velocity.x).toBe(10);
    expect(obj.position.x).toBe(5);

    system.step(scene, -1.0);
    expect(rb.forces.lengthSq()).toBe(30000);
  });

  it("should not crash if objects have no RigidBody", () => {
    const obj1 = new Object3D();
    const obj2 = new Object3D();
    obj2.rigidBody = new RigidBody(1.0);
    scene.add(obj1, obj2);

    expect(() => system.step(scene, 1.0)).not.toThrow();
  });

  it("should handle extremely small angular velocities gracefully (wLength < epsilon)", () => {
    const obj = new Object3D();
    const rb = new RigidBody(1.0, 1.0);
    obj.rigidBody = rb;
    scene.add(obj);

    rb.applyTorque(new Vector3D(0.0000001, 0, 0));

    expect(() => system.step(scene, 1.0)).not.toThrow();
    expect(obj.rotation.x).toBeCloseTo(0, 5);
  });

  it("should handle large impulses without NaNing out (stability check)", () => {
    const obj = new Object3D();
    const rb = new RigidBody(1.0);
    obj.rigidBody = rb;
    scene.add(obj);

    rb.applyImpulse(new Vector3D(1e10, -1e10, 1e10));

    expect(Number.isNaN(rb.velocity.x)).toBe(false);
    expect(rb.velocity.x).toBe(1e10);

    system.fixedTimeStep = 1.0;
    system.fixedTimeStep = 1.0;
    system.step(scene, 1.0);

    expect(Number.isNaN(obj.position.x)).toBe(false);
    expect(obj.position.x).toBeCloseTo(1e10 * 0.98, -8);
  });

  it("should resolve Sphere-Sphere collisions (push apart and bounce)", async () => {
    const { BoundingSphere } = await import("../../src/physix/BoundingSphere.js");

    const sphere1 = new Object3D();
    sphere1.position.set(0, 0, 0);
    const rb1 = new RigidBody(1.0);
    rb1.restitution = 1.0;
    rb1.friction = 1.0;
    sphere1.rigidBody = rb1;
    sphere1.bounds = new BoundingSphere(sphere1.position, 1.0);

    const sphere2 = new Object3D();
    sphere2.position.set(1.5, 0, 0); // Penetrating by 0.5
    const rb2 = new RigidBody(1.0);
    rb2.restitution = 1.0;
    rb2.friction = 1.0;
    sphere2.rigidBody = rb2;
    sphere2.bounds = new BoundingSphere(sphere2.position, 1.0);

    scene.add(sphere1, sphere2);

    // We want them to bounce back.
    // They are already penetrating, so let's set velocities so they bounce.
    rb1.velocity.set(1, 0, 0);
    rb2.velocity.set(-1, 0, 0);

    // Call resolveCollisions directly by casting to any to avoid integration step tunneling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (system as any)._resolveCollisions([sphere1, sphere2], [sphere1, sphere2]);

    // After positional correction:
    // depth is 0.5. totalInvMass is 2. correction is 0.25.
    // normal points from s2(1.5) to s1(0) -> (-1, 0, 0).
    // so s1 is pushed left by 0.25 -> x = -0.25
    // so s2 is pushed right by 0.25 -> x = 1.75
    expect(sphere1.position.x).toBeCloseTo(-0.25, 1);
    expect(sphere2.position.x).toBeCloseTo(1.75, 1);

    // After impulse:
    // normal = (-1, 0, 0)
    // velA = 1, velB = -1. rv = (2, 0, 0)
    // velAlongNormal = -2
    // e = 1.0. jMag = -(2) * -2 / 2 = 2.
    // impulse = normal * jMag = (-2, 0, 0)
    // rb1 gets (-2, 0, 0). new vel = (1 - 2) = -1.
    // rb2 gets (2, 0, 0). new vel = (-1 + 2) = 1.
    expect(rb1.velocity.x).toBeCloseTo(-1);
    expect(rb2.velocity.x).toBeCloseTo(1);
  });
  it("should resolve Box-Box collisions (push apart and bounce)", () => {
    const box1 = new Object3D();
    box1.position.set(0, 0, 0);
    const rb1 = new RigidBody(1.0);
    rb1.restitution = 1.0;
    rb1.friction = 1.0;
    box1.rigidBody = rb1;
    box1.bounds = new BoundingBox(new Vector3D(-1, -1, -1), new Vector3D(1, 1, 1));

    const box2 = new Object3D();
    box2.position.set(1.5, 0, 0);
    const rb2 = new RigidBody(1.0);
    rb2.restitution = 1.0;
    rb2.friction = 1.0;
    box2.rigidBody = rb2;
    box2.bounds = new BoundingBox(new Vector3D(0.5, -1, -1), new Vector3D(2.5, 1, 1));

    scene.add(box1, box2);

    rb1.velocity.set(1, 0, 0);
    rb2.velocity.set(-1, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (system as any)._resolveCollisions([box1, box2], [box1, box2]);

    // Overlap on X is 0.5 (box1 max.x=1, box2 min.x=0.5), Y/Z fully overlap -> X is least penetration.
    // Same depth/mass/velocity setup as the Sphere-Sphere test above, so the correction and
    // impulse math resolve identically: box1 pushed left, box2 pushed right, velocities reverse.
    expect(box1.position.x).toBeCloseTo(-0.25, 1);
    expect(box2.position.x).toBeCloseTo(1.75, 1);
    expect(rb1.velocity.x).toBeCloseTo(-1);
    expect(rb2.velocity.x).toBeCloseTo(1);
  });

  it("should resolve OBB-OBB collisions (push apart and bounce)", () => {
    const obb1 = new Object3D();
    obb1.position.set(0, 0, 0);
    const rb1 = new RigidBody(1.0);
    rb1.restitution = 1.0;
    rb1.friction = 1.0;
    obb1.rigidBody = rb1;
    const bounds1 = new OBB();
    bounds1.center.set(0, 0, 0);
    bounds1.halfExtents.set(1, 1, 1);
    obb1.bounds = bounds1;

    const obb2 = new Object3D();
    obb2.position.set(1.5, 0, 0);
    const rb2 = new RigidBody(1.0);
    rb2.restitution = 1.0;
    rb2.friction = 1.0;
    obb2.rigidBody = rb2;
    const bounds2 = new OBB();
    bounds2.center.set(1.5, 0, 0);
    bounds2.halfExtents.set(1, 1, 1);
    obb2.bounds = bounds2;

    scene.add(obb1, obb2);

    rb1.velocity.set(1, 0, 0);
    rb2.velocity.set(-1, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (system as any)._resolveCollisions([obb1, obb2], [obb1, obb2]);

    // Same depth/mass/velocity setup as the axis-aligned Box-Box test above -> identical math.
    expect(obb1.position.x).toBeCloseTo(-0.25, 1);
    expect(obb2.position.x).toBeCloseTo(1.75, 1);
    expect(rb1.velocity.x).toBeCloseTo(-1);
    expect(rb2.velocity.x).toBeCloseTo(1);
  });

  it("should resolve collisions against Scene.staticColliders (colliders outside the Object3D graph)", () => {
    const dynObj = new Object3D();
    dynObj.rigidBody = new RigidBody(1);
    dynObj.position.set(0, 0, 0);
    dynObj.bounds = new BoundingSphere(dynObj.position, 1.0);
    scene.add(dynObj);

    // A static wall that lives entirely outside the Object3D scene graph.
    const wallBounds = new BoundingBox(new Vector3D(0.5, -1, -1), new Vector3D(2.5, 1, 1));
    const wall = new StaticCollider(wallBounds);
    scene.staticColliders.push(wall);

    dynObj.rigidBody.velocity.set(1, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (system as any)._resolveCollisions([dynObj], [dynObj, wall]);

    // Sphere (r=1 at x=0) overlaps the wall (box x=0.5..2.5) by 0.5. The wall has no RigidBody
    // (infinite mass), so all positional correction lands on dynObj, pushing it left of x=0.
    expect(dynObj.position.x).toBeLessThan(0);
  });

  it("should not crash with NaN if an object lacks a RigidBody (restitution bug)", () => {
    // Dynamic object
    const dynObj = new Object3D();
    dynObj.geometry = new Sphere({ radius: 1 }).getGeometryData();
    dynObj.rigidBody = new RigidBody(1.0);
    dynObj.position.set(0, 1, 0); // slightly overlapping the static object
    scene.add(dynObj);

    // Static object WITHOUT a rigid body
    const staticObj = new Object3D();
    staticObj.geometry = new Sphere({ radius: 1 }).getGeometryData();
    staticObj.position.set(0, 0, 0);
    scene.add(staticObj);

    // Initial bounds
    scene.update();
    for (const obj of scene.objects) {
      obj.computeBounds();
    }

    // Step physics
    system.gravity.set(0, -10, 0);
    expect(() => {
      system.fixedTimeStep = 0.1;
      system.fixedTimeStep = 0.1;
      system.step(scene, 0.1);
    }).not.toThrow();

    // The dynamic object should not have NaN velocity
    expect(Number.isNaN(dynObj.rigidBody.velocity.y)).toBe(false);
  });

  it("should correctly resolve Sphere vs Box collision (Tunneling regression)", () => {
    // Large static floor
    const floor = new Object3D("Floor");
    floor.geometry = new Cube({ size: 1 }).getGeometryData();
    floor.setScale(40, 10, 40);
    floor.position.set(0, -5, 0);
    floor.rigidBody = new RigidBody(0);
    scene.add(floor);

    // Dynamic marble
    const marble = new Object3D("Marble");
    marble.geometry = new Sphere({ radius: 1 }).getGeometryData();
    marble.position.set(0, 5, 0); // Drop from Y=5
    marble.rigidBody = new RigidBody(1);
    scene.add(marble);

    // Initial setup
    scene.update();
    for (const obj of scene.objects) {
      obj.computeBounds();
    }

    // Gravity
    system.gravity.set(0, -9.81, 0);

    // Step for 100 frames
    for (let i = 0; i < 100; i++) {
      system.fixedTimeStep = 0.016;
      system.fixedTimeStep = 0.016;
      system.step(scene, 0.016);
      scene.update();
    }

    // Marble should have bounced and come to rest around Y=1.0 (radius)
    // Floating point math might not be exactly 1.0, but it should be above 0.
    expect(marble.position.y).toBeGreaterThan(0.9);
  });

  it("should correctly identify collisions in a dispersed scene (Broadphase Equivalence)", () => {
    // 30 scattered bodies.
    const bodies: Object3D[] = [];
    for (let i = 0; i < 30; i++) {
      const obj = new Object3D();
      obj.rigidBody = new RigidBody(1);
      // Place them far apart
      obj.position.set(i * 10, 0, i * 10);
      obj.bounds = new BoundingSphere(obj.position, 1.0);
      scene.add(obj);
      bodies.push(obj);
    }

    // Pair 1: explicitly colliding
    bodies[0]!.position.set(0, 0, 0);
    bodies[1]!.position.set(0.5, 0, 0);
    bodies[0]!.rigidBody!.velocity.set(1, 0, 0);
    bodies[1]!.rigidBody!.velocity.set(-1, 0, 0);

    // Pair 2: explicitly colliding far away
    bodies[20]!.position.set(200, 0, 200);
    bodies[21]!.position.set(200.5, 0, 200);
    bodies[20]!.rigidBody!.velocity.set(1, 0, 0);
    bodies[21]!.rigidBody!.velocity.set(-1, 0, 0);

    // Only these 2 pairs should be processed and bounce.
    system.fixedTimeStep = 0.1;
    system.fixedTimeStep = 0.1;
    system.step(scene, 0.1);

    // Check Pair 1
    expect(bodies[0]!.position.x).toBeLessThan(0); // bounced left
    expect(bodies[1]!.position.x).toBeGreaterThan(0.5); // bounced right

    // Check Pair 2
    expect(bodies[20]!.position.x).toBeLessThan(200);
    expect(bodies[21]!.position.x).toBeGreaterThan(200.5);

    // Check others didn't move (e.g. index 10)
    expect(bodies[10]!.position.x).toBe(100);
  });

  it("should correctly resolve objects that fall into the broadphase fallback list (Boundary Edge Case)", async () => {
    const s1 = new Object3D();
    s1.rigidBody = new RigidBody(1);
    s1.position.set(0, 0, 0);
    s1.bounds = new BoundingSphere(s1.position, 1.0);

    const s2 = new Object3D();
    s2.rigidBody = new RigidBody(1);
    s2.position.set(0.5, 0, 0);
    s2.bounds = new BoundingSphere(s2.position, 1.0);

    scene.add(s1, s2);

    s1.rigidBody.velocity.set(1, 0, 0);
    s2.rigidBody.velocity.set(-1, 0, 0);

    // Mock Octree to reject s2, forcing it into _broadphaseFallback
    const { Octree } = await import("../../src/core/Octree.js");
    const originalInsert = Octree.prototype.insert;
    Octree.prototype.insert = function (obj: import("../../src/interfaces/index.js").Collidable) {
      if (obj === s2) return false;
      return originalInsert.call(this, obj);
    };

    system.fixedTimeStep = 0.1;
    system.fixedTimeStep = 0.1;
    system.step(scene, 0.1);

    Octree.prototype.insert = originalInsert;

    // The collision should still resolve because s2 is in the fallback list!
    expect(s1.position.x).toBeLessThan(0);
    expect(s2.position.x).toBeGreaterThan(0.5);
  });
});
