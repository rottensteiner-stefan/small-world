import {
  FirstPersonController,
  FirstPersonControllerOptions,
  Scene,
  EventDispatcherImpl,
  Object3D,
} from "../../../../core/index.js";
import { Vector3D } from "../../../../math/index.js";
import { Keys } from "../../../../enums/index.js";
import { Events } from "../../Events.js";
import { ObjectTags } from "../../enums/ObjectTags.js";
import { FrostglassMaterial } from "../../../../core/materials/FrostglassMaterial.js";
import { Easing } from "../../../../math/Easing.js";

/** An XZ rectangle where the floor simply doesn't exist -- walk in, and you fall. */
export interface VoidZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ControllerOptions extends FirstPersonControllerOptions {
  scene: Scene;
  /** Where the player respawns after falling through a VoidZone. */
  spawnPoint: Vector3D;
  /** Regions with no floor. Entering one at ground height starts a fall. */
  voidZones?: VoidZone[];
  /** How close a Frostglass panel needs to be to catch a Clarity Pulse. Defaults to 6.0. */
  clarityPulseRadius?: number;
  /** How long a Clarity Pulse keeps a panel revealed, in seconds. Defaults to 1.4. */
  clarityPulseDuration?: number;
  /** Charges in the Clarity Pulse "clip". Defaults to 3. */
  clarityPulseMaxCharges?: number;
  /** Seconds to regenerate one charge. Defaults to 4.0. */
  clarityPulseRechargeSeconds?: number;
}

const GRAVITY = 18.0;
const FALL_RESET_DEPTH = 15.0;

/**
 * The Hollow Circuit player controller: retro tank-style movement (W/S forward-back,
 * A/D turn, same as YAD -- no strafing, FirstPersonController doesn't have any in tank
 * mode) plus Clarity Pulse and falling through undefended VoidZones. Disc pickup and
 * Wisp contact are NOT handled here -- they're `ProximitySensorBehavior`s attached
 * directly to each Disc/Wisp in App.ts, the same idiom YAD's own LevelBuilder already
 * uses for doors, instead of a second full-scene scan living in the controller.
 */
export class Controller extends FirstPersonController {
  private _hcOptions: Required<
    Pick<
      ControllerOptions,
      | "clarityPulseRadius"
      | "clarityPulseDuration"
      | "clarityPulseMaxCharges"
      | "clarityPulseRechargeSeconds"
    >
  >;
  private _scene: Scene;
  private _spawnPoint: Vector3D;
  private _voidZones: VoidZone[];

  private _fallVelocityY: number = 0;
  private _isFalling: boolean = false;

  public clarityCharges: number;
  private _rechargeTimer: number = 0;
  private _pulseCooldownTimer: number = 0;
  private static readonly _PULSE_INPUT_COOLDOWN = 0.4;

  private _pulseActive: boolean = false;
  private _pulseTimer: number = 0;
  private _pulsePos: Vector3D = new Vector3D();

  private _godMode: boolean = false;
  private _wasGPressed: boolean = false;
  /** Frostglass-tagged panels, scanned from the scene once and cached -- lazily, since
   *  the scene may still be under construction when this controller is built. */
  private _frostglassPanels?: Object3D[];

  constructor(
    private events: EventDispatcherImpl,
    options: ControllerOptions,
  ) {
    super({ ...options, retroTankControls: true });
    this._scene = options.scene;
    this._spawnPoint = options.spawnPoint;
    this._voidZones = options.voidZones ?? [];
    this._hcOptions = {
      clarityPulseRadius: options.clarityPulseRadius ?? 6.0,
      clarityPulseDuration: options.clarityPulseDuration ?? 1.4,
      clarityPulseMaxCharges: options.clarityPulseMaxCharges ?? 3,
      clarityPulseRechargeSeconds: options.clarityPulseRechargeSeconds ?? 4.0,
    };
    this.clarityCharges = this._hcOptions.clarityPulseMaxCharges;
  }

