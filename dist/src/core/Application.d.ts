import { CameraInterface } from '../interfaces/CameraInterface.js';
import { EngineConfigInterface } from '../interfaces/EngineConfigInterface.js';
import { RendererInterface } from '../interfaces/RendererInterface.js';
import { Scene } from './Scene.js';
export declare abstract class Application {
    config: EngineConfigInterface;
    scene: Scene;
    camera: CameraInterface;
    protected renderer: RendererInterface;
    protected canvas: HTMLCanvasElement;
    private lastTime;
    private isRunning;
    constructor(userConfig?: EngineConfigInterface);
    protected abstract setupScene(): Promise<void>;
    protected abstract update(deltaTime: number): void;
    start(): Promise<void>;
    private loop;
}
