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
  /** World-space height of one floor, used by the Void Catch skill move to land the
   *  player exactly one floor down. Must match LevelBuilder's own height. Defaults to 4.0. */
  floorHeight?: number;
}

const GRAVITY = 18.0;
const FALL_RESET_DEPTH = 15.0;
/** How far a fraction of one floor's height counts as "just started falling" -- past this,
 *  a Void Catch attempt is too late and the fall continues to full FALL_RESET_DEPTH. */
const VOID_CATCH_FALL_FRACTION = 0.7;
/** Horizontal speed a Wisp strike shoves the player at; see Controller.applyKnockback. */
const WISP_KNOCKBACK_SPEED = 9.0;
/** Exponential per-second falloff for knockback velocity -- gives the shove weight
 *  (Mirror's Edge momentum) instead of an instant teleport. */
const KNOCKBACK_DECAY = 6.0;

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
  private static readonly _GROUND_SNAP_EPSILON = 0.0005;

  private _fallStartY: number = 0;
  private _floorHeight: number;
  private _knockbackVelocity: Vector3D = new Vector3D();

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
    this._floorHeight = options.floorHeight ?? 4.0;
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

    const preCollisionY = this.target.position.y;
    super.update(deltaTime);

    // FirstPersonController's own collision step (inside super.update()) only ever
    // pushes the sphere collider OUT of solid geometry -- it never pushes it down. So
    // an upward correction here means something solid is holding the player up this
    // frame: they're grounded, and any fall in progress just ended. Without this check,
    // _isFalling (see _updateFalling below) never resets while standing on solid floor
    // -- the "big fallback void zone" covers the whole map, so it flips true on frame 1
    // and _fallVelocityY then grows unbounded forever, every single frame, even while
    // just standing still. After ~3s it's large enough that one frame's fall distance
    // tunnels clean through a floor plate before collision ever detects the overlap,
    // silently teleporting the player back to spawn for no reason.
    if (
      !this._godMode &&
      this.target.position.y > preCollisionY + Controller._GROUND_SNAP_EPSILON
    ) {
      this._isFalling = false;
      this._fallVelocityY = 0;
    }

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

    if (this._godMode) {
      let moveY: number = 0;
      if (this._options.input.isPressed(Keys.E)) {
        moveY += 1;
      }
      if (this._options.input.isPressed(Keys.Q)) {
        moveY -= 1;
      }
      if (moveY !== 0) {
        this.target!.position.y += moveY * this._options.moveSpeed * deltaTime;
      }
    } else {
      this._updateFalling(deltaTime);
      this._updateKnockback(deltaTime);
    }
    this._updateClarityRecharge(deltaTime);

    if (this._pulseCooldownTimer > 0) this._pulseCooldownTimer -= deltaTime;
    if (
      !this._godMode &&
      this._pulseCooldownTimer <= 0 &&
      (this._options.input.isPressed(Keys.E) || this._options.input.mouse.left)
    ) {
      this._pulseCooldownTimer = Controller._PULSE_INPUT_COOLDOWN;
      // Same input either fires a Clarity Pulse to reveal Frostglass, or -- if it lands
      // during the brief window right after a fall begins -- a Void Catch: Bloomsight
      // reveals a ledge one floor down and the player grabs it instead of falling further.
      if (this._isFalling) {
        this._tryVoidCatch();
      } else {
        this._tryClarityPulse();
      }
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
          this._fallStartY = pos.y;
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

  /**
   * The Void Catch skill move: land exactly one floor below where the fall started,
   * instead of continuing to FALL_RESET_DEPTH. Only works early in the fall (see
   * VOID_CATCH_FALL_FRACTION) and only when there's actually a floor to catch --
   * ground-floor voids have nothing beneath them and stay a pure, punishing fall.
   */
  private _tryVoidCatch(): void {
    if (this.clarityCharges <= 0) return;

    const pos = this.target!.position;
    const fallenDistance = this._fallStartY - pos.y;
    if (fallenDistance > this._floorHeight * VOID_CATCH_FALL_FRACTION) return;

    const landingY = this._fallStartY - this._floorHeight;
    if (landingY < this._spawnPoint.y - 1.0) return;

    this.clarityCharges--;
    this._isFalling = false;
    this._fallVelocityY = 0;
    pos.y = landingY;

    this.events.dispatchEvent(Events.VOID_CAUGHT, {});
  }

  /** Shoves the player horizontally -- e.g. a Wisp strike. Decays over ~KNOCKBACK_DECAY
   *  seconds rather than teleporting outright, so it reads as momentum, not a cut. If it
   *  happens to carry the player onto a void tile, the existing fall/Void Catch loop takes
   *  over from there -- this is the coupling between the two hazards. */
  public applyKnockback(directionXZ: Vector3D, speed: number = WISP_KNOCKBACK_SPEED): void {
    if (this._godMode) return;
    this._knockbackVelocity.x = directionXZ.x * speed;
    this._knockbackVelocity.z = directionXZ.z * speed;
  }

  private _updateKnockback(deltaTime: number): void {
    if (this._knockbackVelocity.x === 0 && this._knockbackVelocity.z === 0) return;

    const pos = this.target!.position;
    pos.x += this._knockbackVelocity.x * deltaTime;
    pos.z += this._knockbackVelocity.z * deltaTime;

    const decay = Math.exp(-KNOCKBACK_DECAY * deltaTime);
    this._knockbackVelocity.x *= decay;
    this._knockbackVelocity.z *= decay;
    if (Math.abs(this._knockbackVelocity.x) < 0.01) this._knockbackVelocity.x = 0;
    if (Math.abs(this._knockbackVelocity.z) < 0.01) this._knockbackVelocity.z = 0;
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
