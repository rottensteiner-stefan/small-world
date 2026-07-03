import { Behavior } from './Behavior.js';
import { Object3D } from '../Object3D.js';
/**
 * A gamification behavior that scales up the object and adds a glow when hovered.
 */
export declare class HoverBehavior extends Behavior {
    private _targetScale;
    private _currentScale;
    private _baseScale;
    private _hoverMultiplier;
    constructor(hoverMultiplier?: number);
    onAttach(target: Object3D): void;
    update(deltaTime: number): void;
}
