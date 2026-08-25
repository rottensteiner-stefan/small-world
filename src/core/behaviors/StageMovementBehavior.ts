import { Behavior } from "./Behavior.js";
import { Object3D } from "../Object3D.js";
import { InputInterface } from "../Input.js";
import { StageZone } from "../stage/StageZone.js";
import { Keys } from "../../enums/index.js";

/** A world-space position for a given (u, v) stage coordinate -- see `uvToWorld`. */
export interface StageWorldPlacement {
  x: number;
  y: number;
  z: number;
}

/**
 * Configuration options for StageMovementBehavior.
 */
export interface StageMovementBehaviorOptions {
  /** Input interface to query keys. */
  input: InputInterface;
  /** Movement speed in normalized stage-space (u, v) units per second (default: 0.15). */
  speed?: number;
  /** Rotation smoothing speed in radians per second (default: 10.0). */
  rotationSpeed?: number;
  /** Walkable stage zones defining the navigation mesh, in normalized (u, v) space. */
  zones?: StageZone[];
  /**
   * Converts a normalized stage-space (u, v) position into a world placement for rendering.
   * Deliberately NOT a camera unprojection -- a simple, fixed, artist-tunable formula (e.g.
   * linear), so dragging zone points on screen never risks the numerical blowup a real
   * perspective inverse has near the camera's horizon.
   */
  uvToWorld: (u: number, v: number) => StageWorldPlacement;
  /** Starting stage-space position (default: `{ u: 0.5, v: 0.5 }`). */
  startUV?: { u: number; v: number };
  /** Callback fired when character transitions between IDLE and WALK. */
  onStateChange?: (state: "IDLE" | "WALK") => void;
  /** Callback fired when character moves into a different stage zone. */
  onZoneChange?: (zone: StageZone) => void;
}

/**
 * Behavior providing 2.5D stage character locomotion entirely in normalized (u, v) stage-space:
 * zone containment, forced-perspective scale, and local movement axes are all plain 2D polygon
 * math traced directly on the background art. `uvToWorld` is the only place a 3D world position
 * is ever produced, and it's a fixed, simple formula -- there is no camera-based reconstruction
 * anywhere in this class.
 */
export class StageMovementBehavior extends Behavior {
  public enabled: boolean = true;
  public speed: number;
  public rotationSpeed: number;
  public zones: StageZone[];
  public activeZone: StageZone | undefined;
  public onStateChange: ((state: "IDLE" | "WALK") => void) | undefined;
  public onZoneChange: ((zone: StageZone) => void) | undefined;

  private _input: InputInterface;
  private _uvToWorld: (u: number, v: number) => StageWorldPlacement;
  private _u: number;
  private _v: number;
  private _state: "IDLE" | "WALK" = "IDLE";
  private _targetAngle: number = 0;
  private _initialized: boolean = false;

  constructor(options: StageMovementBehaviorOptions) {
    super();
    this._input = options.input;
    this.speed = options.speed ?? 0.15;
    this.rotationSpeed = options.rotationSpeed ?? 10.0;
    this.zones = options.zones ?? [];
    this._uvToWorld = options.uvToWorld;
    this._u = options.startUV?.u ?? 0.5;
    this._v = options.startUV?.v ?? 0.5;
    this.onStateChange = options.onStateChange;
    this.onZoneChange = options.onZoneChange;
  }

  public get state(): "IDLE" | "WALK" {
    return this._state;
  }

  /** Current stage-space position. */
  public get uv(): { u: number; v: number } {
    return { u: this._u, v: this._v };
  }

