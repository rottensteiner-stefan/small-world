export declare abstract class AbstractLight extends Object3D {
    color: Color;
    intensity: number;
    abstract readonly type: LightType;
    protected constructor(color: Color, intensity: number, name?: string);
}

export declare abstract class AbstractMaterial {
    abstract readonly type: MaterialType;
    uuid: string;
    color: Color;
}

export declare class AmbientLight extends AbstractLight {
    readonly type = LightType.AMBIENT;
    constructor(color?: Color, intensity?: number);
}

export declare class AssetManager {
    private static imageCache;
    private static textCache;
    private static fetchWithProgress;
    static loadImage(url: string, onProgress?: ProgressCallback, flipY?: boolean): Promise<ImageBitmap | HTMLImageElement>;
    static loadText(url: string, onProgress?: ProgressCallback): Promise<string>;
}

export declare class BasicMaterial extends AbstractMaterial {
    readonly type = MaterialType.BASIC;
}

export declare class BoundingBox implements IBoundingVolume {
    min: Vector3D;
    max: Vector3D;
    type: BoundingType;
    broadRadius: number;
    constructor(min: Vector3D, max: Vector3D);
    get center(): Vector3D;
    getBroadRadius(): number;
}

export declare class BoundingSphere implements IBoundingVolume {
    center: Vector3D;
    radius: number;
    type: BoundingType;
    constructor(center: Vector3D, radius: number);
    getBroadRadius(): number;
}

declare enum BoundingType {
    SPHERE = 0,
    BOX = 1
}

export declare class Camera {
    projection: Projection;
    position: Vector3D;
    target: Vector3D;
    up: Vector3D;
    theta: number;
    phi: number;
    private strategy;
    constructor(projection: Projection);
    setStrategy(type: CameraStrategyType): void;
    get activeStrategyType(): string;
    update(targetPos: Vector3D, dx: number, dy: number): void;
    getViewProjection(v: Matrix4, out: Matrix4): void;
}

export declare enum CameraStrategyType {
    FIXED = "FixedCamera",
    STIFF = "StiffCamera",
    SMOOTH = "SmoothCamera",
    FPS = "FPSCamera"
}

export declare class Circle extends ObjectGeometry {
    radius: number;
    segments: number;
    constructor(radius?: number, segments?: number);
    protected generateGeometryData(): void;
}

export declare class Collision {
    static test(a: IBoundingVolume, b: IBoundingVolume): boolean;
    private static sphereSphere;
    private static boxBox;
    private static sphereBox;
}

export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r: number, g: number, b: number, a?: number);
    static get WHITE(): Color;
    static get BLACK(): Color;
    static get RED(): Color;
    static get GREEN(): Color;
    static get BLUE(): Color;
    static get ORANGE(): Color;
    static get DODGERBLUE(): Color;
    static get SKYBLUE(): Color;
    static get LIGHTSTEELBLUE(): Color;
    static get DARKSLATEGRAY(): Color;
    static get GRAY(): Color;
    static get YELLOW(): Color;
    toArray(): number[];
}

export declare class ColorUtils {
    private static _ctx;
    private static getCtx;
    static fromCSS(cssColor: string): Color;
}

export declare class Cube extends ObjectGeometry {
    size: number;
    constructor(size?: number);
    protected generateGeometryData(): void;
}

export declare class CubeTexture {
    uuid: string;
    images: (ImageBitmap | HTMLImageElement)[];
    isLoaded: boolean;
    constructor(urls?: string[]);
    load(urls: string[]): Promise<void>;
}

export declare class Cylinder extends ObjectGeometry {
    radius: number;
    height: number;
    segments: number;
    constructor(radius?: number, height?: number, segments?: number);
    protected generateGeometryData(): void;
}

export declare const DEFAULT_RENDERER = RendererType.BEST;

export declare class DirectionalLight extends AbstractLight {
    readonly type = LightType.DIRECTIONAL;
    intensity: number;
    direction: Vector3D;
    constructor(color?: Color, intensity?: number);
}

export declare const ENGINE_VERSION = "0.9.4";

export declare class EventDispatcher {
    private _listeners;
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: any): void;
}

declare type EventHandler = (event: any) => void;

