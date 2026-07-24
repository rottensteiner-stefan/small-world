import { Behavior } from '../../core/behaviors/index.js';
import { Object3D, Scene } from '../../core/index.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
import { AudioSystem } from '../../audio/index.js';
export interface EnemyBehaviorOptions {
    player: CameraInterfaceData;
    scene: Scene;
    audio?: AudioSystem | undefined;
    speed?: number;
    detectionRange?: number;
}
export declare class EnemyBehavior extends Behavior {
    private _player;
    private _scene;
    private _speed;
    private _detectionRange;
    private _collider?;
    private _potentialHits;
    private _audio?;
    private _gruntTimer;
    constructor(options: EnemyBehaviorOptions);
    onAttach(target: Object3D): void;
    update(deltaTime: number): void;
    private _resolveCollisions;
}