  public override update(deltaTime: number): void {
    if (!this.enabled || !this.target || !(this.target instanceof Object3D)) {
      return;
    }

    const obj = this.target;

    if (!this._initialized) {
      this._initialized = true;
      this.activeZone = this._findZone(this._u, this._v) ?? this.zones[0];
      this._applyPlacement(obj);
      if (this.activeZone) this.onZoneChange?.(this.activeZone);
    }

    // 1. Gather directional input (WASD + Arrow Keys) in zone-local stage space
    let moveRight = this._input.getAxis(Keys.A, Keys.D);
    if (this._input.isPressed(Keys.LEFT)) moveRight -= 1;
    if (this._input.isPressed(Keys.RIGHT)) moveRight += 1;

    // W / UP moves along the active zone's own "forward" axis (deeper into the painted
    // corridor), S / DOWN moves back along it -- resolved per zone (see
    // StageZone.getLocalAxes), not a fixed stage direction, since a zone traced onto a
    // perspective background is rarely axis-aligned.
    let moveForward = 0;
    if (this._input.isPressed(Keys.W) || this._input.isPressed(Keys.UP)) moveForward += 1;
    if (this._input.isPressed(Keys.S) || this._input.isPressed(Keys.DOWN)) moveForward -= 1;

    const lenSq = moveRight * moveRight + moveForward * moveForward;
    const isMoving = lenSq > 0.01;

    // 2. Handle Locomotion State
    const nextState = isMoving ? "WALK" : "IDLE";
    if (nextState !== this._state) {
      this._state = nextState;
      this.onStateChange?.(this._state);
    }

    if (isMoving) {
      const invLen = 1.0 / Math.sqrt(lenSq);
      const localRight = moveRight * invLen;
      const localForward = moveForward * invLen;

      const axes = (this.activeZone ?? this.zones[0])?.getLocalAxes() ?? {
        forward: { u: 0, v: -1 },
        right: { u: 1, v: 0 },
      };
      const dirU = axes.right.u * localRight + axes.forward.u * localForward;
      const dirV = axes.right.v * localRight + axes.forward.v * localForward;

      // 3. Calculate desired next stage-space position
      const desiredU = this._u + dirU * this.speed * deltaTime;
      const desiredV = this._v + dirV * this.speed * deltaTime;

      // 4. Zone containment and slide collision check
      let targetZone = this._findZone(desiredU, desiredV);
      let nextU = this._u;
      let nextV = this._v;

      if (targetZone) {
        nextU = desiredU;
        nextV = desiredV;
      } else {
        // Slide along U
        const slideUZone = this._findZone(desiredU, this._v);
        if (slideUZone) {
          nextU = desiredU;
          targetZone = slideUZone;
        } else {
          // Slide along V
          const slideVZone = this._findZone(this._u, desiredV);
          if (slideVZone) {
            nextV = desiredV;
            targetZone = slideVZone;
          }
        }
      }

      // 5. Smooth rotation towards the resulting world-space movement direction (computed via
      // uvToWorld, so it reflects whatever depth cue that mapping gives -- not a stage-space
      // angle, since (u, v) alone has no notion of "facing").
      const beforeWorld = this._uvToWorld(this._u, this._v);
      const afterWorld = this._uvToWorld(nextU, nextV);
      const worldDx = afterWorld.x - beforeWorld.x;
      const worldDz = afterWorld.z - beforeWorld.z;
      if (worldDx * worldDx + worldDz * worldDz > 0.000001) {
        this._targetAngle = Math.atan2(worldDx, worldDz);
      }
      let angleDiff = this._targetAngle - obj.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const step =
        Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.rotationSpeed * deltaTime);
      obj.rotation.y += step;

      this._u = nextU;
      this._v = nextV;
      this._applyPlacement(obj);

      // 6. Notify on zone change
      if (targetZone && targetZone !== this.activeZone) {
        this.activeZone = targetZone;
        this.onZoneChange?.(this.activeZone);
      }
    }
  }

  /** Writes the current (u, v) position and forced-perspective scale onto the target object. */
  private _applyPlacement(obj: Object3D): void {
    const placement = this._uvToWorld(this._u, this._v);
    obj.position.set(placement.x, placement.y, placement.z);
    const s = this.activeZone?.getScaleAt(this._u, this._v) ?? 1.0;
    obj.scale.set(s, s, s);
  }

  /**
   * Finds the StageZone containing the given (u, v) coordinates.
   */
  private _findZone(u: number, v: number): StageZone | undefined {
    if (this.zones.length === 0) return undefined;
    // 1. Exact containment test
    for (const zObj of this.zones) {
      if (zObj.containsPoint(u, v)) {
        return zObj;
      }
    }
    // 2. Edge tolerance fallback for smooth transition across adjoining zone boundaries
    for (const zObj of this.zones) {
      if (zObj.containsPoint(u, v, 0.015)) {
        return zObj;
      }
    }
    return undefined;
  }
}
