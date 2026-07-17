import { Behavior, Object3D, Vector3D, Scene, Sphere, StandardMaterial } from "../../src/index.js";

// Static round-robin counter to ensure all 4 corners spawn drones equally
let cornerSpawnIndex = 0;

export class DroneController extends Behavior {
  private _scene: Scene;
  private _speed: number = 20.0;
  private _direction: Vector3D = new Vector3D(1, 0, 0);

  // The allowed directions for this specific drone to ensure it moves ACROSS the board
  private _allowedDirX: number = 1;
  private _allowedDirZ: number = 1;

  private _trailTimer: number = 0;
  private _trailInterval: number = 0.05;

  private _trails: Object3D[] = [];
  private _trailIndex: number = 0;

  private _distanceMoved: number = 0;

  constructor(scene: Scene, sharedMaterial: StandardMaterial) {
    super();
    this._scene = scene;

    // Create the geometry once
    const sharedGeometry = new Sphere({
      radius: 0.15,
      widthSegments: 8,
      heightSegments: 8,
    }).getGeometryData();

    // Pre-allocate 20 trail objects per drone to avoid GC / slowdowns!
    for (let i = 0; i < 20; i++) {
      const trail = new Object3D("DroneTrail");
      trail.geometry = sharedGeometry;
      trail.material = sharedMaterial;
      trail.isVisible = false; // Using isVisible avoids massive draw calls!
      trail.isCollidable = false; // Trails are purely visual and should NEVER enter the physics engine!

      this._trails.push(trail);
      this._scene.add(trail);
    }
  }

  public override update(deltaTime: number): void {
    if (!this.target) return;
    const obj = this.target as Object3D;

    // Out of bounds -> Respawn at corners (bounds extended to 34)
    // Using > 34.1 so it doesn't instantly trigger when spawning at exactly 34.0
    if (Math.abs(obj.position.x) > 34.1 || Math.abs(obj.position.z) > 34.1) {
      this._respawn(obj);
    }

    // Move
    const dist = this._speed * deltaTime;
    obj.position.x += this._direction.x * dist;
    obj.position.z += this._direction.z * dist;
    this._distanceMoved += dist;

    // Grid alignment check (turn every 4 units)
    if (this._distanceMoved >= 4.0) {
      this._distanceMoved -= 4.0;

      // Correct any floating point drift ONLY on the axis we are currently moving on
      // This prevents the stationary off-grid axis (e.g. 34.0) from being rounded to 36.0 (out of bounds)
      if (Math.abs(this._direction.x) > 0) {
        obj.position.x = Math.round(obj.position.x / 4.0) * 4.0;
      } else {
        obj.position.z = Math.round(obj.position.z / 4.0) * 4.0;
      }

      // 30% chance to turn.
      // We ONLY turn in the allowed directions so the drone stair-steps to the opposite corner!
      if (Math.random() < 0.3) {
        if (Math.abs(this._direction.x) > 0) {
          this._direction.set(0, 0, this._allowedDirZ);
        } else {
          this._direction.set(this._allowedDirX, 0, 0);
        }
      }
    }

    // Update existing trails (shrink them)
    const shrink = 1.0 - 4.0 * deltaTime;
    for (const trail of this._trails) {
      if (trail.isVisible) {
        trail.scale.x *= shrink;
        trail.scale.y *= shrink;
        trail.scale.z *= shrink;
        if (trail.scale.x <= 0.001) {
          trail.isVisible = false;
        }
      }
    }

    // Spawn new trail segment
    this._trailTimer += deltaTime;
    if (this._trailTimer >= this._trailInterval) {
      this._trailTimer -= this._trailInterval;

      const trailObj = this._trails[this._trailIndex]!;
      trailObj.position.copyFrom(obj.position);
      // Drop it slightly lower than the drone's hover height (but stay visible!)
      trailObj.position.y -= 0.15;
      trailObj.scale.set(1, 1, 1);
      trailObj.isVisible = true;

      this._trailIndex = (this._trailIndex + 1) % this._trails.length;
    }
  }

  private _respawn(obj: Object3D): void {
    const corners = [
      { x: 34, z: -34 }, // Spawn 1 (Red)
      { x: -34, z: 34 }, // Spawn 2 (Green)
      { x: -34, z: -34 }, // Spawn 3 (Blue)
      { x: 34, z: 34 }, // Spawn 4 (Magenta)
    ];

    // Round-robin selection (will select corners sequentially)
    const corner = corners[cornerSpawnIndex % corners.length]!;
    cornerSpawnIndex++;

    // Set Drone flight altitude to exactly 1.0 (equator of the resting marble)
    obj.position.set(corner.x, 1.0, corner.z);

    // Determine the ONLY allowed directions (always towards the center/opposite corner)
    this._allowedDirX = corner.x > 0 ? -1 : 1;
    this._allowedDirZ = corner.z > 0 ? -1 : 1;

    // Pick initial direction inwards (randomly X or Z axis)
    if (Math.random() > 0.5) {
      this._direction.set(this._allowedDirX, 0, 0);
    } else {
      this._direction.set(0, 0, this._allowedDirZ);
    }

    // Clear all trails when respawning
    for (const trail of this._trails) {
      trail.isVisible = false;
    }

    this._distanceMoved = 0;
  }
}