export declare enum EventType {
    LOADER_END = "LoaderEnd",
    LOADER_ERROR = "LoaderError",
    LOADER_PROGRESS = "LoaderProgress",
    LOADER_START = "LoaderStart"
}

export declare class FrustumCuller {
    private static frustum;
    static cull(scene: Scene, vpMatrix: Matrix4): number;
}

export declare class Grid extends ObjectGeometry {
    size: number;
    divisions: number;
    constructor(size?: number, divisions?: number);
    protected generateGeometryData(): void;
}

export declare class HUD {
    private enabled;
    private root;
    private elements;
    constructor(enabled: boolean);
    init(): Promise<void>;
    setVisible(visible: boolean): void;
    /**
     * Nimmt ein Key-Value Objekt entgegen und aktualisiert nur die gemappten Elemente.
     * Beispiel: hud.update({ "hud.fps": 120, "hud.cam.type": "SMOOTH" });
     */
    update(data: Record<string, string | number>): void;
}

declare interface IBoundingVolume {
    type: BoundingType;
    center: Vector3D;
    getBroadRadius(): number;
}

declare interface IGeometry {
    getGeometryData(): IGeometryData;
}

declare interface IGeometryData {
    vertices: Float32Array;
    indices: Uint16Array;
    normals: Float32Array;
    uvs: Float32Array;
}

export declare class ImageLoader extends Loader<ImageBitmap | HTMLImageElement> {
    load(url: string): Promise<ImageBitmap | HTMLImageElement>;
}

export declare class Input {
    private static keys;
    static mouse: {
        x: number;
        y: number;
        dx: number;
        dy: number;
        right: boolean;
    };
    static isPointerLocked: boolean;
    static debug: boolean;
    static init(): void;
    static requestPointerLock(element: HTMLElement): void;
    static isPressed(code: string | Keys): boolean;
    static getAxis(neg: string | Keys, pos: string | Keys): number;
}

declare interface IRenderer {
    readonly type: RendererType;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    setSize(width: number, height: number): void;
    setClearColor(color: Color): void;
}

declare interface IVector {
    length(): number;
    lengthSq(): number;
    normalize(): IVector;
    scale(s: number): IVector;
}

export declare enum Keys {
    UP = "ArrowUp",
    DOWN = "ArrowDown",
    LEFT = "ArrowLeft",
    RIGHT = "ArrowRight",
    SPACE = "Space",
    ENTER = "Enter",
    ESCAPE = "Escape",
    TAB = "Tab",
    BACKSPACE = "Backspace",
    SHIFT_L = "ShiftLeft",
    SHIFT_R = "ShiftRight",
    CTRL_L = "ControlLeft",
    CTRL_R = "ControlRight",
    ALT_L = "AltLeft",
    ALT_R = "AltRight",
    D0 = "Digit0",
    D1 = "Digit1",
    D2 = "Digit2",
    D3 = "Digit3",
    D4 = "Digit4",
    D5 = "Digit5",
    D6 = "Digit6",
    D7 = "Digit7",
    D8 = "Digit8",
    D9 = "Digit9",
    A = "KeyA",
    B = "KeyB",
    C = "KeyC",
    D = "KeyD",
    E = "KeyE",
    F = "KeyF",
    G = "KeyG",
    H = "KeyH",
    I = "KeyI",
    J = "KeyJ",
    K = "KeyK",
    L = "KeyL",
    M = "KeyM",
    N = "KeyN",
    O = "KeyO",
    P = "KeyP",
    Q = "KeyQ",
    R = "KeyR",
    S = "KeyS",
    T = "KeyT",
    U = "KeyU",
    V = "KeyV",
    W = "KeyW",
    X = "KeyX",
    Y = "KeyY",
    Z = "KeyZ"
}

export declare class LambertMaterial extends AbstractMaterial {
    readonly type = MaterialType.LAMBERT;
}

export declare enum LightType {
    AMBIENT = "AmbientLight",
    DIRECTIONAL = "DirectionalLight",
    POINT = "PointLight",
    SPOT = "SpotLight"
}

export declare class Line extends ObjectGeometry {
    start: Vector3D;
    end: Vector3D;
    constructor(start: Vector3D, end: Vector3D);
    protected generateGeometryData(): void;
}

/**
 * Abstrakte Basisklasse für alle Loader.
 * T ist der Typ, den der Loader am Ende zurückgibt (z.B. string, ImageBitmap, ModelGeometry).
 */
