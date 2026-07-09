/// src/apps/yad/YadController.ts
import {
  FirstPersonController,
  FirstPersonControllerOptions,
} from "../../core/behaviors/FirstPersonController.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { Input } from "../../core/index.js";
import { Keys } from "../../enums/index.js";
import { Raycaster } from "../../physix/index.js";
import { Vector2D } from "../../math/index.js";
import { AudioSystem } from "../../audio/index.js";

/**
 * A retro style controller for forward/backward movement and left/right rotation.
 * It extends FirstPersonController and adds shooting, weapon selection, and damage logic.
 */
export class YadController extends FirstPersonController {
  private _lastShotTime: number = 0;
  private _lastHurtTime: number = 0;

  /**
   * Creates a new YadController.
   * @param options The configuration options.
   */
  constructor(options: FirstPersonControllerOptions = {}) {
    // Force retro tank controls for DOOM feel
    super({ ...options, retroTankControls: true });
  }

  public override update(deltaTime: number): void {
    if (!this.enabled || !this.target) {
      return;
    }

    // 1. Let the base FirstPersonController handle movement, rotation, bobbing, and collision
    super.update(deltaTime);

    const isCamera = "updateProjectionMatrix" in this.target;

    // 2. Play Footsteps (base class calculates distanceMoved)
    if (this.distanceMoved > 2.0) {
      // Play footstep every 2 units moved
      AudioSystem.instance.play("footstep", false, 0.4);
      this.distanceMoved = 0;
    }

    // 3. Weapon Selection (Keys 1-6)
    for (let i = 1; i <= 6; i++) {
      if (Input.isPressed(i.toString() as Keys) || Input.isPressed(`Digit${i}` as Keys)) {
        this._options.events?.dispatchEvent("yad-weapon", { index: i });
      }
    }

    // 4. Shoot
    const now = performance.now();
    if (Input.isPressed(Keys.SPACE) && now - this._lastShotTime > 500) {
      this._lastShotTime = now;
      AudioSystem.instance.play("shoot", false, 0.6);
      this._options.events?.dispatchEvent("yad-shoot");

      // Raycast for Enemies
      if (this._options.scene && isCamera) {
        const raycaster = new Raycaster();
        const center = new Vector2D(0, 0); // Screen center in NDC
        raycaster.setFromCamera(center, this.target as unknown as CameraInterfaceData);

        // intersectObjects sorts by distance closest to furthest by default
        const intersects = raycaster.intersectObjects(this._options.scene.objects, true);

        for (const intersect of intersects) {
          const obj = intersect.object;

          if (obj.name.startsWith("Enemy") && obj.isVisible && obj.scale.y > 0.5) {
            // HIT AN ENEMY!
            obj.name = "DeadEnemy"; // prevent shooting again
            obj.scale.y = 0.2; // squash to "dead"
            obj.position.y = 0.2; // drop to floor

            // Stop bobbing and other behaviors
            [...obj.behaviors].forEach((b) => obj.removeBehavior(b));

            AudioSystem.instance.playSpatial("enemy_death", obj.position, false, 0.8, 2.0, 20.0);
            break; // Bullet stops at the enemy
          }

          // If we hit a wall or a door first, the bullet stops!
          if (obj.name.startsWith("Wall") || obj.name.startsWith("Door")) {
            break;
          }
        }
      }
    }

    // 5. Environment checks (Pickups & Lava/Slime Damage)
    if (this._options.scene) {
      for (const obj of this._options.scene.objects) {
        // Item Pickup
        if (obj.name.startsWith("Item_") && obj.isVisible) {
          const parts = obj.name.split("_");
          const itemType = parts[1] ?? "unknown";

          const dx = obj.position.x - this.target.position.x;
          const dz = obj.position.z - this.target.position.z;
          if (dx * dx + dz * dz < 2.25) {
            // Within 1.5 units
            obj.isVisible = false;
            // Stop bobbing
            [...obj.behaviors].forEach((b) => obj.removeBehavior(b));
            AudioSystem.instance.play("pickup", false, 0.8);

            // Dispatch custom event for HUD
            this._options.events?.dispatchEvent("yad-pickup", { type: itemType, amount: 20 });
          }
        }

        // Damage (Lava / Slime)
        if (
          (obj.name.startsWith("Floor_Lava_") || obj.name.startsWith("Floor_Slime_")) &&
          now - this._lastHurtTime > 1000
        ) {
          const dx = obj.position.x - this.target.position.x;
          const dz = obj.position.z - this.target.position.z;
          if (dx * dx + dz * dz < 1.0) {
            // Standing right on it
            this._lastHurtTime = now;
            AudioSystem.instance.play("hurt", false, 0.8);

            // Dispatch custom event for HUD
            this._options.events?.dispatchEvent("yad-damage", { amount: 10 });
          }
        }
      }
    }
  }
}
