import { AbstractExample, Object3D, PointLight, StateMachine, InstancedMesh, Matrix4, Vector3D, PlanarReflectionNode, DynamicReflectionProbe } from '../index.js';
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
    example: Example15V1;
}
export declare class Example15V1 extends AbstractExample {
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
    /** Max supported balls = 5 color groups × 2000 slots. */
    static readonly MAX_BALLS = 1000;
    static readonly MAX_PER_GROUP: number;
    /** How many balls are currently active (controlled by inspector slider). */
    protected _activeBallCount: number;
    protected _mainBallsMeshes: InstancedMesh[];
    protected _probes: DynamicReflectionProbe[];
    protected _moonPivots: Object3D[];
    protected _reflectionNode: PlanarReflectionNode;
    protected _scratchPos: Vector3D;
    protected _scratchRot: Vector3D;
    protected _scratchScale: Vector3D;
    protected _tempMatrix: Matrix4;
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected onInspectorReady(inspector: GadgetInspector): void;
    protected _createBallStateMachine(ball: Ball): StateMachine<"active" | "falling" | "exploding", BallContext>;
    protected update(deltaTime: number): void;
}
export {};