export declare abstract class Loader<T> extends EventDispatcher {
    basePath: string;
    setBasePath(path: string): this;
    /**
     * Die Hauptmethode, die von jedem spezifischen Loader implementiert werden muss.
     */
    abstract load(url: string): Promise<T>;
}

declare enum MaterialType {
    BASIC = "BasicMaterial",
    LAMBERT = "LabertMaterial",
    PHONG = "PhongMaterial",
    SKYBOX = "SkyboxMaterial",
    WIREFRAME = "WireframeMaterial"
}

export declare class Matrix4 {
    data: Float32Array<ArrayBuffer>;
    constructor();
    identity(): Matrix4;
    compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this;
    static translate(v: Vector3D, out: Matrix4): void;
    static scale(s: number, out: Matrix4): void;
    static rotateX(r: number, out: Matrix4): void;
    static rotateY(r: number, out: Matrix4): void;
    static rotateZ(r: number, out: Matrix4): void;
    static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void;
    static perspective(fov: number, aspect: number, near: number, far: number, out: Matrix4): void;
    static orthographic(l: number, r: number, b: number, t: number, n: number, f: number, out: Matrix4): void;
    static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, out: Matrix4): void;
    transformVector(v: Vector3D): Vector3D;
}

export declare class ModelGeometry extends ObjectGeometry {
    constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]);
    protected generateGeometryData(): void;
}

export declare class Object3D {
    readonly uuid: string;
    name: string;
    geometry: IGeometryData | null;
    material: AbstractMaterial | null;
    bounds: IBoundingVolume | null;
    position: Vector3D;
    rotation: Vector3D;
    scale: Vector3D;
    localMatrix: Matrix4;
    worldMatrix: Matrix4;
    parent: Object3D | null;
    children: Object3D[];
    isVisible: boolean;
    frustumCulled: boolean;
    constructor(name?: string);
    add(child: Object3D): void;
    remove(child: Object3D): void;
    updateMatrixWorld(force?: boolean): void;
}

declare abstract class ObjectGeometry implements IGeometry {
    protected vertices: Float32Array;
    protected indices: Uint16Array;
    protected normals: Float32Array;
    protected uvs: Float32Array;
    protected abstract generateGeometryData(): void;
    getGeometryData(): IGeometryData;
    computeNormals(): void;
    applyMatrix4(matrix: Matrix4): this;
    scale(f: number): this;
    rotateX(a: number): this;
    rotateY(a: number): this;
    rotateZ(a: number): this;
}

export declare class ObjLoader extends Loader<Object3D> {
    load(url: string): Promise<Object3D>;
    private parse;
    private parseFaceVertex;
}

export declare class OrthographicProjection extends Projection {
    l: number;
    r: number;
    b: number;
    t: number;
    n: number;
    f: number;
    constructor(l: number, r: number, b: number, t: number, n: number, f: number);
    update(): void;
    getMatrix(): Matrix4;
}

export declare class PerspectiveProjection extends Projection {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    constructor(fov: number, aspect: number, near: number, far: number);
    update(): void;
    getMatrix(): Matrix4;
}

export declare class PhongMaterial extends AbstractMaterial {
    readonly type = MaterialType.PHONG;
    specularColor: Color;
    shininess: number;
    diffuseMap: Texture | null;
}

export declare class Plane extends ObjectGeometry {
    width: number;
    depth: number;
    widthSegments: number;
    depthSegments: number;
    constructor(width?: number, depth?: number, widthSegments?: number, depthSegments?: number);
    protected generateGeometryData(): void;
}

export declare class PointLight extends AbstractLight {
    distance: number;
    decay: number;
    readonly type = LightType.POINT;
    constructor(color?: Color, intensity?: number, distance?: number, decay?: number);
}

declare type ProgressCallback = (loaded: number, total: number) => void;

declare abstract class Projection {
    protected matrix: Matrix4;
    abstract getMatrix(): Matrix4;
    abstract update(): void;
}

export declare class Pyramid extends ObjectGeometry {
    base: number;
    height: number;
    constructor(base?: number, height?: number);
    protected generateGeometryData(): void;
}

