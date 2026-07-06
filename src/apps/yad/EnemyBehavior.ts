/// src/apps/yad/EnemyBehavior.ts

import { Behavior } from "../../core/behaviors/Behavior.js";
import { Object3D } from "../../core/Object3D.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { Scene } from "../../core/Scene.js";
import { BoundingSphere, Collision, BoundingBox } from "../../physix/index.js";
import { MathPool } from "../../math/index.js";

export interface EnemyBehaviorOptions {
  player: CameraInterfaceData;
  scene: Scene;
  speed?: number;
  detectionRange?: number;
}

export class EnemyBehavior extends Behavior {
  private _player: CameraInterfaceData;
  private _scene: Scene;
  private _speed: number;
  private _detectionRange: number;
  private _collider?: BoundingSphere;

  constructor(options: EnemyBehaviorOptions) {
    super();
    this._player = options.player;
    this._scene = options.scene;
    this._speed = options.speed ?? 3.0;
    this._detectionRange = options.detectionRange ?? 20.0;
  }

  public override onAttach(target: Object3D): void {
    super.onAttach(target);
    this._collider = new BoundingSphere(target.position.clone(), 0.5);
  }

  public override update(deltaTime: number): void {
    if (!this.target || (this.target as Object3D).name === "DeadEnemy") return;

    const dx = this._player.position.x - this.target.position.x;
    const dz = this._player.position.z - this.target.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > this._detectionRange || distance < 1.5) {
      return; // Too far away or already close enough to attack
    }

    // Move towards player
    const nx = dx / distance;
    const nz = dz / distance;

    this.target.position.x += nx * this._speed * deltaTime;
    this.target.position.z += nz * this._speed * deltaTime;

    // Resolve collisions
    this._resolveCollisions();
  }

  private _resolveCollisions(): void {
    if (!this.target || !this._collider) return;
    this._collider.center.copyFrom(this.target.position);
    this._collider.center.y += 0.5; // Offset slightly up

    const potentialHits: Object3D[] = [];
    if (this._scene.staticOctree)
      potentialHits.push(...this._scene.staticOctree.queryVolume(this._collider));

    const correction = MathPool.acquireVector().set(0, 0, 0);
    const hitCorrection = MathPool.acquireVector();

    for (const obj of potentialHits) {
      if (!obj.bounds || obj === this.target) continue;
      if (Collision.resolveSphereBox(this._collider, obj.bounds as BoundingBox, hitCorrection)) {
        correction.add(hitCorrection);
        this._collider.center.add(hitCorrection); // update sphere center iteratively
      }
    }

    this.target.position.add(correction);
    MathPool.releaseVector(correction);
    MathPool.releaseVector(hitCorrection);
  }
}
