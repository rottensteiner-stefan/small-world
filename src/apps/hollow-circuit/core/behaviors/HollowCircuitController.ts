import {
  FirstPersonController,
  FirstPersonControllerOptions,
  Scene,
  EventDispatcherImpl,
} from "../../../../core/index.js";
import { Vector3D } from "../../../../math/index.js";
import { Keys } from "../../../../enums/index.js";
import { Events } from "../../Events.js";
import { HollowCircuitObjectTags } from "../../enums/HollowCircuitObjectTags.js";
import { WispBehavior } from "./WispBehavior.js";
import { FrostglassPanelBehavior } from "./FrostglassPanelBehavior.js";

/** An XZ rectangle where the floor simply doesn't exist -- walk in, and you fall. */
export interface VoidZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface HollowCircuitControllerOptions extends FirstPersonControllerOptions {
  scene: Scene;
  /** Where the player respawns after falling through a VoidZone. */
  spawnPoint: Vector3D;
  /** Regions with no floor. Entering one at ground height starts a fall. */
  voidZones?: VoidZone[];
  /** How close a Disc/Wisp needs to be (in world units) to register contact. Defaults to 1.5. */
  contactRadius?: number;
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
 * mode) plus Disc pickups, Wisp contact, Clarity Pulse, and falling through undefended
 * VoidZones.
 */
export class HollowCircuitController extends FirstPersonController {
  private _hcOptions: Required<
    Pick<
      HollowCircuitControllerOptions,
      | "contactRadius"
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

  constructor(
    private events: EventDispatcherImpl,
    options: HollowCircuitControllerOptions,
  ) {
    super({ ...options, retroTankControls: true });
    this._scene = options.scene;
    this._spawnPoint = options.spawnPoint;
    this._voidZones = options.voidZones ?? [];
    this._hcOptions = {
      contactRadius: options.contactRadius ?? 1.5,
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

    this._updateFalling(deltaTime);
    this._checkDiscsAndWisps();
    this._updateClarityRecharge(deltaTime);

    if (this._pulseCooldownTimer > 0) this._pulseCooldownTimer -= deltaTime;
    if (this._pulseCooldownTimer <= 0 && this._options.input.isPressed(Keys.E)) {
      this._pulseCooldownTimer = HollowCircuitController._PULSE_INPUT_COOLDOWN;
      this._tryClarityPulse();
    }
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

  private _checkDiscsAndWisps(): void {
    const playerPos = this.target!.position;
    const radiusSq = this._hcOptions.contactRadius * this._hcOptions.contactRadius;

    for (const obj of this._scene.objects) {
      if (!obj.isVisible) continue;

      const dx = obj.position.x - playerPos.x;
      const dz = obj.position.z - playerPos.z;
      if (dx * dx + dz * dz > radiusSq) continue;

      if (obj.tag === HollowCircuitObjectTags.DISC) {
        obj.isVisible = false;
        obj.isCollidable = false;
        this.events.dispatchEvent(Events.DISC_COLLECTED, {});
      } else if (obj.tag === HollowCircuitObjectTags.WISP) {
        const wisp = obj.behaviors.find((b) => b instanceof WispBehavior) as
          | WispBehavior
          | undefined;
        if (wisp && wisp.canBeStruck) {
          wisp.strike();
          this.events.dispatchEvent(Events.WISP_CONTACT, {});
        }
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

  private _tryClarityPulse(): void {
    if (this.clarityCharges <= 0) return;

    const playerPos = this.target!.position;
    const radiusSq = this._hcOptions.clarityPulseRadius * this._hcOptions.clarityPulseRadius;
    let hitAny = false;

    for (const obj of this._scene.objects) {
      if (obj.tag !== HollowCircuitObjectTags.FROSTGLASS) continue;

      const dx = obj.position.x - playerPos.x;
      const dy = obj.position.y - playerPos.y;
      const dz = obj.position.z - playerPos.z;
      if (dx * dx + dy * dy + dz * dz > radiusSq) continue;

      const panel = obj.behaviors.find((b) => b instanceof FrostglassPanelBehavior) as
        | FrostglassPanelBehavior
        | undefined;
      if (panel) {
        panel.reveal(this._hcOptions.clarityPulseDuration);
        hitAny = true;
      }
    }

    if (hitAny) {
      this.clarityCharges--;
      this.events.dispatchEvent(Events.CLARITY_PULSE, {});
    }
  }
}