export declare enum RendererType {
    BEST = "BEST",
    WEB_GPU = "WEB_GPU",
    WEB_GL2 = "WEB_GL2",
    WEB_GL1 = "WEB_GL1",
    CANVAS = "CANVAS"
}

export declare class Scene {
    objects: Object3D[];
    add(obj: Object3D): void;
    remove(obj: Object3D): void;
    update(): void;
}

export declare class ShaderLoader extends TextLoader {
}

export declare class Skybox extends Object3D {
    constructor(source: string[] | CubeTexture, size?: number);
}

export declare class SkyboxLoader extends Loader<CubeTexture> {
    load(url: string): Promise<CubeTexture>;
}

export declare class SkyboxMaterial extends AbstractMaterial {
    readonly type = MaterialType.SKYBOX;
    cubeMap: CubeTexture | null;
}

export declare class SmallWorld {
    config: WorldConfig;
    activeRenderer: IRenderer;
    constructor();
    init(configPath: string): Promise<void>;
}

export declare class Sphere extends ObjectGeometry {
    radius: number;
    widthSegments: number;
    heightSegments: number;
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
    protected generateGeometryData(): void;
}

export declare class SpotLight extends AbstractLight {
    distance: number;
    angle: number;
    penumbra: number;
    decay: number;
    readonly type = LightType.SPOT;
    direction: Vector3D;
    constructor(color?: Color, intensity?: number, distance?: number, angle?: number, // 30 Grad Kegel
    penumbra?: number, // 0 = harte Kante, 1 = extrem weich
    decay?: number);
}

export declare class TextLoader extends Loader<string> {
    load(url: string): Promise<string>;
}

export declare class Texture {
    uuid: string;
    image: ImageBitmap | HTMLImageElement | null;
    isLoaded: boolean;
    addressModeU: GPUAddressMode;
    addressModeV: GPUAddressMode;
    magFilter: GPUFilterMode;
    minFilter: GPUFilterMode;
    offset: Vector2D;
    repeat: Vector2D;
    constructor(url?: string);
    /**
     * Hilfsmethode, um das Wrapping schnell umzustellen
     */
    setWrapMode(mode: GPUAddressMode): void;
    /**
     * Hilfsmethode für den Filter-Modus
     */
    setFilterMode(mode: GPUFilterMode): void;
    load(url: string): Promise<void>;
}

export declare enum TextureFilter {
    LINEAR = "linear",
    NEAREST = "nearest"
}

export declare enum TextureWrap {
    REPEAT = "repeat",
    CLAMP_TO_EDGE = "clamp-to-edge",
    MIRRORED_REPEAT = "mirror-repeat"
}

export declare class Torus extends ObjectGeometry {
    radius: number;
    tube: number;
    radialSegments: number;
    tubularSegments: number;
    constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number);
    protected generateGeometryData(): void;
}

export declare class Triangle extends ObjectGeometry {
    pointA: Vector3D;
    pointB: Vector3D;
    pointC: Vector3D;
    constructor(pointA: Vector3D, pointB: Vector3D, pointC: Vector3D);
    protected generateGeometryData(): void;
}

export declare class Vector2D implements IVector {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    add(v: Vector2D): this;
    sub(v: Vector2D): this;
    scale(s: number): this;
    dot(v: Vector2D): number;
    lengthSq(): number;
    length(): number;
    distanceToSq(v: Vector2D): number;
    distanceTo(v: Vector2D): number;
    clone(): Vector2D;
    /**
     * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
     * @returns this (für Method Chaining)
     */
    normalize(): this;
}

export declare class Vector3D implements IVector {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    add(v: Vector3D): this;
    sub(v: Vector3D): this;
    scale(s: number): this;
    dot(v: Vector3D): number;
    lengthSq(): number;
    length(): number;
    distanceToSq(v: Vector3D): number;
    distanceTo(v: Vector3D): number;
    copyFrom(v: Vector3D): this;
    clone(): Vector3D;
    /**
     * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
     * @returns this (für Method Chaining)
     */
    normalize(): this;
}

export declare class WireframeMaterial extends AbstractMaterial {
    readonly type = MaterialType.WIREFRAME;
}

export declare interface WorldConfig {
    rendererType?: RendererType | string;
    canvasId: string;
    debug?: boolean;
    worldSize?: number;
    skyColor?: string;
    showHUD?: boolean;
}

export { }
