/**
 * Base class for all geometry types.
 */
export declare abstract class AbstractGeometry implements GeometryInterface {
    /**
     * The vertices of the geometry.
     */
    protected _vertices: Float32Array;
    /**
     * The indices of the geometry.
     */
    protected _indices: Uint16Array | Uint32Array;
    /**
     * The normals of the geometry.
     */
    protected _normals: Float32Array;
    /**
     * The UV coordinates of the geometry.
     */
    protected _uvs: Float32Array;
    /**
     * Generates the geometry data.
     */
    protected abstract generateGeometryData(): void;
    /**
     * Returns the geometry data.
     * @returns The geometry data.
     */
    getGeometryData(): GeometryDataInterface;
    /**
     * Computes the normals of the geometry.
     */
    computeNormals(): void;
    /**
     * Applies a Matrix4 transformation to the geometry.
     * @param matrix The transformation matrix.
     * @returns this
     */
    applyMatrix4(matrix: Matrix4): this;
    /**
     * Scales the geometry.
     * @param f The scale factor.
     * @returns this
     */
    scale(f: number): this;
    /**
     * Rotates the geometry around the X-axis.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateX(a: number): this;
    /**
     * Rotates the geometry around the Y-axis.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateY(a: number): this;
    /**
     * Rotates the geometry around the Z-axis.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateZ(a: number): this;
}

/**
 * Base class for all light types.
 */
export declare abstract class AbstractLight extends Object3D {
    color: Color;
    intensity: number;
    /** The type of the light. */
    abstract readonly type: LightType;
    /**
     * Creates a new AbstractLight.
     * @param color The color of the light.
     * @param intensity The intensity of the light.
     * @param name The name of the light object.
     */
    protected constructor(color?: Color, intensity?: number, name?: string);
}

/**
 * Abstract base class for all resource loaders.
 * @template T The type of resource returned by the loader.
 */
export declare abstract class AbstractLoader<T> implements EventDispatcher {
    /** The base path for resource URLs. */
    basePath: string;
    private _dispatcher;
    /**
     * Sets the base path for the loader.
     * @param path The base path string.
     * @returns this
     */
    setBasePath(path: string): this;
    /** @inheritdoc */
    addEventListener(type: string | EventType, listener: EventHandler): void;
    /** @inheritdoc */
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    /** @inheritdoc */
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
    /**
     * Loads a resource from the given URL.
     * @param url The relative URL to the resource.
     * @returns A promise resolving to the loaded resource.
     */
    abstract load(url: string): Promise<T>;
}

/**
 * Base class for all material types.
 */
export declare abstract class AbstractMaterial {
    /** The type of the material. */
    abstract readonly type: MaterialType;
    /** The unique identifier of the material. */
    uuid: string;
    /** The base color of the material. */
    color: Color;
}

/**
 * Base class for all camera projections.
 */
export declare abstract class AbstractProjection {
    /**
     * The type of the projection.
     */
    abstract readonly type: ProjectionType;
    /**
     * The projection matrix.
     */
    protected _matrix: Matrix4;
    /**
     * Returns the projection matrix.
     * @returns The projection matrix.
     */
    abstract getMatrix(): Matrix4;
    /**
     * Updates the projection matrix.
     */
    abstract update(): void;
}

export declare abstract class AbstractRenderer implements RendererInterface {
    abstract readonly type: RendererType;
    protected _clearColor: Color;
    abstract initialize(canvas: HTMLCanvasElement): Promise<void>;
    abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    abstract setSize(width: number, height: number): void;
    setClearColor(color: Color): void;
    protected extractLights(scene: Scene): {
        aCol: Color;
        dDir: Vector3D;
        dCol: Color;
        pLights: PointLight[];
        sLights: SpotLight[];
        aLights: AreaLight[];
    };
}

export declare abstract class AbstractWebGLRenderer extends AbstractRenderer {
    protected gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected defaultTexture: WebGLTexture;
    protected defaultCubeTexture: WebGLTexture;
    setSize(w: number, h: number): void;
    setClearColor(color: Color): void;
    protected createShaderProgram(vSrc: string, fSrc: string): WebGLProgram;
    protected initDefaultTextures(): void;
}

/**
 * Ambient light that illuminates all objects in the scene equally.
 */
export declare class AmbientLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /**
     * Creates a new AmbientLight.
     * @param color The color of the light.
     * @param intensity The intensity of the light.
     */
    constructor(color?: Color, intensity?: number);
}

/**
 * Base class for applications built with the SmallWorld engine.
 */
export declare abstract class Application {
    /** The engine configuration. */
    config: EngineConfigInterface;
    /** The current scene. */
    scene: Scene;
    /** The main camera. */
    camera: CameraInterface;
    /** The active renderer. */
    renderer: RendererInterface;
    /** The canvas element. */
    canvas: HTMLCanvasElement;
    private _lastTime;
    private _isRunning;
    /**
     * Creates a new application.
     * @param userConfig Optional configuration to override defaults.
     */
    constructor(userConfig?: EngineConfigInterface);
    /**
     * Called to setup the scene after the engine is initialized.
     */
    protected abstract setupScene(): Promise<void>;
    /**
     * Called every frame to update application logic.
     * @param deltaTime Time elapsed since the last frame in seconds.
     */
    protected abstract update(deltaTime: number): void;
    /**
     * Starts the application loop.
     */
    start(): Promise<void>;
    /**
     * The main application loop.
     * @param currentTime The current timestamp.
     */
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

/**
 * A basic material that only uses a flat color.
 */
export declare class BasicMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
}

/**
 * Represents an axis-aligned bounding box (AABB).
 */
export declare class BoundingBox implements BoundingVolume {
    min: Vector3D;
    max: Vector3D;
    /** @inheritdoc */
    type: BoundingType;
    /** The broad radius for coarse intersection tests. */
    broadRadius: number;
    /**
     * Creates a new BoundingBox.
     * @param min The minimum coordinates.
     * @param max The maximum coordinates.
     */
    constructor(min: Vector3D, max: Vector3D);
    /** @inheritdoc */
    get center(): Vector3D;
    /** @inheritdoc */
    getBroadRadius(): number;
}

/**
 * Represents a bounding sphere.
 */
export declare class BoundingSphere implements BoundingVolume {
    center: Vector3D;
    radius: number;
    /** @inheritdoc */
    type: BoundingType;
    /**
     * Creates a new BoundingSphere.
     * @param center The center of the sphere.
     * @param radius The radius of the sphere.
     */
    constructor(center: Vector3D, radius: number);
    /** @inheritdoc */
    getBroadRadius(): number;
}

/**
 * Types of bounding volumes.
 */
export declare const BoundingType: {
    /** Axis-aligned bounding box. */
    readonly BOX: 1;
    /** Bounding sphere. */
    readonly SPHERE: 0;
};

/** Type definition for BoundingType. */
export declare type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];

export declare interface BoundingVolume {
    type: BoundingType;
    center: Vector3D;
    getBroadRadius(): number;
}

/**
 * Standard implementation of the CameraInterface.
 */
