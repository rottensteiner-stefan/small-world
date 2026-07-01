import { AbstractExample, Object3D, PointLight, StateMachine, InstancedMesh, Matrix4, Vector3D, Quaternion, PlanarReflectionNode, DynamicReflectionProbe } from '../index.js';
import { GadgetInspector } from '../tools/GadgetInspector.js';
interface Ball {
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    radius: number;
    stateMachine: StateMachine<"active" | "falling" | "exploding", BallContext>;
    timeOnFloor: number;
    lifeTime: number;
    scale: number;
    alpha: number;
}
interface BallContext {
    ball: Ball;
    example: Example15V2;
}
export declare class Example15V2 extends AbstractExample {
    protected _balls: Ball[];
    protected _largeSpheres: {
        object: Object3D;
        radius: number;
        x: number;
        y: number;
        z: number;
    }[];
    protected _orbitingLight: PointLight;
    protected _time: number;
    protected _mainBallsMeshes: InstancedMesh[];
    protected _probes: DynamicReflectionProbe[];
    protected _moonPivots: Object3D[];
    protected _reflectionNode: PlanarReflectionNode;
    protected _scratchPos: Vector3D;
    protected _scratchRot: Quaternion;
    protected _scratchScale: Vector3D;
    protected _tempMatrix: Matrix4;
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected onInspectorReady(_inspector: GadgetInspector): void;
    protected update(deltaTime: number): void;
}
export {};
