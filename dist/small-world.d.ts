export declare abstract class AbstractLight extends Object3D {
    color: Color;
    intensity: number;
    abstract readonly type: LightType;
    protected constructor(color: Color | undefined, intensity: number, name?: string);
}

export declare abstract class AbstractMaterial {
    abstract readonly type: MaterialType;
    uuid: string;
    color: Color;
}

export declare abstract class AbstractProjection {
    abstract readonly type: ProjectionType;
    protected matrix: Matrix4;
    abstract getMatrix(): Matrix4;
    abstract update(): void;
}

export declare class AmbientLight extends AbstractLight {
    readonly type: "AmbientLight";
    constructor(color?: Color, intensity?: number);
}

export declare abstract class Application {
    config: IEngineConfig;
    scene: Scene;
    camera: ICamera;
    protected renderer: IRenderer;
    protected canvas: HTMLCanvasElement;
    private lastTime;
    private isRunning;
    constructor(userConfig?: IEngineConfig);
    protected abstract setupScene(): Promise<void>;
    protected abstract update(deltaTime: number): void;
    start(): Promise<void>;
    private loop;
}

export declare class AreaLight extends AbstractLight {
    width: number;
    height: number;
    readonly type: "AreaLight";
    constructor(color?: Color, intensity?: number, width?: number, // Breite der Leuchtfläche
    height?: number);
}

export declare class AssetManager {
    private static imageCache;
    private static textCache;
    private static fetchWithProgress;
    static loadImage(url: string, onProgress?: ProgressCallback, flipY?: boolean): Promise<ImageBitmap | HTMLImageElement>;
    static loadText(url: string, onProgress?: ProgressCallback): Promise<string>;
}

export declare class BasicMaterial extends AbstractMaterial {
    readonly type: "BasicMaterial";
}

export declare class BoundingBox implements IBoundingVolume {
    min: Vector3D;
    max: Vector3D;
    type: 1;
    broadRadius: number;
    constructor(min: Vector3D, max: Vector3D);
    get center(): Vector3D;
    getBroadRadius(): number;
}

export declare class BoundingSphere implements IBoundingVolume {
    center: Vector3D;
    radius: number;
    type: 0;
    constructor(center: Vector3D, radius: number);
    getBroadRadius(): number;
}

declare const BoundingType: {
    readonly SPHERE: 0;
    readonly BOX: 1;
};

declare type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];

export declare class Camera implements ICamera {
    projection: AbstractProjection;
    position: Vector3D;
    target: Vector3D;
    up: Vector3D;
    theta: number;
    phi: number;
    private strategy;
    private viewMatrix;
    private viewProjMatrix;
    constructor(projection: AbstractProjection);
    get viewProjectionMatrix(): Float32Array;
    get aspect(): number;
    set aspect(value: number);
    updateProjectionMatrix(): void;
    updateViewMatrix(): void;
    setStrategy(type: CameraStrategyType): void;
    get activeStrategyType(): string;
    update(targetPos: Vector3D, dx: number, dy: number): void;
}

export declare const CameraStrategyType: {
    readonly FIXED: "FixedCamera";
    readonly FPS: "FPSCamera";
    readonly SMOOTH: "SmoothCamera";
    readonly STIFF: "StiffCamera";
};

export declare type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];

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

export declare const DEFAULT_RENDERER: "BEST";

export declare class DirectionalLight extends AbstractLight {
    readonly type: "DirectionalLight";
    intensity: number;
    direction: Vector3D;
    constructor(color?: Color, intensity?: number);
}

export declare const ENGINE_VERSION = "0.10.10";

export declare class EventDispatcher {
    private _listeners;
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}

declare type EventHandler = (event: Record<string, unknown>) => void;

export declare const EventType: {
    readonly LOADER_END: "LoaderEnd";
    readonly LOADER_ERROR: "LoaderError";
    readonly LOADER_PROGRESS: "LoaderProgress";
    readonly LOADER_START: "LoaderStart";
};

export declare type EventType = (typeof EventType)[keyof typeof EventType];

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

