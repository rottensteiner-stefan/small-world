import { AbstractExample } from '../index.js';
export declare class Example15 extends AbstractExample {
    private _balls;
    private _largeSpheres;
    private _orbitingLight;
    private _time;
    private _mainBallsMeshes;
    private _floorReflectedMeshes;
    private _sphereReflectedMeshes;
    private _scratchPos;
    private _scratchRot;
    private _scratchScale;
    private _tempMatrix;
    protected setupScene(): Promise<void>;
    private _createBallStateMachine;
    protected update(deltaTime: number): void;
}
