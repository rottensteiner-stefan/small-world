import { Behavior } from "./Behavior.js";
import { Object3D } from "../index.js";
import { StandardMaterial } from "../materials/index.js";

/**
 * A gamification behavior that scales up the object and adds a glow when hovered.
 */
export class HoverBehavior extends Behavior {
  private _targetScale: number = 1.0;
  private _currentScale: number = 1.0;
  private _baseScale: number = 1.0;
  private _hoverMultiplier: number = 1.5;

  constructor(hoverMultiplier: number = 1.5) {
    super();
    this._hoverMultiplier = hoverMultiplier;
  }

  public override onAttach(target: Object3D): void {
    super.onAttach(target);
    target.isPickable = true;
    this._baseScale = target.scale.x;
    this._currentScale = this._baseScale;
    this._targetScale = this._baseScale;

    // Clone the material before ever mutating it: many callers share one material instance
    // across a large batch of objects (e.g. an instanced grid) for performance, and directly
    // tinting a shared material's emissive properties would visibly glow every object using it,
    // not just the one actually hovered.
    if (target.material instanceof StandardMaterial) {
      target.material = target.material.clone();
    }

    target.onPointerEnter = (): void => {
      this._targetScale = this._baseScale * this._hoverMultiplier;
      if (target.material instanceof StandardMaterial) {
        target.material.emissiveColor.set(0.2, 0.5, 1.0); // Glow blue
        target.material.emissiveIntensity = 2.0;
      }
    };

    target.onPointerLeave = (): void => {
      this._targetScale = this._baseScale;
      if (target.material instanceof StandardMaterial) {
        target.material.emissiveColor.set(0, 0, 0); // No glow
        target.material.emissiveIntensity = 1.0;
      }
    };
  }

  public override update(deltaTime: number): void {
    if (!this.target || !(this.target instanceof Object3D)) return;

    // Smooth dampening for scale
    const diff = this._targetScale - this._currentScale;
    if (Math.abs(diff) > 0.001) {
      this._currentScale += diff * 15.0 * deltaTime;
      this.target.setScale(this._currentScale);
    } else {
      this._currentScale = this._targetScale;
      this.target.setScale(this._currentScale);
    }
  }
}