export declare class HeightmapGenerator {
    /**
     * Generiert eine Heightmap mit dem Diamond-Square-Algorithmus.
     * @param detail Bestimmt die Größe (Größe = 2^detail + 1). z.B. detail 8 = 257x257 Pixel.
     * @param roughness Wie zerklüftet ist das Terrain? (0.0 = flach, 1.0 = extremes Chaos, ~0.6 ist gut für Hügel)
     * @returns Ein ImageBitmap, das direkt in die Terrain-Geometrie gepumpt werden kann.
     */
    static generateDiamondSquare(detail?: number, roughness?: number): Promise<ImageBitmap>;
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

declare interface ICamera {
    /** Position der Kamera in der Welt */
    position: Vector3D;
    /** Das Seitenverhältnis (z.B. für Window-Resizing) */
    aspect: number;
    /** Die aktive Projektionsart (Perspektive, Orthografisch, etc.) */
    projection: AbstractProjection;
    /** Gibt den Namen der aktuell genutzten Kamera-Strategie zurück */
    readonly activeStrategyType: string;
    /** Die kombinierte Matrix, die der Shader am Ende braucht (View * Projection) */
    viewProjectionMatrix: Float32Array;
    /** Berechnet die Verzerrung (Perspektive oder Orthografisch) neu */
    updateProjectionMatrix(): void;
    /** Berechnet die Blickrichtung und Position neu */
    updateViewMatrix(): void;
}

declare interface IEngineConfig {
    canvasId?: string;
    fullscreen?: boolean;
    height?: number;
    projection?: ProjectionType;
    renderer?: RendererType;
    width?: number;
}

declare interface IGeometry {
    getGeometryData(): IGeometryData;
}

declare interface IGeometryData {
    vertices: Float32Array;
    indices: Uint16Array | Uint32Array;
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

export declare const Keys: {
    readonly UP: "ArrowUp";
    readonly DOWN: "ArrowDown";
    readonly LEFT: "ArrowLeft";
    readonly RIGHT: "ArrowRight";
    readonly SPACE: "Space";
    readonly ENTER: "Enter";
    readonly ESCAPE: "Escape";
    readonly TAB: "Tab";
    readonly BACKSPACE: "Backspace";
    readonly SHIFT_L: "ShiftLeft";
    readonly SHIFT_R: "ShiftRight";
    readonly CTRL_L: "ControlLeft";
    readonly CTRL_R: "ControlRight";
    readonly ALT_L: "AltLeft";
    readonly ALT_R: "AltRight";
    readonly D0: "Digit0";
    readonly D1: "Digit1";
    readonly D2: "Digit2";
    readonly D3: "Digit3";
    readonly D4: "Digit4";
    readonly D5: "Digit5";
    readonly D6: "Digit6";
    readonly D7: "Digit7";
    readonly D8: "Digit8";
    readonly D9: "Digit9";
    readonly A: "KeyA";
    readonly B: "KeyB";
    readonly C: "KeyC";
    readonly D: "KeyD";
    readonly E: "KeyE";
    readonly F: "KeyF";
    readonly G: "KeyG";
    readonly H: "KeyH";
    readonly I: "KeyI";
    readonly J: "KeyJ";
    readonly K: "KeyK";
    readonly L: "KeyL";
    readonly M: "KeyM";
    readonly N: "KeyN";
    readonly O: "KeyO";
    readonly P: "KeyP";
    readonly Q: "KeyQ";
    readonly R: "KeyR";
    readonly S: "KeyS";
    readonly T: "KeyT";
    readonly U: "KeyU";
    readonly V: "KeyV";
    readonly W: "KeyW";
    readonly X: "KeyX";
    readonly Y: "KeyY";
    readonly Z: "KeyZ";
};

export declare type Keys = (typeof Keys)[keyof typeof Keys];

export declare class LambertMaterial extends AbstractMaterial {
    readonly type: "LambertMaterial";
}

export declare const LightType: {
    readonly AMBIENT: "AmbientLight";
    readonly DIRECTIONAL: "DirectionalLight";
    readonly POINT: "PointLight";
    readonly SPOT: "SpotLight";
    readonly AREA: "AreaLight";
};

export declare type LightType = (typeof LightType)[keyof typeof LightType];

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

declare const MaterialType: {
    readonly BASIC: "BasicMaterial";
    readonly LAMBERT: "LambertMaterial";
    readonly PHONG: "PhongMaterial";
    readonly SKYBOX: "SkyboxMaterial";
    readonly TERRAIN: "TerrainMaterial";
    readonly WIREFRAME: "WireframeMaterial";
};

declare type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

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
    protected indices: Uint16Array | Uint32Array;
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

export declare class OrthographicProjection extends AbstractProjection {
    l: number;
    r: number;
    b: number;
    t: number;
    n: number;
    f: number;
    readonly type: "OrthographicProjection";
    constructor(l: number, r: number, b: number, t: number, n: number, f: number);
    update(): void;
    getMatrix(): Matrix4;
}

export declare class PerspectiveProjection extends AbstractProjection {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    readonly type: "PerspectiveProjection";
    constructor(fov: number, aspect: number, near: number, far: number);
    update(): void;
    getMatrix(): Matrix4;
}

export declare class PhongMaterial extends AbstractMaterial {
    readonly type: "PhongMaterial";
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
    readonly type: "PointLight";
    constructor(color?: Color, intensity?: number, distance?: number, decay?: number);
}

declare type ProgressCallback = (loaded: number, total: number) => void;

export declare const ProjectionType: {
    readonly OBLIQUE: "ObliqueProjection";
    readonly ORTHOGRAPHIC: "OrthographicProjection";
    readonly PERSPECTIVE: "PerspectiveProjection";
};

export declare type ProjectionType = (typeof ProjectionType)[keyof typeof ProjectionType];

export declare class Pyramid extends ObjectGeometry {
    base: number;
    height: number;
    constructor(base?: number, height?: number);
    protected generateGeometryData(): void;
}

export declare const RendererType: {
    readonly BEST: "BEST";
    readonly WEB_GPU: "WEB_GPU";
    readonly WEB_GL2: "WEB_GL2";
    readonly WEB_GL1: "WEB_GL1";
    readonly CANVAS: "CANVAS";
};

export declare type RendererType = (typeof RendererType)[keyof typeof RendererType];

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
    readonly type: "SkyboxMaterial";
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
    readonly type: "SpotLight";
    direction: Vector3D;
    constructor(color?: Color, intensity?: number, distance?: number, angle?: number, // 30 Grad Kegel
    penumbra?: number, // 0 = harte Kante, 1 = extrem weich
    decay?: number);
}

export declare class Terrain extends ObjectGeometry {
    image: HTMLImageElement | ImageBitmap;
    width: number;
    depth: number;
    maxHeight: number;
    widthSegments: number;
    depthSegments: number;
    strategy: TerrainHeightStrategy;
    /**
     * @param image Das geladene Bild (Heightmap)
     * @param width Breite des Terrains in Weltkoordinaten
     * @param depth Tiefe des Terrains in Weltkoordinaten
     * @param maxHeight Wie hoch ist der höchste Berg (weißester Pixel)?
     * @param widthSegments Anzahl der Unterteilungen auf der X-Achse (Auflösung)
     * @param depthSegments Anzahl der Unterteilungen auf der Z-Achse (Auflösung)
     * @param strategy Funktion zur Höhenberechnung (Standard: CENTERED_AVERAGE)
     */
    constructor(image: HTMLImageElement | ImageBitmap, width?: number, depth?: number, maxHeight?: number, widthSegments?: number, depthSegments?: number, strategy?: TerrainHeightStrategy);
    protected generateGeometryData(): void;
}

export declare type TerrainHeightStrategy = (r: number, g: number, b: number, a: number, maxHeight: number) => number;

export declare class TerrainMaterial extends AbstractMaterial {
    readonly type: "TerrainMaterial";
    shininess: number;
    sandMap: Texture | null;
    grassMap: Texture | null;
    rockMap: Texture | null;
    snowMap: Texture | null;
    texRepeat: [number, number];
    thresholds: [number, number, number, number];
}

export declare const TerrainStrategies: {
    readonly CENTERED_AVERAGE: (r: number, g: number, b: number, a: number, max: number) => number;
    readonly BASE_RED: (r: number, g: number, b: number, a: number, max: number) => number;
    readonly BASE_GREEN: (r: number, g: number, b: number, a: number, max: number) => number;
    readonly BASE_BLUE: (r: number, g: number, b: number, a: number, max: number) => number;
    readonly BASE_ALPHA: (r: number, g: number, b: number, a: number, max: number) => number;
    readonly INVERTED_AVERAGE: (r: number, g: number, b: number, a: number, max: number) => number;
};

export declare class TextLoader extends Loader<string> {
    load(url: string): Promise<string>;
}

export declare class Texture {
    image: HTMLImageElement | ImageBitmap | null;
    isLoaded: boolean;
    magFilter: TextureFilter;
    minFilter: TextureFilter;
    addressModeU: TextureWrap;
    addressModeV: TextureWrap;
    offset: {
        x: number;
        y: number;
    };
    repeat: {
        x: number;
        y: number;
    };
    /**
     * Privater Konstruktor zwingt zur Nutzung der statischen Factory-Methoden,
     * was den Code für den Nutzer der Engine viel eindeutiger macht.
     */
    protected constructor(image?: HTMLImageElement | ImageBitmap);
    /**
     * Erstellt eine Textur aus einem bereits im RAM existierenden Bild oder Bitmap.
     * Perfekt für prozedural generierte Texturen!
     */
    static fromImage(image: HTMLImageElement | ImageBitmap): Texture;
    /**
     * Erstellt eine leere Textur (z.B. als Platzhalter, bis echte Daten reinkommen).
     */
    static empty(): Texture;
    /**
     * Lädt ein Bild direkt von einer URL und gibt die fertige Textur zurück.
     * Macht externe TextureLoader überflüssig!
     */
    static fromUrl(url: string): Promise<Texture>;
}

export declare const TextureFilter: {
    readonly LINEAR: "linear";
    readonly NEAREST: "nearest";
};

export declare type TextureFilter = (typeof TextureFilter)[keyof typeof TextureFilter];

export declare class TextureGenerator {
    /**
     * Generiert eine einfache, rauschende Textur für unser Terrain.
     */
    static generateBiome(r: number, g: number, b: number, noiseSpread: number, size?: number): Promise<ImageBitmap>;
    static createSand(): Promise<ImageBitmap>;
    static createGrass(): Promise<ImageBitmap>;
    static createRock(): Promise<ImageBitmap>;
    static createSnow(): Promise<ImageBitmap>;
}

export declare const TextureWrap: {
    readonly REPEAT: "repeat";
    readonly CLAMP_TO_EDGE: "clamp-to-edge";
    readonly MIRRORED_REPEAT: "mirror-repeat";
};

export declare type TextureWrap = (typeof TextureWrap)[keyof typeof TextureWrap];

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
    readonly type: "WireframeMaterial";
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