export declare class Camera implements CameraInterface {
    projection: AbstractProjection;
    /** @inheritdoc */
    position: Vector3D;
    /** @inheritdoc */
    target: Vector3D;
    /** @inheritdoc */
    up: Vector3D;
    /** @inheritdoc */
    theta: number;
    /** @inheritdoc */
    phi: number;
    private _strategy;
    private _viewMatrix;
    private _viewProjMatrix;
    /**
     * Creates a new Camera.
     * @param projection The projection to use.
     */
    constructor(projection: AbstractProjection);
    /** @inheritdoc */
    get viewProjectionMatrix(): Float32Array;
    /** @inheritdoc */
    get aspect(): number;
    /** @inheritdoc */
    set aspect(value: number);
    /** @inheritdoc */
    updateProjectionMatrix(): void;
    /** @inheritdoc */
    updateViewMatrix(): void;
    /** @inheritdoc */
    setStrategy(type: CameraStrategyType): void;
    /** @inheritdoc */
    get activeStrategyType(): string;
    /** @inheritdoc */
    update(targetPos: Vector3D, dx: number, dy: number): void;
}

export declare interface CameraInterface {
    /** Position der Kamera in der Welt */
    position: Vector3D;
    /** Punkt, auf den die Kamera schaut */
    target: Vector3D;
    /** Oben-Vektor (meistens 0, 1, 0) */
    up: Vector3D;
    /** Das Seitenverhältnis (z.B. für Window-Resizing) */
    aspect: number;
    /** Die aktive Projektionsart (Perspektive, Orthografisch, etc.) */
    projection: AbstractProjection;
    /** Rotationswinkel auf der X/Z-Ebene */
    theta: number;
    /** Neigungswinkel (hoch/runter) */
    phi: number;
    /** Gibt den Namen der aktuell genutzten Kamera-Strategie zurück */
    readonly activeStrategyType: string;
    /** Die kombinierte Matrix, die der Shader am Ende braucht (View * Projection) */
    viewProjectionMatrix: Float32Array;
    /** Wechselt das Steuerungsverhalten der Kamera */
    setStrategy(type: CameraStrategyType): void;
    /** Führt die Bewegung und Logik der aktiven Strategie aus */
    update(targetPos: Vector3D, dx: number, dy: number): void;
    /** Berechnet die Verzerrung (Perspektive oder Orthografisch) neu */
    updateProjectionMatrix(): void;
    /** Berechnet die Blickrichtung und Position neu */
    updateViewMatrix(): void;
}

export declare interface CameraStrategyInterface {
    readonly type: string;
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}

/**
 * Types of camera control strategies.
 */
export declare const CameraStrategyType: {
    /** Camera stays fixed at its position. */
    readonly FIXED: "FixedCamera";
    /** First-person shooter camera. */
    readonly FPS: "FPSCamera";
    /** Smooth third-person following camera. */
    readonly SMOOTH: "SmoothCamera";
    /** Rigid third-person following camera. */
    readonly STIFF: "StiffCamera";
};

/** Type definition for CameraStrategyType. */
export declare type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];

/**
 * A simple circle geometry.
 */