  public override update(deltaTime: number): void {
    if (!this.enabled || !this.target) return;

    super.update(deltaTime);

    const isGPressed = this._options.input.isPressed(Keys.G);
    if (isGPressed && !this._wasGPressed) {
      this._godMode = !this._godMode;
      this._options.enableCollision = !this._godMode;
      if (this._godMode) {
        this._isFalling = false;
        this._fallVelocityY = 0;
        console.log("[HollowCircuit] God Mode ENABLED: Collision off, use Q/E to fly up/down.");
      } else {
        console.log("[HollowCircuit] God Mode DISABLED.");
      }
    }
    this._wasGPressed = isGPressed;

    if (!this._godMode) {
      this._updateFalling(deltaTime);
    }
    this._updateClarityRecharge(deltaTime);

    if (this._pulseCooldownTimer > 0) this._pulseCooldownTimer -= deltaTime;
    if (
      this._pulseCooldownTimer <= 0 &&
      (this._options.input.isPressed(Keys.E) || this._options.input.mouse.left)
    ) {
      this._pulseCooldownTimer = Controller._PULSE_INPUT_COOLDOWN;
      this._tryClarityPulse();
    }

    this._updateClarityPulseEffect(deltaTime);
  }

  private _updateFalling(deltaTime: number): void {
    const pos = this.target!.position;

    if (!this._isFalling) {
      for (const zone of this._voidZones) {
        if (pos.x >= zone.minX && pos.x <= zone.maxX && pos.z >= zone.minZ && pos.z <= zone.maxZ) {
          this._isFalling = true;
          this._fallVelocityY = 0;
          break;
        }
      }
    }

    if (this._isFalling) {
      this._fallVelocityY -= GRAVITY * deltaTime;
      pos.y += this._fallVelocityY * deltaTime;

      if (pos.y < this._spawnPoint.y - FALL_RESET_DEPTH) {
        pos.copyFrom(this._spawnPoint);
        this._isFalling = false;
        this._fallVelocityY = 0;
        this.events.dispatchEvent(Events.FELL, {});
      }
    }
  }

  private _updateClarityRecharge(deltaTime: number): void {
    if (this.clarityCharges >= this._hcOptions.clarityPulseMaxCharges) return;
    this._rechargeTimer += deltaTime;
    if (this._rechargeTimer >= this._hcOptions.clarityPulseRechargeSeconds) {
      this._rechargeTimer = 0;
      this.clarityCharges++;
    }
  }

  private _updateClarityPulseEffect(deltaTime: number): void {
    if (!this._pulseActive) return;

    this._pulseTimer += deltaTime;
    const duration = this._hcOptions.clarityPulseDuration;

    let radius: number;
    if (this._pulseTimer >= duration) {
      this._pulseActive = false;
      radius = 0.0;
    } else {
      const half = duration / 2.0;
      if (this._pulseTimer < half) {
        const t = this._pulseTimer / half;
        radius = Easing.easeOutQuad(t) * this._hcOptions.clarityPulseRadius;
      } else {
        const t = (this._pulseTimer - half) / half;
        radius = (1.0 - Easing.easeInQuad(t)) * this._hcOptions.clarityPulseRadius;
      }
    }

    for (const panel of this._getFrostglassPanels()) {
      if (!(panel.material instanceof FrostglassMaterial)) continue;
      panel.material.clarityPulseCenter.copyFrom(this._pulsePos);
      panel.material.clarityPulseRadius = radius;
    }
  }

  private _tryClarityPulse(): void {
    if (this.clarityCharges <= 0) return;
    if (!this._hasFrostglassPanelInRange(this.target!.position)) return;

    this.clarityCharges--;
    this._pulseActive = true;
    this._pulseTimer = 0;
    this._pulsePos.copyFrom(this.target!.position);

    this.events.dispatchEvent(Events.CLARITY_PULSE, {});
  }

  private _hasFrostglassPanelInRange(playerPos: Vector3D): boolean {
    const radiusSq = this._hcOptions.clarityPulseRadius * this._hcOptions.clarityPulseRadius;

    for (const panel of this._getFrostglassPanels()) {
      const dx = panel.position.x - playerPos.x;
      const dy = panel.position.y - playerPos.y;
      const dz = panel.position.z - playerPos.z;
      if (dx * dx + dy * dy + dz * dz <= radiusSq) return true;
    }

    return false;
  }

  private _getFrostglassPanels(): Object3D[] {
    if (!this._frostglassPanels) {
      this._frostglassPanels = this._scene.objects.filter(
        (obj) => obj.tag === ObjectTags.FROSTGLASS,
      );
    }
    return this._frostglassPanels;
  }
}
