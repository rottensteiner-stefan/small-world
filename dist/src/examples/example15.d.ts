import { AbstractExample } from '../index.js';
export declare class Example15 extends AbstractExample {
    private _balls;
    private _largeSpheres;
    private _orbitingLight;
    private _time;
    protected setupScene(): Promise<void>;
    private _createBallStateMachine;
    protected update(deltaTime: number): void;
}