export declare class Circle extends AbstractGeometry {
    radius: number;
    segments: number;
    /**
     * Creates a new Circle geometry.
     * @param radius The radius of the circle.
     * @param segments The number of segments.
     */
    constructor(radius?: number, segments?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Static class for collision detection tests.
 */
export declare class Collision {
    /**
     * Performs a collision test between two bounding volumes.
     * @param a The first volume.
     * @param b The second volume.
     * @returns True if the volumes intersect.
     */
    static test(a: BoundingVolume, b: BoundingVolume): boolean;
    private static _sphereSphere;
    private static _boxBox;
    private static _sphereBox;
}

/**
 * Represents an RGBA color.
 */
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    /**
     * Creates a new Color.
     * @param r Red component (0-1).
     * @param g Green component (0-1).
     * @param b Blue component (0-1).
     * @param a Alpha component (0-1).
     */
    constructor(r: number, g: number, b: number, a?: number);
    static get WHITE(): Color;
    static get BLACK(): Color;
    static get RED(): Color;
    static get GREEN(): Color;
    static get BLUE(): Color;
    static get LIME(): Color;
    static get ORANGE(): Color;
    static get DODGERBLUE(): Color;
    static get SKYBLUE(): Color;
    static get LIGHTSTEELBLUE(): Color;
    static get DARKSLATEGRAY(): Color;
    static get GRAY(): Color;
    static get YELLOW(): Color;
    /**
     * Returns the color components as an array.
     * @returns [r, g, b, a]
     */
    toArray(): number[];
}

/**
 * Utility class for color conversions and manipulations.
 */
export declare class ColorUtils {
    private static _ctx;
    private static _getCtx;
    /**
     * Creates a Color instance from a CSS color string.
     * @param cssColor The CSS color string (e.g., "#ff0000", "rgb(255, 0, 0)", "red").
     * @returns A new Color instance.
     */
    static fromCSS(cssColor: string): Color;
}

/**
 * Utility class for loading configuration files.
 */
export declare class ConfigLoader {
    /**
     * Loads a JSON configuration file from the given path.
     * @param path The path to the configuration file.
     * @returns A promise that resolves to the configuration object.
     */
    static load(path: string): Promise<unknown>;
}

/**
 * A cube geometry.
 */
export declare class Cube extends AbstractGeometry {
    size: number;
    /**
     * Creates a new Cube geometry.
     * @param size The size of the cube.
     */
    constructor(size?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Represents a cube map texture.
 */
export declare class CubeTexture {
    /** The unique identifier of the texture. */
    uuid: string;
    /** The six images comprising the cube map. */
    images: (ImageBitmap | HTMLImageElement)[];
    /** Whether the texture is fully loaded. */
    isLoaded: boolean;
    /**
     * Creates a new CubeTexture.
     * @param urls Optional array of 6 URLs for the cube faces.
     */
    constructor(urls?: string[]);
    /**
     * Loads the cube map images from the given URLs.
     * @param urls An array of 6 URLs.
     */
    load(urls: string[]): Promise<void>;
}

/**
 * A cylinder geometry.
 */
export declare class Cylinder extends AbstractGeometry {
    radius: number;
    height: number;
    segments: number;
    /**
     * Creates a new Cylinder geometry.
     * @param radius The radius of the cylinder.
     * @param height The height of the cylinder.
     * @param segments The number of segments.
     */
    constructor(radius?: number, height?: number, segments?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

export declare const DEFAULT_RENDERER: "BEST";

/**
 * Directional light that emits light in a specific direction.
 */
export declare class DirectionalLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The direction of the light. */
    direction: Vector3D;
    /**
     * Creates a new DirectionalLight.
     * @param color The color of the light.
     * @param intensity The intensity of the light.
     */
    constructor(color?: Color, intensity?: number);
}

export declare const ENGINE_VERSION = "0.10.16";

export declare interface EngineConfigInterface {
    canvasId?: string;
    fullscreen?: boolean;
    height?: number;
    projection?: ProjectionType;
    renderer?: RendererType;
    width?: number;
}

export declare interface EventDispatcher {
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}

/**
 * Standard implementation of the EventDispatcher interface.
 */
export declare class EventDispatcherImpl implements EventDispatcher {
    private _listeners;
    /**
     * @inheritdoc
     */
    addEventListener(type: string | EventType, listener: EventHandler): void;
    /**
     * @inheritdoc
     */
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    /**
     * @inheritdoc
     */
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}

/**
 * Type definition for event handler functions.
 */
export declare type EventHandler = (event: Record<string, unknown>) => void;

/**
 * Types of events dispatched by the engine.
 */
export declare const EventType: {
    /** Dispatched when a loader finishes. */
    readonly LOADER_END: "LoaderEnd";
    /** Dispatched when a loader encounters an error. */
    readonly LOADER_ERROR: "LoaderError";
    /** Dispatched when a loader makes progress. */
    readonly LOADER_PROGRESS: "LoaderProgress";
    /** Dispatched when a loader starts. */
    readonly LOADER_START: "LoaderStart";
};

/** Type definition for EventType. */
export declare type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Simple FPS counter that displays the current frames per second on the screen.
 */
export declare class FPSCounter {
    private _last;
    private _frames;
    private _el;
    /**
     * Creates a new FPSCounter and adds it to the document body.
     */
    constructor();
    /**
     * Updates the FPS counter. Should be called every frame.
     */
    update(): void;
}

/**
 * A class representing a camera frustum.
 */
export declare class Frustum {
    /**
     * The planes of the frustum.
     */
    planes: Float32Array;
    /**
     * Sets the frustum planes from a matrix.
     * @param m The matrix to set from.
     */
    setFromMatrix(m: Matrix4): void;
    /**
     * Checks if a bounding volume intersects with the frustum.
     * @param volume The bounding volume to check.
     * @returns True if the volume intersects with the frustum.
     */
    intersectsVolume(volume: BoundingVolume): boolean;
}

/**
 * Handles frustum culling for objects in a scene.
 */
export declare class FrustumCuller {
    private static _frustum;
    /**
     * Culls objects in the scene that are outside the camera frustum.
     * @param scene The scene to cull.
     * @param vpMatrix The view-projection matrix.
     * @returns The number of visible objects.
     */
    static cull(scene: Scene, vpMatrix: Matrix4): number;
}

export declare interface GeometryDataInterface {
    vertices: Float32Array;
    indices: Uint16Array | Uint32Array;
    normals: Float32Array;
    uvs: Float32Array;
}

export declare interface GeometryInterface {
    getGeometryData(): GeometryDataInterface;
}

/**
 * A grid geometry.
 */
export declare class Grid extends AbstractGeometry {
    size: number;
    divisions: number;
    /**
     * Creates a new Grid geometry.
     * @param size The total size of the grid.
     * @param divisions The number of divisions.
     */
    constructor(size?: number, divisions?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Utility class for heightmap generation using various algorithms.
 */
export declare class HeightmapGenerator {
    /**
     * Generates a heightmap using the Diamond-Square algorithm as an ImageBitmap.
     * @param detail Size = 2^detail + 1.
     * @param roughness The roughness factor.
     * @returns A promise resolving to an ImageBitmap.
     */
    static generateDiamondSquare(detail?: number, roughness?: number): Promise<ImageBitmap>;
    /**
     * Generates a heightmap as a Float32Array using the Diamond-Square algorithm.
     * @param detail Size = 2^detail + 1.
     * @param roughness The roughness factor.
     * @param seed Optional seed for random generation.
     * @returns A promise resolving to a Float32Array.
     */
    static generateDiamondSquareFloat(detail?: number, roughness?: number, seed?: string): Promise<Float32Array>;
    /**
     * Generates a heightmap using Perlin noise.
     * @param detail Size = 2^detail + 1.
     * @param scale Noise scale.
     * @param offsetX X offset.
     * @param offsetY Y offset.
     * @param octaves Number of octaves.
     * @param persistence Persistence factor.
     * @returns A promise resolving to a Float32Array.
     */
    static generatePerlinFloat(detail?: number, scale?: number, offsetX?: number, offsetY?: number, octaves?: number, persistence?: number): Promise<Float32Array>;
    /**
     * Generates a heightmap using Simplex noise.
     * @param detail Size = 2^detail + 1.
     * @param scale Noise scale.
     * @param offsetX X offset.
     * @param offsetY Y offset.
     * @param octaves Number of octaves.
     * @param persistence Persistence factor.
     * @returns A promise resolving to a Float32Array.
     */
    static generateSimplexFloat(detail?: number, scale?: number, offsetX?: number, offsetY?: number, octaves?: number, persistence?: number): Promise<Float32Array>;
    private static _cyrb128;
    private static _mulberry32;
}

/**
 * Handles the Head-Up Display (HUD) overlay.
 */
export declare class HUD {
    private _enabled;
    private _root;
    private _elements;
    /**
     * Creates a new HUD.
     * @param _enabled Whether the HUD is enabled.
     */
    constructor(_enabled: boolean);
    /**
     * Initializes the HUD by loading the template and binding elements.
     */
    init(): Promise<void>;
    /**
     * Sets the visibility of the HUD.
     * @param visible True to show the HUD.
     */
    setVisible(visible: boolean): void;
    /**
     * Updates the HUD with the given data.
     * @param data A record of key-value pairs to update.
     */
    update(data: Record<string, string | number>): void;
}

/**
 * Loader for image assets.
 */
export declare class ImageLoader extends AbstractLoader<ImageBitmap | HTMLImageElement> {
    /** @inheritdoc */
    load(url: string): Promise<ImageBitmap | HTMLImageElement>;
}

/**
 * Handles user input (keyboard and mouse).
 */
export declare class Input {
    private static _keys;
    /** Mouse state including position and button status. */
    static mouse: {
        x: number;
        y: number;
        dx: number;
        dy: number;
        right: boolean;
    };
    /** Whether the pointer is currently locked. */
    static isPointerLocked: boolean;
    /** Whether debug mode is enabled for input. */
    static debug: boolean;
    /**
     * Initializes the input listeners.
     */
    static init(): void;
    /**
     * Requests a pointer lock on the given element.
     * @param element The element to lock the pointer to.
     */
    static requestPointerLock(element: HTMLElement): void;
    /**
     * Checks if a key is currently pressed.
     * @param code The key code.
     * @returns True if the key is pressed.
     */
    static isPressed(code: string | Keys): boolean;
    /**
     * Returns the value of an axis defined by two keys.
     * @param neg The key for negative direction.
     * @param pos The key for positive direction.
     * @returns -1, 0, or 1.
     */
    static getAxis(neg: string | Keys, pos: string | Keys): number;
}

/**
 * Key codes for user input.
 */
export declare const Keys: {
    /** Up arrow key. */
    readonly UP: "ArrowUp";
    /** Down arrow key. */
    readonly DOWN: "ArrowDown";
    /** Left arrow key. */
    readonly LEFT: "ArrowLeft";
    /** Right arrow key. */
    readonly RIGHT: "ArrowRight";
    /** Space bar. */
    readonly SPACE: "Space";
    /** Enter key. */
    readonly ENTER: "Enter";
    /** Escape key. */
    readonly ESCAPE: "Escape";
    /** Tab key. */
    readonly TAB: "Tab";
    /** Backspace key. */
    readonly BACKSPACE: "Backspace";
    /** Left shift key. */
    readonly SHIFT_L: "ShiftLeft";
    /** Right shift key. */
    readonly SHIFT_R: "ShiftRight";
    /** Left control key. */
    readonly CTRL_L: "ControlLeft";
    /** Right control key. */
    readonly CTRL_R: "ControlRight";
    /** Left alt key. */
    readonly ALT_L: "AltLeft";
    /** Right alt key. */
    readonly ALT_R: "AltRight";
    /** Digit 0. */
    readonly D0: "Digit0";
    /** Digit 1. */
    readonly D1: "Digit1";
    /** Digit 2. */
    readonly D2: "Digit2";
    /** Digit 3. */
    readonly D3: "Digit3";
    /** Digit 4. */
    readonly D4: "Digit4";
    /** Digit 5. */
    readonly D5: "Digit5";
    /** Digit 6. */
    readonly D6: "Digit6";
    /** Digit 7. */
    readonly D7: "Digit7";
    /** Digit 8. */
    readonly D8: "Digit8";
    /** Digit 9. */
    readonly D9: "Digit9";
    /** Key A. */
    readonly A: "KeyA";
    /** Key B. */
    readonly B: "KeyB";
    /** Key C. */
    readonly C: "KeyC";
    /** Key D. */
    readonly D: "KeyD";
    /** Key E. */
    readonly E: "KeyE";
    /** Key F. */
    readonly F: "KeyF";
    /** Key G. */
    readonly G: "KeyG";
    /** Key H. */
    readonly H: "KeyH";
    /** Key I. */
    readonly I: "KeyI";
    /** Key J. */
    readonly J: "KeyJ";
    /** Key K. */
    readonly K: "KeyK";
    /** Key L. */
    readonly L: "KeyL";
    /** Key M. */
    readonly M: "KeyM";
    /** Key N. */
    readonly N: "KeyN";
    /** Key O. */
    readonly O: "KeyO";
    /** Key P. */
    readonly P: "KeyP";
    /** Key Q. */
    readonly Q: "KeyQ";
    /** Key R. */
    readonly R: "KeyR";
    /** Key S. */
    readonly S: "KeyS";
    /** Key T. */
    readonly T: "KeyT";
    /** Key U. */
    readonly U: "KeyU";
    /** Key V. */
    readonly V: "KeyV";
    /** Key W. */
    readonly W: "KeyW";
    /** Key X. */
    readonly X: "KeyX";
    /** Key Y. */
    readonly Y: "KeyY";
    /** Key Z. */
    readonly Z: "KeyZ";
};

/** Type definition for Keys. */
export declare type Keys = (typeof Keys)[keyof typeof Keys];

/**
 * A material that uses the Lambertian reflectance model.
 */
export declare class LambertMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
}

/**
 * Types of lights in the scene.
 */
export declare const LightType: {
    /** Ambient light. */
    readonly AMBIENT: "AmbientLight";
    /** Area light. */
    readonly AREA: "AreaLight";
    /** Directional light. */
    readonly DIRECTIONAL: "DirectionalLight";
    /** Point light. */
    readonly POINT: "PointLight";
    /** Spot light. */
    readonly SPOT: "SpotLight";
};

/** Type definition for LightType. */
export declare type LightType = (typeof LightType)[keyof typeof LightType];

/**
 * A simple line geometry.
 */
export declare class Line extends AbstractGeometry {
    start: Vector3D;
    end: Vector3D;
    /**
     * Creates a new Line geometry.
     * @param start The start point.
     * @param end The end point.
     */
    constructor(start: Vector3D, end: Vector3D);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Types of materials.
 */
export declare const MaterialType: {
    /** Unlit basic material. */
    readonly BASIC: "BasicMaterial";
    /** Lambertian diffuse material. */
    readonly LAMBERT: "LambertMaterial";
    /** Phong specular material. */
    readonly PHONG: "PhongMaterial";
    /** Material for skyboxes. */
    readonly SKYBOX: "SkyboxMaterial";
    /** Specialized terrain material. */
    readonly TERRAIN: "TerrainMaterial";
    /** Material for wireframe rendering. */
    readonly WIREFRAME: "WireframeMaterial";
};

/** Type definition for MaterialType. */
export declare type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

/**
 * Utility class for mathematical operations.
 */
export declare class MathUtils {
    private static _SIN_TABLE;
    private static _COS_TABLE;
    private static _isInit;
    /**
     * Initializes the sine and cosine lookup tables.
     */
    static init(): void;
    /**
     * Returns the sine of the given angle in radians using a lookup table.
     * @param rad The angle in radians.
     * @returns The sine of the angle.
     */
    static fastSin(rad: number): number;
}

/**
 * A 4x4 matrix class.
 */
export declare class Matrix4 {
    /**
     * The matrix data.
     */
    data: Float32Array;
    /**
     * Creates a new Matrix4 and initializes it to the identity matrix.
     */
    constructor();
    /**
     * Sets the matrix to the identity matrix.
     * @returns this
     */
    identity(): Matrix4;
    /**
     * Composes the matrix from position, rotation, and scale.
     * @param pos The position vector.
     * @param rot The rotation vector (Euler angles).
     * @param scale The scale vector.
     * @returns this
     */
    compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this;
    /**
     * Sets the matrix to a translation matrix.
     * @param v The translation vector.
     * @param out The output matrix.
     */
    static translate(v: Vector3D, out: Matrix4): void;
    /**
     * Sets the matrix to a uniform scale matrix.
     * @param s The scale factor.
     * @param out The output matrix.
     */
    static scale(s: number, out: Matrix4): void;
    /**
     * Sets the matrix to a rotation matrix around the X-axis.
     * @param r The rotation angle in radians.
     * @param out The output matrix.
     */
    static rotateX(r: number, out: Matrix4): void;
    /**
     * Sets the matrix to a rotation matrix around the Y-axis.
     * @param r The rotation angle in radians.
     * @param out The output matrix.
     */
    static rotateY(r: number, out: Matrix4): void;
    /**
     * Sets the matrix to a rotation matrix around the Z-axis.
     * @param r The rotation angle in radians.
     * @param out The output matrix.
     */
    static rotateZ(r: number, out: Matrix4): void;
    /**
     * Multiplies two matrices and stores the result in out.
     * @param a The first matrix.
     * @param b The second matrix.
     * @param out The output matrix.
     */
    static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void;
    /**
     * Sets the matrix to a perspective projection matrix.
     * @param fov Field of view in radians.
     * @param aspect Aspect ratio.
     * @param near Near plane.
     * @param far Far plane.
     * @param out The output matrix.
     */
    static perspective(fov: number, aspect: number, near: number, far: number, out: Matrix4): void;
    /**
     * Sets the matrix to an orthographic projection matrix.
     * @param l Left.
     * @param r Right.
     * @param b Bottom.
     * @param t Top.
     * @param n Near.
     * @param f Far.
     * @param out The output matrix.
     */
    static orthographic(l: number, r: number, b: number, t: number, n: number, f: number, out: Matrix4): void;
    /**
     * Sets the matrix to a look-at matrix.
     * @param eye Camera position.
     * @param target Target position.
     * @param up Up vector.
     * @param out The output matrix.
     */
    static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, out: Matrix4): void;
    /**
     * Transforms a vector with this matrix.
     * @param v The vector to transform.
     * @returns The transformed vector.
     */
    transformVector(v: Vector3D): Vector3D;
}

export declare class Mesh {
    private gl;
    vbo: WebGLBuffer | null;
    ebo: WebGLBuffer | null;
    nbo: WebGLBuffer | null;
    tbo: WebGLBuffer | null;
    count: number;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryDataInterface);
    bind(posLoc: number, normLoc?: number, uvLoc?: number): void;
}

/**
 * A geometry loaded from a model file.
 */
export declare class ModelGeometry extends AbstractGeometry {
    /**
     * Creates a new ModelGeometry.
     * @param vertices The vertices.
     * @param uvs The UV coordinates.
     * @param normals The normals.
     * @param indices The indices.
     */
    constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

export declare class MtlLoader extends AbstractLoader<Map<string, PhongMaterial>> {
    load(url: string): Promise<Map<string, PhongMaterial>>;
    private parse;
}

/**
 * A facade for the 'simplex-noise' library to provide a consistent API.
 * Provides static methods for Perlin and Simplex noise.
 */
export declare class Noise {
    private static _noise2D;
    private static _noise3D;
    private static _initialized;
    private static _init;
    /**
     * 3D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static perlin3(x: number, y: number, z: number): number;
    /**
     * 2D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static perlin2(x: number, y: number): number;
    /**
     * 2D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static simplex2(x: number, y: number): number;
}

/**
 * Base class for all 3D objects in the scene.
 */
export declare class Object3D {
    /** The unique identifier of the object. */
    readonly uuid: string;
    /** The name of the object. */
    name: string;
    /** The geometry data of the object. */
    geometry: GeometryDataInterface | null;
    /** The material of the object. */
    material: AbstractMaterial | null;
    /** The bounding volume for collision detection and frustum culling. */
    bounds: BoundingVolume | null;
    /** The position of the object in local space. */
    position: Vector3D;
    /** The rotation of the object in local space (Euler angles). */
    rotation: Vector3D;
    /** The scale of the object in local space. */
    scale: Vector3D;
    /** The local transformation matrix. */
    localMatrix: Matrix4;
    /** The world transformation matrix. */
    worldMatrix: Matrix4;
    /** The parent object in the scene graph. */
    parent: Object3D | null;
    /** The list of child objects. */
    children: Object3D[];
    /** Whether the object is visible. */
    isVisible: boolean;
    /** Whether frustum culling is enabled for this object. */
    frustumCulled: boolean;
    /**
     * Creates a new Object3D.
     * @param name The name of the object.
     */
    constructor(name?: string);
    /**
     * Adds a child object.
     * @param child The child object to add.
     */
    add(child: Object3D): void;
    /**
     * Removes a child object.
     * @param child The child object to remove.
     */
    remove(child: Object3D): void;
    /**
     * Updates the world matrix of the object and its children.
     * @param force Whether to force the update.
     */
    updateMatrixWorld(force?: boolean): void;
}

export declare class ObjLoader extends AbstractLoader<Object3D> {
    load(url: string): Promise<Object3D>;
    private parse;
    private parseFaceVertex;
}

/**
 * Oblique camera projection.
 */
export declare class ObliqueProjection extends AbstractProjection {
    l: number;
    r: number;
    b: number;
    t: number;
    n: number;
    f: number;
    /**
     * @inheritdoc
     */
    readonly type: ProjectionType;
    /**
     * Creates a new ObliqueProjection.
     * @param l Left.
     * @param r Right.
     * @param b Bottom.
     * @param t Top.
     * @param n Near.
     * @param f Far.
     */
    constructor(l: number, r: number, b: number, t: number, n: number, f: number);
    /**
     * @inheritdoc
     */
    update(): void;
    /**
     * @inheritdoc
     */
    getMatrix(): Matrix4;
}

/**
 * Orthographic camera projection.
 */
export declare class OrthographicProjection extends AbstractProjection {
    l: number;
    r: number;
    b: number;
    t: number;
    n: number;
    f: number;
    /**
     * @inheritdoc
     */
    readonly type: ProjectionType;
    /**
     * Creates a new OrthographicProjection.
     * @param l Left.
     * @param r Right.
     * @param b Bottom.
     * @param t Top.
     * @param n Near.
     * @param f Far.
     */
    constructor(l: number, r: number, b: number, t: number, n: number, f: number);
    /**
     * @inheritdoc
     */
    update(): void;
    /**
     * @inheritdoc
     */
    getMatrix(): Matrix4;
}

/**
 * Perspective camera projection.
 */
export declare class PerspectiveProjection extends AbstractProjection {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    /**
     * @inheritdoc
     */
    readonly type: ProjectionType;
    /**
     * Creates a new PerspectiveProjection.
     * @param fov Field of view in radians.
     * @param aspect Aspect ratio.
     * @param near Near plane.
     * @param far Far plane.
     */
    constructor(fov: number, aspect: number, near: number, far: number);
    /**
     * @inheritdoc
     */
    update(): void;
    /**
     * @inheritdoc
     */
    getMatrix(): Matrix4;
}

/**
 * Material that implements the Phong reflection model.
 */
export declare class PhongMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The specular reflection color. */
    specularColor: Color;
    /** The shininess factor. */
    shininess: number;
    /** The diffuse texture map. */
    diffuseMap: Texture | null;
}

/**
 * A simple plane geometry.
 */
export declare class Plane extends AbstractGeometry {
    width: number;
    depth: number;
    widthSegments: number;
    depthSegments: number;
    /**
     * Creates a new Plane geometry.
     * @param width The width of the plane.
     * @param depth The depth of the plane.
     * @param widthSegments The number of segments along the width.
     * @param depthSegments The number of segments along the depth.
     */
    constructor(width?: number, depth?: number, widthSegments?: number, depthSegments?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Point light that emits light in all directions from a single point.
 */
export declare class PointLight extends AbstractLight {
    distance: number;
    decay: number;
    /** @inheritdoc */
    readonly type: LightType;
    /**
     * Creates a new PointLight.
     * @param color The color of the light.
     * @param intensity The intensity of the light.
     * @param distance The maximum distance of the light.
     * @param decay The decay factor of the light.
     */
    constructor(color?: Color, intensity?: number, distance?: number, decay?: number);
}

export declare type ProgressCallback = (loaded: number, total: number) => void;

/**
 * Types of camera projections.
 */
export declare const ProjectionType: {
    /** Oblique projection. */
    readonly OBLIQUE: "ObliqueProjection";
    /** Orthographic projection. */
    readonly ORTHOGRAPHIC: "OrthographicProjection";
    /** Perspective projection. */
    readonly PERSPECTIVE: "PerspectiveProjection";
};

/** Type definition for ProjectionType. */
export declare type ProjectionType = (typeof ProjectionType)[keyof typeof ProjectionType];

/**
 * A pyramid geometry.
 */
export declare class Pyramid extends AbstractGeometry {
    base: number;
    height: number;
    /**
     * Creates a new Pyramid geometry.
     * @param base The base size.
     * @param height The height.
     */
    constructor(base?: number, height?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

export declare class RendererFactory {
    static create(type: RendererType | string, canvas: HTMLCanvasElement): Promise<RendererInterface>;
}

export declare interface RendererInterface {
    readonly type: RendererType;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    setSize(width: number, height: number): void;
    setClearColor(color: Color): void;
}

/**
 * Types of renderers supported by the engine.
 */
export declare const RendererType: {
    /** Automatically select the best available renderer. */
    readonly BEST: "BEST";
    /** WebGPU renderer. */
    readonly WEB_GPU: "WEB_GPU";
    /** WebGL 2.0 renderer. */
    readonly WEB_GL2: "WEB_GL2";
    /** WebGL 1.0 renderer. */
    readonly WEB_GL1: "WEB_GL1";
    /** 2D Canvas fallback renderer. */
    readonly CANVAS: "CANVAS";
};

/** Type definition for RendererType. */
export declare type RendererType = (typeof RendererType)[keyof typeof RendererType];

/**
 * A scene that holds a collection of 3D objects.
 */
export declare class Scene {
    /**
     * The list of objects in the scene.
     */
    objects: Object3D[];
    /**
     * Adds an object to the scene.
     * @param obj The object to add.
     */
    add(obj: Object3D): void;
    /**
     * Removes an object from the scene.
     * @param obj The object to remove.
     */
    remove(obj: Object3D): void;
    /**
     * Updates all objects in the scene.
     */
    update(): void;
}

/**
 * Loader for shader assets. Extends TextLoader for future extensibility.
 */
export declare class ShaderLoader extends TextLoader {
}

/**
 * A skybox that surrounds the scene.
 */
export declare class Skybox extends Object3D {
    /**
     * Creates a new Skybox.
     * @param source An array of paths to the cube map textures or a CubeTexture instance.
     * @param size The size of the skybox cube.
     */
    constructor(source: string[] | CubeTexture, size?: number);
}

/**
 * Loader for cube map skybox textures from a single cross-layout image.
 */
export declare class SkyboxLoader extends AbstractLoader<CubeTexture> {
    /** @inheritdoc */
    load(url: string): Promise<CubeTexture>;
}

/**
 * A material for skyboxes.
 */
export declare class SkyboxMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The cube map texture. */
    cubeMap: CubeTexture | null;
}

/**
 * Main entry point for the SmallWorld engine.
 */
export declare class SmallWorld {
    /** The current world configuration. */
    config: WorldConfig;
    /** The currently active renderer. */
    activeRenderer: RendererInterface;
    /**
     * Creates a new SmallWorld instance.
     */
    constructor();
    /**
     * Initializes the engine with the given configuration file.
     * @param configPath Path to the configuration JSON file.
     */
    init(configPath: string): Promise<void>;
}

/**
 * A sphere geometry.
 */
export declare class Sphere extends AbstractGeometry {
    radius: number;
    widthSegments: number;
    heightSegments: number;
    /**
     * Creates a new Sphere geometry.
     * @param radius The radius of the sphere.
     * @param widthSegments The number of horizontal segments.
     * @param heightSegments The number of vertical segments.
     */
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Spot light that emits light in a cone shape.
 */
export declare class SpotLight extends AbstractLight {
    distance: number;
    angle: number;
    penumbra: number;
    decay: number;
    /** @inheritdoc */
    readonly type: LightType;
    /** The direction of the light. */
    direction: Vector3D;
    /**
     * Creates a new SpotLight.
     * @param color The color of the light.
     * @param intensity The intensity of the light.
     * @param distance The maximum distance of the light.
     * @param angle The angle of the light cone in radians.
     * @param penumbra The penumbra factor (0-1).
     * @param decay The decay factor of the light.
     */
    constructor(color?: Color, intensity?: number, distance?: number, angle?: number, penumbra?: number, decay?: number);
}

/**
 * A terrain geometry generated from height data.
 */
export declare class Terrain extends AbstractGeometry {
    heightData: Float32Array;
    heightmapResolution: number;
    width: number;
    depth: number;
    maxHeight: number;
    meshWidthSegments: number;
    meshDepthSegments: number;
    /**
     * Protected constructor. Use Terrain.fromHeightData() or Terrain.fromImage() instead.
     * @param heightData The height data.
     * @param heightmapResolution The resolution of the heightmap.
     * @param width The width of the terrain.
     * @param depth The depth of the terrain.
     * @param maxHeight The maximum height of the terrain.
     * @param meshWidthSegments The number of segments along the width.
     * @param meshDepthSegments The number of segments along the depth.
     */
    protected constructor(heightData: Float32Array, heightmapResolution: number, width: number, depth: number, maxHeight: number, meshWidthSegments: number, meshDepthSegments: number);
    /**
     * Creates a Terrain from raw height data.
     * @param heightData The height data.
     * @param heightmapResolution The resolution of the heightmap.
     * @param width The width of the terrain.
     * @param depth The depth of the terrain.
     * @param maxHeight The maximum height of the terrain.
     * @param meshWidthSegments The number of segments along the width.
     * @param meshDepthSegments The number of segments along the depth.
     * @returns A new Terrain instance.
     */
    static fromHeightData(heightData: Float32Array, heightmapResolution: number, width?: number, depth?: number, maxHeight?: number, meshWidthSegments?: number, meshDepthSegments?: number): Terrain;
    /**
     * Creates a Terrain from an image.
     * @param image The image to use as heightmap.
     * @param width The width of the terrain.
     * @param depth The depth of the terrain.
     * @param maxHeight The maximum height of the terrain.
     * @param meshWidthSegments The number of segments along the width.
     * @param meshDepthSegments The number of segments along the depth.
     * @param strategy The strategy to extract height from image data.
     * @returns A new Terrain instance.
     */
    static fromImage(image: HTMLImageElement | ImageBitmap, width?: number, depth?: number, maxHeight?: number, meshWidthSegments?: number, meshDepthSegments?: number, strategy?: TerrainHeightStrategy): Terrain;
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * Algorithm for terrain generation.
 */
export declare type TerrainAlgorithm = "DiamondSquare" | "Perlin" | "Simplex";

/**
 * Strategy for extracting height from color data.
 */
export declare type TerrainHeightStrategy = (r: number, g: number, b: number, a: number, maxHeight?: number) => number;

/**
 * Manages dynamic loading and unloading of terrain chunks (infinite terrain).
 */
export declare class TerrainManager {
    private _scene;
    private readonly _chunkSize;
    private readonly _meshSegments;
    private readonly _heightmapDetail;
    private readonly _heightmapRoughness;
    private readonly _maxHeight;
    private readonly _gridSize;
    private readonly _halfGrid;
    private readonly _algorithm;
    private _chunks;
    private _currentGridX;
    private _currentGridZ;
    private readonly _terrainMaterial;
    /**
     * Creates a new TerrainManager.
     * @param scene The scene to add terrain chunks to.
     * @param config The manager configuration.
     */
    constructor(scene: Scene, config?: TerrainManagerConfig);
    /**
     * Initializes the manager and generates the initial grid of chunks.
     */
    init(): Promise<void>;
    /**
     * Updates the terrain grid based on a focus point (usually the player's position).
     * @param focusPoint The current focus position.
     */
    update(focusPoint: Vector3D): Promise<void>;
    private _rebuildGrid;
    private _generateChunk;
    private _generateChunkObject;
    private _getChunkKey;
}

/**
 * Configuration for the TerrainManager.
 */
export declare interface TerrainManagerConfig {
    /** Size of a single chunk in world units. */
    chunkSize?: number;
    /** Resolution of the mesh per chunk. */
    meshSegments?: number;
    /** Detail level for the heightmap (e.g., 7 -> 129x129). */
    heightmapDetail?: number;
    /** Roughness factor for the heightmap generation. */
    heightmapRoughness?: number;
    /** Maximum height of the terrain. */
    maxHeight?: number;
    /** Number of chunks in a row/column of the grid. */
    gridSize?: number;
    /** Material to use for the terrain chunks. */
    material?: TerrainMaterial;
    /** Generation algorithm to use. */
    algorithm?: TerrainAlgorithm;
}

/**
 * Material specifically for terrain rendering with splatmapping.
 */
export declare class TerrainMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The shininess factor. */
    shininess: number;
    /** Sand biome texture map. */
    sandMap: Texture | null;
    /** Grass biome texture map. */
    grassMap: Texture | null;
    /** Rock biome texture map. */
    rockMap: Texture | null;
    /** Snow biome texture map. */
    snowMap: Texture | null;
    /** Texture repetition factors. */
    texRepeat: [number, number];
    /** Thresholds for biome transitions: [SandToGrass, GrassToRock, RockToSnow, TransitionSoftness]. */
    thresholds: [number, number, number, number];
}

/**
 * Built-in terrain height strategies.
 */
export declare const TerrainStrategies: {
    readonly CENTERED_AVERAGE: (r: number, g: number, b: number, _a: number) => number;
    readonly BASE_RED: (r: number, _g: number, _b: number, _a: number) => number;
    readonly BASE_GREEN: (_r: number, g: number, _b: number, _a: number) => number;
    readonly BASE_BLUE: (_r: number, _g: number, b: number, _a: number) => number;
    readonly BASE_ALPHA: (_r: number, _g: number, _b: number, a: number) => number;
    readonly INVERTED_AVERAGE: (r: number, g: number, b: number, _a: number) => number;
};

/**
 * Loader for text assets.
 */
export declare class TextLoader extends AbstractLoader<string> {
    /** @inheritdoc */
    load(url: string): Promise<string>;
}

/**
 * Represents a 2D texture.
 */
export declare class Texture {
    /** The underlying image or bitmap data. */
    image: HTMLImageElement | ImageBitmap | null;
    /** Whether the texture is fully loaded and ready for use. */
    isLoaded: boolean;
    /** The magnification filter. */
    magFilter: TextureFilter;
    /** The minification filter. */
    minFilter: TextureFilter;
    /** The wrapping mode for the U coordinate. */
    addressModeU: TextureWrap;
    /** The wrapping mode for the V coordinate. */
    addressModeV: TextureWrap;
    /** The UV offset. */
    offset: {
        x: number;
        y: number;
    };
    /** The UV repeat factors. */
    repeat: {
        x: number;
        y: number;
    };
    /**
     * Protected constructor. Use static factory methods to create instances.
     * @param image Optional initial image data.
     */
    protected constructor(image?: HTMLImageElement | ImageBitmap);
    /**
     * Creates a texture from an existing image or bitmap.
     * @param image The image or bitmap data.
     * @returns A new Texture instance.
     */
    static fromImage(image: HTMLImageElement | ImageBitmap): Texture;
    /**
     * Creates an empty texture placeholder.
     * @returns A new empty Texture instance.
     */
    static empty(): Texture;
    /**
     * Loads a texture from a URL.
     * @param url The URL of the image.
     * @returns A promise that resolves to a new Texture instance.
     */
    static fromUrl(url: string): Promise<Texture>;
}

/**
 * Texture filtering modes.
 */
export declare const TextureFilter: {
    /** Linear filtering (smooth). */
    readonly LINEAR: "linear";
    /** Nearest-neighbor filtering (pixelated). */
    readonly NEAREST: "nearest";
};

/** Type definition for TextureFilter. */
export declare type TextureFilter = (typeof TextureFilter)[keyof typeof TextureFilter];

/**
 * Utility class for procedural texture generation.
 */
export declare class TextureGenerator {
    /**
     * Generates a simple noisy texture for terrain biomes.
     * @param r Base red component.
     * @param g Base green component.
     * @param b Base blue component.
     * @param noiseSpread How much noise to add.
     * @param size Texture size.
     * @returns A promise resolving to an ImageBitmap.
     */
    static generateBiome(r: number, g: number, b: number, noiseSpread: number, size?: number): Promise<ImageBitmap>;
    /** Creates a sand texture. */
    static createSand(): Promise<ImageBitmap>;
    /** Creates a grass texture. */
    static createGrass(): Promise<ImageBitmap>;
    /** Creates a rock texture. */
    static createRock(): Promise<ImageBitmap>;
    /** Creates a snow texture. */
    static createSnow(): Promise<ImageBitmap>;
}

/**
 * Texture wrapping modes.
 */
export declare const TextureWrap: {
    /** Repeat the texture. */
    readonly REPEAT: "repeat";
    /** Clamp the texture coordinates to the edge. */
    readonly CLAMP_TO_EDGE: "clamp-to-edge";
    /** Repeat the texture mirrored. */
    readonly MIRRORED_REPEAT: "mirror-repeat";
};

/** Type definition for TextureWrap. */
export declare type TextureWrap = (typeof TextureWrap)[keyof typeof TextureWrap];

/**
 * A torus geometry.
 */
export declare class Torus extends AbstractGeometry {
    radius: number;
    tube: number;
    radialSegments: number;
    tubularSegments: number;
    /**
     * Creates a new Torus geometry.
     * @param radius The radius of the torus.
     * @param tube The radius of the tube.
     * @param radialSegments The number of radial segments.
     * @param tubularSegments The number of tubular segments.
     */
    constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * A triangle geometry.
 */
export declare class Triangle extends AbstractGeometry {
    pointA: Vector3D;
    pointB: Vector3D;
    pointC: Vector3D;
    /**
     * Creates a new Triangle geometry.
     * @param pointA The first point.
     * @param pointB The second point.
     * @param pointC The third point.
     */
    constructor(pointA: Vector3D, pointB: Vector3D, pointC: Vector3D);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}

/**
 * A 2D vector class.
 */
export declare class Vector2D implements VectorInterface {
    x: number;
    y: number;
    /**
     * Creates a new Vector2D.
     * @param x The x component.
     * @param y The y component.
     */
    constructor(x?: number, y?: number);
    /**
     * Sets the components of the vector.
     * @param x The x component.
     * @param y The y component.
     * @returns this
     */
    set(x: number, y: number): this;
    /**
     * Adds another vector to this one.
     * @param v The vector to add.
     * @returns this
     */
    add(v: Vector2D): this;
    /**
     * Subtracts another vector from this one.
     * @param v The vector to subtract.
     * @returns this
     */
    sub(v: Vector2D): this;
    /**
     * Scales the vector by a scalar value.
     * @param s The scalar to scale by.
     * @returns this
     */
    scale(s: number): this;
    /**
     * Calculates the dot product of this vector and another.
     * @param v The other vector.
     * @returns The dot product.
     */
    dot(v: Vector2D): number;
    /**
     * Calculates the squared length of the vector.
     * @returns The squared length.
     */
    lengthSq(): number;
    /**
     * Calculates the length of the vector.
     * @returns The length.
     */
    length(): number;
    /**
     * Calculates the squared distance to another vector.
     * @param v The other vector.
     * @returns The squared distance.
     */
    distanceToSq(v: Vector2D): number;
    /**
     * Calculates the distance to another vector.
     * @param v The other vector.
     * @returns The distance.
     */
    distanceTo(v: Vector2D): number;
    /**
     * Clones the vector.
     * @returns A new Vector2D with the same components.
     */
    clone(): Vector2D;
    /**
     * Normalizes the vector to a length of 1.
     * @returns this
     */
    normalize(): this;
}

/**
 * A 3D vector class.
 */
export declare class Vector3D implements VectorInterface {
    x: number;
    y: number;
    z: number;
    /**
     * Creates a new Vector3D.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     */
    constructor(x?: number, y?: number, z?: number);
    /**
     * Sets the components of the vector.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     * @returns this
     */
    set(x: number, y: number, z: number): this;
    /**
     * Adds another vector to this one.
     * @param v The vector to add.
     * @returns this
     */
    add(v: Vector3D): this;
    /**
     * Subtracts another vector from this one.
     * @param v The vector to subtract.
     * @returns this
     */
    sub(v: Vector3D): this;
    /**
     * Scales the vector by a scalar value.
     * @param s The scalar to scale by.
     * @returns this
     */
    scale(s: number): this;
    /**
     * Calculates the dot product of this vector and another.
     * @param v The other vector.
     * @returns The dot product.
     */
    dot(v: Vector3D): number;
    /**
     * Calculates the squared length of the vector.
     * @returns The squared length.
     */
    lengthSq(): number;
    /**
     * Calculates the length of the vector.
     * @returns The length.
     */
    length(): number;
    /**
     * Calculates the squared distance to another vector.
     * @param v The other vector.
     * @returns The squared distance.
     */
    distanceToSq(v: Vector3D): number;
    /**
     * Calculates the distance to another vector.
     * @param v The other vector.
     * @returns The distance.
     */
    distanceTo(v: Vector3D): number;
    /**
     * Copies components from another vector.
     * @param v The vector to copy from.
     * @returns this
     */
    copyFrom(v: Vector3D): this;
    /**
     * Clones the vector.
     * @returns A new Vector3D with the same components.
     */
    clone(): Vector3D;
    /**
     * Normalizes the vector to a length of 1.
     * @returns this
     */
    normalize(): this;
    /**
     * Transforms the direction of this vector with a matrix.
     * This ignores the translation component of the matrix.
     * @param m The transformation matrix.
     * @returns this
     */
    transformDirection(m: Matrix4): this;
}

export declare interface VectorInterface {
    length(): number;
    lengthSq(): number;
    normalize(): VectorInterface;
    scale(s: number): VectorInterface;
}

export declare class WebGL1Renderer extends AbstractWebGLRenderer {
    readonly type: "WEB_GL1";
    protected gl: WebGLRenderingContext;
    private _prog;
    private _locs;
    private _skyProg;
    private _skyLocs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    private _pointLightLocs;
    private _spotLightLocs;
    private _areaLightLocs;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    private getWebGLTexture;
    private getWebGLCubeTexture;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
}

export declare class WebGL2Renderer extends AbstractWebGLRenderer {
    readonly type: "WEB_GL2";
    protected gl: WebGL2RenderingContext;
    private _prog;
    private _locs;
    private _skyProg;
    private _skyLocs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    private _pointLightLocs;
    private _spotLightLocs;
    private _areaLightLocs;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    private getWebGLTexture;
    private getWebGLCubeTexture;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
}

export declare class WebGPURenderer extends AbstractRenderer {
    readonly type: "WEB_GPU";
    private _adapter;
    private _device;
    private _context;
    private _format;
    private _pipelineTriangles;
    private _pipelineLines;
    private _pipelineSkybox;
    private _objBGL;
    private _texBGL;
    private _skyTexBGL;
    private _defaultTexBindGroup;
    private _defaultCubeTexBindGroup;
    private _sampler;
    private _whiteTexView;
    private _geoCache;
    private _objCache;
    private _textureViewCache;
    private _texCache;
    private _terrainTexCache;
    private _samplerCache;
    private _depthTexture;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    private getTextureView;
    private getSampler;
    private getGeoCache;
    private getObjCache;
    private getGPUTextureBindGroup;
    private getGPUTerrainBindGroup;
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    setSize(width: number, height: number): void;
}

export declare const WireframeFS_100 = "\nprecision highp float; uniform vec4 u_color;\nvoid main() { gl_FragColor = u_color; }";

export declare const WireframeFS_300 = "#version 300 es\nprecision highp float; uniform vec4 u_color; out vec4 c;\nvoid main() { c = u_color; }";

/**
 * A material for wireframe rendering.
 */
export declare class WireframeMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
}

export declare const WireframeVS_100 = "\nattribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;\nvoid main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }";

export declare const WireframeVS_300 = "#version 300 es\nin vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;\nvoid main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }";

export declare const WireframeWGSL = "\nstruct U { vp: mat4x4<f32>, model: mat4x4<f32>, color: vec4<f32> };\n@group(0) @binding(0) var<uniform> u: U;\n@vertex fn vs_main(@location(0) p: vec3<f32>) -> @builtin(position) vec4<f32> { return u.vp * u.model * vec4<f32>(p, 1.0); }\n@fragment fn fs_main() -> @location(0) vec4<f32> { return u.color; }\n";

/**
 * Global world configuration.
 */
export declare interface WorldConfig {
    /** The type of renderer to use. */
    rendererType?: RendererType | string;
    /** The ID of the canvas element. */
    canvasId: string;
    /** Whether debug mode is enabled. */
    debug?: boolean;
    /** The size of the world. */
    worldSize?: number;
    /** The background sky color. */
    skyColor?: string;
    /** Whether to show the HUD. */
    showHUD?: boolean;
}

export { }
