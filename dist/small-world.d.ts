import { Texture as Texture_2 } from './Texture.js';

/**
 * Base class for camera effects.
 */
export declare abstract class AbstractCameraEffect implements CameraEffect {
    /** @inheritdoc */
    abstract readonly type: string;
    /** @inheritdoc */
    isFinished: boolean;
    /** @inheritdoc */
    readonly offset: Vector3D;
    /** @inheritdoc */
    readonly targetOffset: Vector3D;
    /**
     * Updates the effect state.
     * @param deltaTime Time elapsed since the last frame in seconds.
     */
    abstract update(deltaTime: number): void;
}

/**
 * Base class for all geometry types.
 * Manages vertex, index, normal, and UV data.
 */
export declare abstract class AbstractGeometry implements Geometry {
    /** The vertices of the geometry. */
    protected _vertices: Float32Array;
    /** The indices of the geometry. */
    protected _indices: Uint16Array | Uint32Array | undefined;
    /** The normals of the geometry. */
    protected _normals: Float32Array;
    /** The UV coordinates of the geometry. */
    protected _uvs: Float32Array;
    /**
     * Generates the geometry data. Must be implemented by subclasses.
     */
    protected abstract generateGeometryData(): void;
    /** @inheritdoc */
    getGeometryData(): GeometryDataInterface;
    /**
     * Helper method to create an appropriately sized index array.
     * Automatically chooses between 16-bit and 32-bit indices based on vertex count.
     * @param indexCount The number of indices needed.
     * @returns A Uint16Array or Uint32Array.
     */
    protected _createIndexArray(indexCount: number): Uint16Array | Uint32Array;
    /**
     * Computes the normals of the geometry using the current vertices and indices.
     */
    computeNormals(): void;
    /**
     * Applies a Matrix4 transformation to the geometry vertices.
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
    /** The type of the light. */
    abstract readonly type: LightType;
    /** The color of the light. */
    color: Color;
    /** The intensity of the light. */
    intensity: number;
    /**
     * Creates a new AbstractLight.
     * @param options The configuration options for the light.
     */
    protected constructor(options?: LightOptions);
}

/**
 * Abstract base class for all resource loaders.
 * @template T The type of resource returned by the loader.
 */
export declare abstract class AbstractLoader<T> implements Events {
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

/**
 * Base class for all renderer implementations.
 */
export declare abstract class AbstractRenderer implements Renderer {
    /** @inheritdoc */
    abstract readonly type: RendererType;
    /** The clear color of the renderer. */
    protected _clearColor: Color;
    /** Cached light data to avoid GC pressure. */
    protected _lightData: LightDataInterface;
    /** @inheritdoc */
    abstract initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>): Promise<void>;
    /** @inheritdoc */
    abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    /** @inheritdoc */
    abstract setSize(width: number, height: number): void;
    destroy(): void;
    /** @inheritdoc */
    setClearColor(color: Color): void;
    /**
     * Extracts all lights from the scene for rendering.
     * @param scene The scene to extract lights from.
     * @returns An object containing all extracted light data.
     */
    protected extractLights(scene: Scene): LightDataInterface;
    /**
     * Recursively traverses the scene to find lights.
     * @param node The current node to traverse.
     * @private
     */
    private _traverseLights;
}

export declare abstract class AbstractWebGLRenderer extends AbstractRenderer {
    protected gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected defaultTexture: WebGLTexture;
    protected defaultCubeTexture: WebGLTexture;
    destroy(): void;
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
     * @param options The configuration options for the light.
     */
    constructor(options?: LightOptions);
}

/**
 * Base class for applications built with the SmallWorld engine.
 */
export declare abstract class Application {
    /** The engine configuration. */
    config: EngineConfig;
    /** The current scene. */
    scene: Scene;
    /** The main camera. */
    camera: CameraInterfaceData;
    /** The active renderer. */
    renderer: Renderer;
    /** The canvas element. */
    canvas: HTMLCanvasElement;
    private _lastTime;
    private _isRunning;
    private _isInitialized;
    /**
     * Creates a new application.
     * @param userConfig Optional configuration to override defaults.
     */
    protected constructor(userConfig?: EngineConfig);
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
     * Initializes and starts the application loop.
     */
    start(): Promise<void>;
    /**
     * Stops the application loop.
     */
    stop(): void;
    /**
     * The main application loop.
     * @param currentTime The current timestamp.
     */
    private _loop;
}

/**
 * Area light that emits light from a rectangular plane.
 */
export declare class AreaLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The width of the light area. */
    width: number;
    /** The height/length of the light area. */
    height: number;
    /**
     * Creates a new AreaLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: AreaLightOptions);
}

/**
 * Configuration options for area light.
 */
export declare interface AreaLightOptions extends LightOptions {
    /** The width of the light area. Defaults to 5.0. */
    width?: number;
    /** The height/length of the light area. Defaults to 5.0. */
    height?: number;
}

export declare class AssetManager {
    private static _imageCache;
    private static _textCache;
    private static _fetchWithProgress;
    static loadImage(url: string, onProgress?: ProgressCallback, flipY?: boolean): Promise<ImageBitmap | HTMLImageElement>;
    static loadText(url: string, onProgress?: ProgressCallback): Promise<string>;
}

/**
 * A basic material that only uses a flat color.
 */
export declare class BasicMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    constructor(options?: BasicMaterialOptions);
}

export declare type BasicMaterialOptions = {
    color?: Color;
    diffuseMap?: Texture;
};

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
    private _center;
    /**
     * Creates a new BoundingBox.
     * @param min The minimum coordinates.
     * @param max The maximum coordinates.
     */
    constructor(min: Vector3D, max: Vector3D);
    /**
     * Checks if this bounding box contains a point.
     * @param point The point to check.
     * @returns True if the point is inside the bounding box.
     */
    containsPoint(point: Vector3D): boolean;
    /**
     * Checks if this bounding box contains another bounding box.
     * @param other The other bounding box.
     * @returns True if the other bounding box is completely inside this one.
     */
    containsBox(other: BoundingBox): boolean;
    /**
     * Checks if this bounding box intersects with another bounding box.
     * @param other The other bounding box.
     * @returns True if the bounding boxes intersect.
     */
    intersectsBox(other: BoundingBox): boolean;
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
 * Standard implementation of the CameraInterfaceData.
 */
export declare class Camera implements CameraInterfaceData {
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
    private _effects;
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
    get strategy(): CameraStrategy;
    /** @inheritdoc */
    setStrategy(type: CameraStrategyType): void;
    /** @inheritdoc */
    setConstraints(constraints?: CameraConstraints): void;
    /** @inheritdoc */
    get activeStrategyType(): string;
    /** @inheritdoc */
    update(targetPos: Vector3D, dx: number, dy: number, deltaTime?: number): void;
    /**
     * Adds a new effect to the camera.
     * @param effect The effect to add.
     */
    addEffect(effect: CameraEffect): void;
    /**
     * Creates and adds a new effect by type.
     * @param type The type of effect.
     * @param intensity The intensity.
     * @param duration The duration in seconds.
     */
    applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void;
}

/**
 * Interface defining constraints for the camera position or target.
 */
export declare interface CameraConstraints {
    /** The minimum world coordinates for the camera/target. */
    min?: Vector3D;
    /** The maximum world coordinates for the camera/target. */
    max?: Vector3D;
}

/**
 * Interface for camera effects that can be applied to a camera.
 */
export declare interface CameraEffect {
    /** The type of the effect. */
    readonly type: string;
    /** Whether the effect is finished and should be removed. */
    readonly isFinished: boolean;
    /** The current position offset generated by this effect. */
    readonly offset: Vector3D;
    /** The current target offset generated by this effect. */
    readonly targetOffset: Vector3D;
    /**
     * Updates the effect state.
     * @param deltaTime Time elapsed since the last frame in seconds.
     */
    update(deltaTime: number): void;
}

/**
 * Factory for creating camera effects.
 */
export declare class CameraEffectFactory {
    /**
     * Creates a new camera effect of the specified type.
     * @param type The type of effect to create.
     * @param intensity The intensity of the effect.
     * @param duration The duration of the effect in seconds.
     * @returns The created camera effect.
     */
    static create(type: CameraEffectType, intensity?: number, duration?: number): CameraEffect;
}

/**
 * Types of camera effects.
 */
export declare const CameraEffectType: {
    /** Screen shake effect. */
    readonly SHAKE: "ShakeEffect";
    /** Screen flash effect. */
    readonly FLASH: "FlashEffect";
};

/** Type definition for CameraEffectType. */
export declare type CameraEffectType = (typeof CameraEffectType)[keyof typeof CameraEffectType];

export declare interface CameraInterfaceData {
    /** Die aktuell genutzte Kamera-Strategie */
    readonly strategy: CameraStrategy;
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
    /** Setzt oder entfernt Kamera-Constraints für die aktive Strategie */
    setConstraints(constraints?: CameraConstraints): void;
    /** Führt die Bewegung und Logik der aktiven Strategie aus */
    update(targetPos: Vector3D, dx: number, dy: number, deltaTime?: number): void;
    /** Fügt einen Effekt zur Kamera hinzu */
    addEffect(effect: CameraEffect): void;
    /** Erstellt und aktiviert einen Effekt über seinen Typ */
    applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void;
    /** Berechnet die Verzerrung (Perspektive oder Orthografisch) neu */
    updateProjectionMatrix(): void;
    /** Berechnet die Blickrichtung und Position neu */
    updateViewMatrix(): void;
}

export declare interface CameraStrategy {
    readonly type: string;
    /** Optional constraints for the camera. */
    constraints?: CameraConstraints | undefined;
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}

export declare class CameraStrategyFactory {
    private static _strategies;
    static get(type: CameraStrategyType): CameraStrategy;
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
    /** Isometric camera. */
    readonly ISOMETRIC: "IsometricCamera";
};

/** Type definition for CameraStrategyType. */
export declare type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];

/**
 * A capsule geometry consisting of a cylinder with hemispherical caps.
 */
export declare class Capsule extends AbstractGeometry {
    /** The radius of the capsule. */
    radius: number;
    /** The length of the cylinder part. */
    length: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of segments for the caps. */
    capSegments: number;
    /**
     * Creates a new Capsule geometry.
     * @param options The configuration options.
     */
    constructor(options?: CapsuleOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for capsule geometry.
 */
export declare interface CapsuleOptions {
    /** The radius of the capsule. Defaults to 0.5. */
    radius?: number;
    /** The length of the cylinder part. Defaults to 1. */
    length?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of height segments for the caps. Defaults to 8. */
    capSegments?: number;
}

/**
 * A simple circle geometry, optionally as a segment or sector.
 */
export declare class Circle extends AbstractGeometry {
    /** The radius of the circle. */
    radius: number;
    /** The number of segments. */
    segments: number;
    /** The start angle of the circle segment in radians. */
    thetaStart: number;
    /** The central angle of the circle segment in radians. */
    thetaLength: number;
    /**
     * Creates a new Circle geometry.
     * @param options The configuration options for the circle.
     */
    constructor(options?: CircleOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for circle geometry.
 */
export declare interface CircleOptions {
    /** The radius of the circle. Defaults to 1. */
    radius?: number;
    /** The number of segments. Defaults to 32. */
    segments?: number;
    /** The start angle of the circle segment in radians. Defaults to 0. */
    thetaStart?: number;
    /** The central angle of the circle segment in radians. Defaults to 2 * Math.PI (full circle). */
    thetaLength?: number;
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
    constructor(r?: number, g?: number, b?: number, a?: number);
    private _cachedArray;
    set(r?: number, g?: number, b?: number, a?: number): this;
    copyFrom(color: Color): this;
    static get BLACK(): Color;
    static get SILVER(): Color;
    static get GRAY(): Color;
    static get WHITE(): Color;
    static get MAROON(): Color;
    static get RED(): Color;
    static get PURPLE(): Color;
    static get FUCHSIA(): Color;
    static get GREEN(): Color;
    static get LIME(): Color;
    static get OLIVE(): Color;
    static get YELLOW(): Color;
    static get NAVY(): Color;
    static get BLUE(): Color;
    static get TEAL(): Color;
    static get AQUA(): Color;
    static get ALICEBLUE(): Color;
    static get ANTIQUEWHITE(): Color;
    static get AQUAMARINE(): Color;
    static get AZURE(): Color;
    static get BEIGE(): Color;
    static get BISQUE(): Color;
    static get BLANCHEDALMOND(): Color;
    static get BLUEVIOLET(): Color;
    static get BROWN(): Color;
    static get BURLYWOOD(): Color;
    static get CADETBLUE(): Color;
    static get CHARTREUSE(): Color;
    static get CHOCOLATE(): Color;
    static get CORAL(): Color;
    static get CORNFLOWERBLUE(): Color;
    static get CORNSILK(): Color;
    static get CRIMSON(): Color;
    static get CYAN(): Color;
    static get DARKBLUE(): Color;
    static get DARKCYAN(): Color;
    static get DARKGOLDENROD(): Color;
    static get DARKGRAY(): Color;
    static get DARKGREEN(): Color;
    static get DARKKHAKI(): Color;
    static get DARKMAGENTA(): Color;
    static get DARKOLIVEGREEN(): Color;
    static get DARKORANGE(): Color;
    static get DARKORCHID(): Color;
    static get DARKRED(): Color;
    static get DARKSALMON(): Color;
    static get DARKSEAGREEN(): Color;
    static get DARKSLATEGRAY(): Color;
    static get DARKTURQUOISE(): Color;
    static get DARKVIOLET(): Color;
    static get DEEPPINK(): Color;
    static get DEEPSKYBLUE(): Color;
    static get DIMGRAY(): Color;
    static get DODGERBLUE(): Color;
    static get FIREBRICK(): Color;
    static get FLORALWHITE(): Color;
    static get FORESTGREEN(): Color;
    static get GAINSBORO(): Color;
    static get GHOSTWHITE(): Color;
    static get GOLD(): Color;
    static get GOLDENROD(): Color;
    static get GREENYELLOW(): Color;
    static get HONEYDEW(): Color;
    static get HOTPINK(): Color;
    static get INDIANRED(): Color;
    static get INDIGO(): Color;
    static get IVORY(): Color;
    static get KHAKI(): Color;
    static get LAVENDER(): Color;
    static get LAVENDERBLUSH(): Color;
    static get LAWNGREEN(): Color;
    static get LEMONCHIFFON(): Color;
    static get LIGHTBLUE(): Color;
    static get LIGHTCORAL(): Color;
    static get LIGHTCYAN(): Color;
    static get LIGHTGOLDENRODYELLOW(): Color;
    static get LIGHTGRAY(): Color;
    static get LIGHTGREEN(): Color;
    static get LIGHTPINK(): Color;
    static get LIGHTSALMON(): Color;
    static get LIGHTSEAGREEN(): Color;
    static get LIGHTSKYBLUE(): Color;
    static get LIGHTSLATEGRAY(): Color;
    static get LIGHTSTEELBLUE(): Color;
    static get LIGHTYELLOW(): Color;
    static get LIMEGREEN(): Color;
    static get LINEN(): Color;
    static get MAGENTA(): Color;
    static get MEDIUMAQUAMARINE(): Color;
    static get MEDIUMBLUE(): Color;
    static get MEDIUMORCHID(): Color;
    static get MEDIUMPURPLE(): Color;
    static get MEDIUMSEAGREEN(): Color;
    static get MEDIUMSLATEBLUE(): Color;
    static get MEDIUMSPRINGGREEN(): Color;
    static get MEDIUMTURQUOISE(): Color;
    static get MEDIUMVIOLETRED(): Color;
    static get MIDNIGHTBLUE(): Color;
    static get MINTCREAM(): Color;
    static get MISTYROSE(): Color;
    static get MOCCASIN(): Color;
    static get NAVAJOWHITE(): Color;
    static get OLDLACE(): Color;
    static get OLIVEDRAB(): Color;
    static get ORANGE(): Color;
    static get ORANGERED(): Color;
    static get ORCHID(): Color;
    static get PALEGOLDENROD(): Color;
    static get PALEGREEN(): Color;
    static get PALETURQUOISE(): Color;
    static get PALEVIOLETRED(): Color;
    static get PAPAYAWHIP(): Color;
    static get PEACHPUFF(): Color;
    static get PERU(): Color;
    static get PINK(): Color;
    static get PLUM(): Color;
    static get POWDERBLUE(): Color;
    static get ROSYBROWN(): Color;
    static get ROYALBLUE(): Color;
    static get SADDLEBROWN(): Color;
    static get SALMON(): Color;
    static get SANDYBROWN(): Color;
    static get SEAGREEN(): Color;
    static get SEASHELL(): Color;
    static get SIENNA(): Color;
    static get SKYBLUE(): Color;
    static get SLATEBLUE(): Color;
    static get SLATEGRAY(): Color;
    static get SNOW(): Color;
    static get SPRINGGREEN(): Color;
    static get STEELBLUE(): Color;
    static get TAN(): Color;
    static get THISTLE(): Color;
    static get TOMATO(): Color;
    static get TURQUOISE(): Color;
    static get VIOLET(): Color;
    static get WHEAT(): Color;
    static get WHITESMOKE(): Color;
    static get YELLOWGREEN(): Color;
    /**
     * Creates a Color from a hex string (e.g. "#FF0000" or "#F00").
     */
    static fromHex(hex: string): Color;
    /**
     * Creates a Color from HSL (Hue, Saturation, Lightness).
     * @param h Hue (0 - 360).
     * @param s Saturation (0.0 - 1.0).
     * @param l Lightness (0.0 - 1.0).
     * @param a Alpha (0.0 - 1.0). Default is 1.0.
     */
    static fromHSL(h: number, s: number, l: number, a?: number): Color;
    /**
     * Creates a Color from HSV/HSB (Hue, Saturation, Value/Brightness).
     * @param h Hue (0 - 360).
     * @param s Saturation (0.0 - 1.0).
     * @param v Value/Brightness (0.0 - 1.0).
     * @param a Alpha (0.0 - 1.0). Default is 1.0.
     */
    static fromHSV(h: number, s: number, v: number, a?: number): Color;
    /**
     * Returns the color components as a hex string (e.g. "#FF0000").
     * @param includeAlpha Whether to include the alpha channel (e.g. "#FF0000FF").
     */
    toHex(includeAlpha?: boolean): string;
    /**
     * Returns the color components as HSL.
     * @returns An object with { h: (0-360), s: (0-1), l: (0-1) }
     */
    toHSL(): {
        h: number;
        s: number;
        l: number;
    };
    /**
     * Returns the color components as HSV/HSB.
     * @returns An object with { h: (0-360), s: (0-1), v: (0-1) }
     */
    toHSV(): {
        h: number;
        s: number;
        v: number;
    };
    /**
     * Returns the color components as an array.
     * @returns [r, g, b, a]
     */
    toArray(): number[];
    /**
     * Returns the color components as a Float32Array.
     * @returns Float32Array(4)
     */
    toFloat32Array(): Float32Array;
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
 * A cone geometry. A specialized case of a cylinder with radiusTop set to 0.
 */
export declare class Cone extends Cylinder {
    /**
     * Creates a new Cone geometry.
     * @param options The configuration options.
     */
    constructor(options?: ConeOptions);
}

/**
 * Configuration options for cone geometry.
 */
export declare interface ConeOptions extends Omit<CylinderOptions, "radiusTop" | "radiusBottom"> {
    /** The radius of the base of the cone. Defaults to 1. */
    radius?: number;
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
 * A cube geometry with support for subdivisions.
 */
export declare class Cube extends AbstractGeometry {
    /** The size of the cube. */
    size: number;
    /** Number of segments along the width. */
    widthSegments: number;
    /** Number of segments along the height. */
    heightSegments: number;
    /** Number of segments along the depth. */
    depthSegments: number;
    /**
     * Creates a new Cube geometry.
     * @param options The configuration options for the cube.
     */
    constructor(options?: CubeOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Layouts for cube map textures.
 */
export declare const CubeLayout: {
    /** Six individual images. */
    readonly SIX_IMAGES: "six_images";
    /** 6x1 horizontal strip. */
    readonly STRIP_HORIZONTAL: "strip_horizontal";
    /** 1x6 vertical strip. */
    readonly STRIP_VERTICAL: "strip_vertical";
    /** 3x2 grid. */
    readonly GRID_3X2: "grid_3x2";
    /** 4x3 horizontal cross. */
    readonly CROSS_HORIZONTAL: "cross_horizontal";
    /** 3x4 vertical cross. */
    readonly CROSS_VERTICAL: "cross_vertical";
};

/** Type definition for CubeLayout. */
export declare type CubeLayout = (typeof CubeLayout)[keyof typeof CubeLayout];

/**
 * Configuration options for cube geometry.
 */
export declare interface CubeOptions {
    /** The size of the cube. Defaults to 1. */
    size?: number;
    /** Number of segments along the width. Defaults to 1. */
    widthSegments?: number;
    /** Number of segments along the height. Defaults to 1. */
    heightSegments?: number;
    /** Number of segments along the depth. Defaults to 1. */
    depthSegments?: number;
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
     * @param urls Optional array of 6 URLs for the cube faces or a single URL for a tiled texture.
     */
    constructor(urls?: string[]);
    /**
     * Loads the cube map from one or more URLs.
     * @param urls A single URL or an array of URLs.
     * @param layout Optional layout hint for single images (e.g. 6x1 strip, 3x2 grid, or crosses).
     */
    loadFrom(urls: string | string[], layout?: CubeLayout): Promise<void>;
}

/**
 * A generalized cylinder geometry that can represent cylinders, cones, and conical frustums.
 * Supports partial sectors (pie slices).
 */
export declare class Cylinder extends AbstractGeometry {
    /** The radius at the top. */
    radiusTop: number;
    /** The radius at the bottom. */
    radiusBottom: number;
    /** The height. */
    height: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of height segments. */
    heightSegments: number;
    /** The start angle. */
    thetaStart: number;
    /** The central angle. */
    thetaLength: number;
    /**
     * Creates a new Cylinder geometry.
     * @param options The configuration options.
     */
    constructor(options?: CylinderOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for cylinder geometry.
 */
export declare interface CylinderOptions {
    /** The radius at the top. Defaults to 1. Set to 0 for a cone. */
    radiusTop?: number;
    /** The radius at the bottom. Defaults to 1. */
    radiusBottom?: number;
    /** The height of the cylinder. Defaults to 2. */
    height?: number;
    /** The number of radial segments around the circumference. Defaults to 16. */
    radialSegments?: number;
    /** The number of height segments along the height. Defaults to 1. */
    heightSegments?: number;
    /** The start angle of the sector in radians. Defaults to 0. */
    thetaStart?: number;
    /** The central angle of the sector in radians. Defaults to 2 * Math.PI (full cylinder). */
    thetaLength?: number;
}

/**
 * A cylinder sector geometry (pie slice of a cylinder).
 */
export declare class CylinderSector extends Cylinder {
    /**
     * Creates a new CylinderSector geometry.
     * @param options The configuration options.
     */
    constructor(options?: CylinderSectorOptions);
}

/**
 * Configuration options for cylinder sector geometry.
 */
export declare interface CylinderSectorOptions extends CylinderOptions {
    /** The central angle of the sector in radians. Defaults to PI / 2. */
    thetaLength?: number;
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
     * @param options The configuration options for the light.
     */
    constructor(options?: DirectionalLightOptions);
}

/**
 * Configuration options for directional light.
 */
export declare interface DirectionalLightOptions extends LightOptions {
    /** The direction of the light. Defaults to (0, -1, 0). */
    direction?: Vector3D;
}

export declare const ENGINE_VERSION = "0.13.05";

export declare interface EngineConfig {
    canvasId?: string;
    fullscreen?: boolean;
    height?: number;
    width?: number;
    projection?: ProjectionType;
    rendererType?: RendererType;
    renderer?: EngineRendererConfig[];
}

export declare interface EngineRendererConfig {
    type: RendererType | string;
    attributes?: Record<string, unknown>;
}

/**
 * Standard implementation of the Events interface.
 */
export declare class EventDispatcherImpl implements Events {
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

export declare interface Events {
    addEventListener(type: string | EventType, listener: EventHandler): void;
    removeEventListener(type: string | EventType, listener: EventHandler): void;
    dispatchEvent(type: string | EventType, eventData?: Record<string, unknown>): void;
}

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
 * A camera strategy where the camera remains at a fixed position but looks at a target.
 */
export declare class FixedStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void;
}

/**
 * A flash effect for the camera (simulated via target offset or potentially other means).
 * Note: A real flash might need renderer support, but here we can simulate a 'jolt'.
 */
export declare class FlashEffect extends AbstractCameraEffect {
    /** @inheritdoc */
    readonly type: CameraEffectType;
    private _intensity;
    private _duration;
    private _elapsed;
    /**
     * Creates a new FlashEffect.
     * @param intensity The intensity of the flash.
     * @param duration The duration of the flash in seconds.
     */
    constructor(intensity?: number, duration?: number);
    /** @inheritdoc */
    update(deltaTime: number): void;
}

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
 * A first-person camera strategy.
 */
export declare class FPSStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The height offset from the target position. */
    heightOffset: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
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
    /**
     * Checks if a bounding box intersects with the frustum.
     * @param box The bounding box to check.
     * @returns True if the box intersects with the frustum.
     */
    intersectsBox(box: BoundingBox): boolean;
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
    /**
     * Resets the visibility of an object and its children.
     * @param obj The object to reset.
     * @private
     */
    private static _resetVisibility;
    /**
     * Counts the visible objects in a hierarchy.
     * @param obj The object to count.
     * @private
     */
    private static _countVisible;
    /**
     * Recursively checks a node for visibility.
     * @param obj The object to check.
     * @private
     */
    private static _checkNode;
}

/**
 * Interface for all geometry types.
 */
export declare interface Geometry {
    /**
     * Returns the geometry data.
     * @returns The geometry data.
     */
    getGeometryData(): GeometryDataInterface;
}

/**
 * Interface representing raw geometry data for rendering.
 */
export declare interface GeometryDataInterface {
    /** Vertex position data (x, y, z). */
    vertices: Float32Array;
    /** Optional index data. If provided, indexed rendering is used. */
    indices?: Uint16Array | Uint32Array | undefined;
    /** Optional normal data (nx, ny, nz). */
    normals?: Float32Array | undefined;
    /** Optional texture coordinate data (u, v). */
    uvs?: Float32Array | undefined;
}

/**
 * A grid geometry.
 */
export declare class Grid extends AbstractGeometry {
    /** The total size of the grid. */
    size: number;
    /** The number of divisions. */
    divisions: number;
    /**
     * Creates a new Grid geometry.
     * @param options The configuration options for the grid.
     */
    constructor(options?: GridOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for grid geometry.
 */
export declare interface GridOptions {
    /** The total size of the grid. Defaults to 20. */
    size?: number;
    /** The number of divisions. Defaults to 20. */
    divisions?: number;
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
        left: boolean;
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
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export declare class IsometricStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** Whether to snap the camera position to whole pixels. */
    pixelPerfect: boolean;
    /** The zoom level (world units per screen unit). */
    zoom: number;
    /** Optional constraints for the camera. */
    constraints?: CameraConstraints;
    /**
     * Updates the camera position and target.
     * @param camera The camera to update.
     * @param targetPos The target position to follow.
     * @param _dx Unused.
     * @param _dy Unused.
     */
    update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void;
    /**
     * Maps screen coordinates to world coordinates on the Y=0 plane.
     * @param screenX Normalized screen X (-1 to 1).
     * @param screenY Normalized screen Y (-1 to 1).
     * @param camera The camera used for rendering.
     * @returns The world position.
     */
    screenToWorld(screenX: number, screenY: number, camera: CameraInterfaceData): Vector3D;
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

export declare interface LightDataInterface {
    aCol: Color;
    dDir: Vector3D;
    dCol: Color;
    pLights: PointLight[];
    sLights: SpotLight[];
    aLights: AreaLight[];
}

/**
 * Configuration options for lights.
 */
export declare interface LightOptions {
    /** The color of the light. Defaults to white. */
    color?: Color;
    /** The intensity of the light. Defaults to 1.0. */
    intensity?: number;
    /** The name of the light object. Defaults to "Light". */
    name?: string;
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
    /** Material for sprites. */
    readonly SPRITE: "SpriteMaterial";
};

/** Type definition for MaterialType. */
export declare type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

/**
 * Utility class for mathematical operations.
 */
export declare class MathUtils {
    static readonly PI: number;
    static readonly TWO_PI: number;
    static readonly HALF_PI: number;
    static readonly QUARTER_PI: number;
    static readonly DEG2RAD: number;
    static readonly RAD2DEG: number;
    private static _SIN_TABLE;
    private static _COS_TABLE;
    private static _isInit;
    /**
     * Initializes the sine and cosine lookup tables.
     */
    static init(): void;
    /**
     * Converts degrees to radians.
     * @param degrees The angle in degrees.
     * @returns The angle in radians.
     */
    static degToRad(degrees: number): number;
    /**
     * Converts radians to degrees.
     * @param radians The angle in radians.
     * @returns The angle in degrees.
     */
    static radToDeg(radians: number): number;
    /**
     * Returns the sine of the given angle in radians using a lookup table.
     * @param rad The angle in radians.
     * @returns The sine of the angle.
     */
    static fastSin(rad: number): number;
    /**
     * Clamps a value between a minimum and maximum.
     * @param val The value to clamp.
     * @param min The minimum value.
     * @param max The maximum value.
     * @returns The clamped value.
     */
    static clamp(val: number, min: number, max: number): number;
}

/**
 * A class representing a 3x3 matrix.
 */
export declare class Matrix3 {
    /** The matrix data (column-major). */
    data: Float32Array;
    /**
     * Creates a new Matrix3.
     */
    constructor();
    /**
     * Sets the matrix to identity.
     * @returns this
     */
    identity(): this;
    /**
     * Sets the matrix from a 4x4 matrix (upper-left 3x3).
     * @param m The 4x4 matrix.
     * @returns this
     */
    setFromMatrix4(m: any): this;
    /**
     * Normal matrix calculation (transpose of inverse of the upper-left 3x3 of a 4x4 matrix).
     * @param m The 4x4 matrix.
     * @returns this
     */
    getNormalMatrix(m: any): this;
    /**
     * Multiplies two 3x3 matrices.
     * @param a The first matrix.
     * @param b The second matrix.
     * @param out The output matrix.
     */
    static multiply(a: Matrix3, b: Matrix3, out: Matrix3): void;
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
    /**
     * Inverts this matrix and stores the result in out.
     * @param out The output matrix.
     * @returns Whether the inversion was successful.
     */
    invert(out: Matrix4): boolean;
}

/**
 * Wrapper for WebGL vertex and index buffers.
 * Handles both indexed and non-indexed geometry.
 */
export declare class Mesh {
    /** The vertex buffer object. */
    vbo: WebGLBuffer | undefined;
    /** The element buffer object (indices). */
    ebo: WebGLBuffer | undefined;
    /** The normal buffer object. */
    nbo: WebGLBuffer | undefined;
    /** The texture coordinate buffer object. */
    tbo: WebGLBuffer | undefined;
    /** The number of elements (indices or vertices) to draw. */
    count: number;
    /** Whether this mesh uses indices for drawing. */
    isIndexed: boolean;
    /** The GL data type of the indices (e.g., UNSIGNED_SHORT or UNSIGNED_INT). */
    indexType: number;
    private _gl;
    /**
     * Creates a new Mesh and uploads the geometry data to the GPU.
     * @param gl The WebGL context.
     * @param data The geometry data to upload.
     */
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryDataInterface);
    /**
     * Binds the buffers and sets the vertex attributes.
     * @param posLoc The location of the position attribute.
     * @param normLoc The location of the normal attribute.
     * @param uvLoc The location of the UV attribute.
     */
    bind(posLoc: number, normLoc?: number, uvLoc?: number): void;
    /**
     * Draws the mesh using the appropriate GL call.
     * @param mode The draw mode (e.g. TRIANGLES, LINES).
     */
    draw(mode: number): void;
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
    private _parse;
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
    geometry: GeometryDataInterface | undefined;
    /** The material of the object. */
    material: AbstractMaterial | undefined;
    /** The bounding volume for collision detection and frustum culling. */
    bounds: BoundingVolume | undefined;
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
    parent: Object3D | undefined;
    /** The list of child objects. */
    children: Object3D[];
    /** Whether the object is visible. */
    isVisible: boolean;
    /** Whether frustum culling is enabled for this object. */
    frustumCulled: boolean;
    /**
     * Creates a new Object3D.
     * @param name The name of the object. Defaults to a random UUID.
     */
    constructor(name?: string);
    /**
     * Adds child objects.
     * @param children The child objects to add.
     */
    add(...children: Object3D[]): void;
    /**
     * Removes child objects.
     * @param children The child objects to remove.
     */
    remove(...children: Object3D[]): void;
    /**
     * Translates the object by a vector.
     * @param v The translation vector.
     * @returns this
     */
    translate(v: Vector3D): this;
    /**
     * Sets the position of the object.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @param z The z coordinate.
     * @returns this
     */
    setPosition(x: number, y: number, z: number): this;
    /**
     * Sets the rotation of the object.
     * @param x The x rotation in radians.
     * @param y The y rotation in radians.
     * @param z The z rotation in radians.
     * @returns this
     */
    setRotation(x: number, y: number, z: number): this;
    /**
     * Sets the scale of the object.
     * @param x The x scale.
     * @param y The y scale.
     * @param z The z scale.
     * @returns this
     */
    setScale(x: number, y?: number, z?: number): this;
    /**
     * Rotates the object to look at a target position.
     * @param target The target position.
     * @param up The up vector.
     * @returns this
     */
    lookAt(target: Vector3D, up?: Vector3D): this;
    updateMatrixWorld(force?: boolean): void;
}

export declare class ObjLoader extends AbstractLoader<Object3D> {
    load(url: string): Promise<Object3D>;
    private _parse;
    private _parseFaceVertex;
}

/**
 * Configuration options for oblique projection.
 */
export declare interface ObliqueOptions {
    /** Left plane distance. Defaults to -1. */
    left?: number;
    /** Right plane distance. Defaults to 1. */
    right?: number;
    /** Bottom plane distance. Defaults to -1. */
    bottom?: number;
    /** Top plane distance. Defaults to 1. */
    top?: number;
    /** Near plane distance. Defaults to 0.1. */
    near?: number;
    /** Far plane distance. Defaults to 1000. */
    far?: number;
}

/**
 * Oblique camera projection.
 */
export declare class ObliqueProjection extends AbstractProjection {
    /** Left. */
    left: number;
    /** Right. */
    right: number;
    /** Bottom. */
    bottom: number;
    /** Top. */
    top: number;
    /** Near. */
    near: number;
    /** Far. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new ObliqueProjection.
     * @param options The configuration options for the projection.
     */
    constructor(options?: ObliqueOptions);
    /** @inheritdoc */
    update(): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}

/**
 * An octree for spatial partitioning.
 */
export declare class Octree {
    /** The root node of the octree. */
    root: OctreeNode;
    /**
     * Creates a new Octree.
     * @param bounds The bounds of the octree.
     * @param options The configuration options.
     */
    constructor(bounds: BoundingBox, options?: OctreeOptions);
    /**
     * Inserts an object into the octree.
     * @param obj The object to insert.
     */
    insert(obj: Object3D): void;
    /**
     * Queries the octree for objects that intersect with the frustum.
     * @param frustum The frustum to check.
     * @returns The list of intersecting objects.
     */
    query(frustum: Frustum): Object3D[];
    /**
     * Clears the octree.
     */
    clear(): void;
}

/**
 * A node in the octree.
 */
export declare class OctreeNode {
    bounds: BoundingBox;
    /** The children of this node. */
    children: OctreeNode[];
    /** The objects stored in this node. */
    objects: Object3D[];
    private readonly _depth;
    private readonly _maxDepth;
    private readonly _maxObjects;
    /**
     * Creates a new OctreeNode.
     * @param bounds The bounds of this node.
     * @param depth The current depth of this node.
     * @param options The configuration options.
     */
    constructor(bounds: BoundingBox, depth?: number, options?: OctreeOptions);
    /**
     * Inserts an object into the octree.
     * @param obj The object to insert.
     * @returns True if the object was inserted.
     */
    insert(obj: Object3D): boolean;
    /**
     * Subdivides the node into 8 children.
     * @private
     */
    private _subdivide;
    /**
     * Queries the octree for objects that intersect with the frustum.
     * @param frustum The frustum to check.
     * @param result The array to store the results.
     */
    query(frustum: Frustum, result: Object3D[]): void;
    /**
     * Clears the node and its children.
     */
    clear(): void;
}

/**
 * Configuration options for an octree node.
 */
export declare interface OctreeOptions {
    /** The maximum depth of the octree. Defaults to 8. */
    maxDepth?: number;
    /** The maximum number of objects in a node before it subdivides. Defaults to 10. */
    maxObjects?: number;
}

/**
 * Configuration options for orthographic projection.
 */
export declare interface OrthographicOptions {
    /** Left plane distance. Defaults to -1. */
    left?: number;
    /** Right plane distance. Defaults to 1. */
    right?: number;
    /** Bottom plane distance. Defaults to -1. */
    bottom?: number;
    /** Top plane distance. Defaults to 1. */
    top?: number;
    /** Near plane distance. Defaults to 0.1. */
    near?: number;
    /** Far plane distance. Defaults to 1000. */
    far?: number;
}

/**
 * Orthographic camera projection.
 */
export declare class OrthographicProjection extends AbstractProjection {
    /** Left. */
    left: number;
    /** Right. */
    right: number;
    /** Bottom. */
    bottom: number;
    /** Top. */
    top: number;
    /** Near. */
    near: number;
    /** Far. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new OrthographicProjection.
     * @param options The configuration options for the projection.
     */
    constructor(options?: OrthographicOptions);
    /** @inheritdoc */
    update(): void;
    /** @inheritdoc */
    getMatrix(): Matrix4;
}

/**
 * Configuration options for perspective projection.
 */
export declare interface PerspectiveOptions {
    /** Field of view in radians. Defaults to 75 degrees in radians. */
    fov?: number;
    /** Aspect ratio. Defaults to 1. */
    aspect?: number;
    /** Near plane distance. Defaults to 0.1. */
    near?: number;
    /** Far plane distance. Defaults to 1000. */
    far?: number;
}

/**
 * Perspective camera projection.
 */
export declare class PerspectiveProjection extends AbstractProjection {
    /** Field of view in radians. */
    fov: number;
    /** Aspect ratio. */
    aspect: number;
    /** Near plane. */
    near: number;
    /** Far plane. */
    far: number;
    /** @inheritdoc */
    readonly type: ProjectionType;
    /**
     * Creates a new PerspectiveProjection.
     * @param options The configuration options for the projection.
     */
    constructor(options?: PerspectiveOptions);
    /** @inheritdoc */
    update(): void;
    /** @inheritdoc */
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
    diffuseMap: Texture | undefined;
    /**
     * Creates a new PhongMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: PhongMaterialOptions);
}

/**
 * Configuration options for Phong material.
 */
export declare interface PhongMaterialOptions {
    /** The base color of the material. Defaults to white. */
    color?: Color;
    /** The specular reflection color. Defaults to white. */
    specularColor?: Color;
    /** The shininess factor. Defaults to 32.0. */
    shininess?: number;
    /** The diffuse texture map. Defaults to undefined. */
    diffuseMap?: Texture | undefined;
}

/**
 * A simple plane geometry.
 */
export declare class Plane extends AbstractGeometry {
    /** The width of the plane. */
    width: number;
    /** The depth of the plane. */
    depth: number;
    /** The number of segments along the width. */
    widthSegments: number;
    /** The number of segments along the depth. */
    depthSegments: number;
    /**
     * Creates a new Plane geometry.
     * @param options The configuration options for the plane.
     */
    constructor(options?: PlaneOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for plane geometry.
 */
export declare interface PlaneOptions {
    /** The width of the plane. Defaults to 1. */
    width?: number;
    /** The depth of the plane. Defaults to 1. */
    depth?: number;
    /** The number of segments along the width. Defaults to 1. */
    widthSegments?: number;
    /** The number of segments along the depth. Defaults to 1. */
    depthSegments?: number;
}

/**
 * Point light that emits light in all directions from a single point.
 */
export declare class PointLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The maximum distance of the light. */
    distance: number;
    /** The decay factor of the light. */
    decay: number;
    /**
     * Creates a new PointLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: PointLightOptions);
}

/**
 * Configuration options for point light.
 */
export declare interface PointLightOptions extends LightOptions {
    /** The maximum distance of the light. Defaults to 50.0. */
    distance?: number;
    /** The decay factor of the light. Defaults to 2.0. */
    decay?: number;
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
 * A pyramid geometry with support for subdivisions.
 */
export declare class Pyramid extends AbstractGeometry {
    /** The size of the base. */
    base: number;
    /** The height of the pyramid. */
    height: number;
    /** The number of radial segments. */
    radialSegments: number;
    /**
     * Creates a new Pyramid geometry.
     * @param options The configuration options for the pyramid.
     */
    constructor(options?: PyramidOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for pyramid geometry.
 */
export declare interface PyramidOptions {
    /** The size of the base. Defaults to 1. */
    base?: number;
    /** The height of the pyramid. Defaults to 1. */
    height?: number;
    /** The number of radial segments (sides). Defaults to 4. */
    radialSegments?: number;
}

/**
 * A class representing a quaternion for rotations.
 */
export declare class Quaternion {
    /** The x component. */
    x: number;
    /** The y component. */
    y: number;
    /** The z component. */
    z: number;
    /** The w component. */
    w: number;
    /**
     * Creates a new Quaternion.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     * @param w The w component.
     */
    constructor(x?: number, y?: number, z?: number, w?: number);
    /**
     * Sets the components of the quaternion.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     * @param w The w component.
     * @returns this
     */
    set(x: number, y: number, z: number, w: number): this;
    /**
     * Identity quaternion.
     * @returns this
     */
    identity(): this;
    /**
     * Multiplies this quaternion by another.
     * @param q The other quaternion.
     * @returns this
     */
    multiply(q: Quaternion): this;
    /**
     * Sets the quaternion from axis and angle.
     * @param axis The rotation axis (must be normalized).
     * @param angle The rotation angle in radians.
     * @returns this
     */
    setFromAxisAngle(axis: Vector3D, angle: number): this;
    /**
     * Sets the quaternion from a rotation matrix.
     * @param m The rotation matrix.
     * @returns this
     */
    setFromRotationMatrix(m: Matrix4): this;
    /**
     * Calculates the length of the quaternion.
     * @returns The length.
     */
    length(): number;
    /**
     * Normalizes the quaternion.
     * @returns this
     */
    normalize(): this;
    /**
     * Clones the quaternion.
     * @returns A new Quaternion.
     */
    clone(): Quaternion;
}

export declare interface Renderer {
    readonly type: RendererType;
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>): Promise<void>;
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    setSize(width: number, height: number): void;
    setClearColor(color: Color): void;
    destroy?(): void;
}

/**
 * Factory for creating renderer instances.
 */
export declare class RendererFactory {
    /**
     * Creates a new renderer instance based on the given type.
     * @param type The type of renderer to create.
     * @param canvas The canvas element to initialize the renderer with.
     * @returns A promise that resolves to the created renderer instance.
     */
    static create(type: RendererType | string, canvas: HTMLCanvasElement, config?: EngineConfig): Promise<Renderer>;
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
     * A map for fast O(1) object lookups by name.
     */
    private readonly _objectsByName;
    /** The octree for spatial partitioning. */
    octree: Octree | undefined;
    /**
     * Adds objects to the scene.
     * @param objs The objects to add.
     */
    add(...objs: Object3D[]): void;
    /**
     * Removes objects from the scene.
     * @param objs The objects to remove.
     */
    remove(...objs: Object3D[]): void;
    /**
     * Retrieves an object by its name.
     * @param name The name of the object to find.
     * @returns The object, or undefined if not found.
     */
    getObjectByName(name: string): Object3D | undefined;
    /**
     * Updates all objects in the scene.
     */
    update(): void;
    /**
     * Rebuilds the octree from the current objects in the scene.
     */
    updateOctree(): void;
    /**
     * Adds an object and its children to the octree.
     * @param obj The object to add.
     * @private
     */
    private _addObjectToOctree;
}

/**
 * Loader for shader assets. Extends TextLoader for future extensibility.
 */
export declare class ShaderLoader extends TextLoader {
}

/**
 * A screen shake effect for the camera.
 */
export declare class ShakeEffect extends AbstractCameraEffect {
    /** @inheritdoc */
    readonly type: CameraEffectType;
    private _intensity;
    private _duration;
    private _elapsed;
    /**
     * Creates a new ShakeEffect.
     * @param intensity The maximum intensity of the shake.
     * @param duration The duration of the shake in seconds.
     */
    constructor(intensity?: number, duration?: number);
    /** @inheritdoc */
    update(deltaTime: number): void;
}

/**
 * A skybox that surrounds the scene.
 */
export declare class Skybox extends Object3D {
    constructor(options: SkyboxOptions);
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
    /**
     * Creates a new SkyboxMaterial.
     * @param options The configuration options.
     */
    constructor(options?: SkyboxMaterialOptions);
}

/**
 * Configuration options for skybox material.
 */
export declare interface SkyboxMaterialOptions {
    /** The base color. Defaults to white. */
    color?: Color;
    /** The cube map texture. Defaults to null. */
    cubeMap?: CubeTexture | null;
}

/**
 * Configuration options for the Skydome.
 */
export declare interface SkyboxOptions {
    /** The name of the object. Defaults to "Skydome". */
    name?: string;
    /** The size of the skybox cube. */
    size?: number;
    /** An array of paths to the cube map textures or a CubeTexture instance. */
    source: string[] | CubeTexture;
}

/**
 * A skydome that surrounds the scene using a spherical geometry.
 */
export declare class Skydome extends Object3D {
    material: BasicMaterial;
    /**
     * Creates a new Skydome.
     * @param options The configuration options for the skydome.
     */
    constructor(options: SkydomeOptions);
}

/**
 * Configuration options for the Skydome.
 */
export declare interface SkydomeOptions {
    /** The name of the object. Defaults to "Skydome". */
    name?: string;
    /** The texture to use for the skydome. */
    texture: Texture_2;
    /** The radius of the skydome. Defaults to 100. */
    radius?: number;
    /** The number of width segments. Defaults to 32. */
    widthSegments?: number;
    /** The number of height segments. Defaults to 32. */
    heightSegments?: number;
}

/**
 * Main entry point for the SmallWorld engine.
 */
export declare class SmallWorld {
    /** The current world configuration. */
    config: WorldConfig;
    /** The currently active renderer. */
    activeRenderer: Renderer;
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
 * A camera strategy that smoothly follows a target.
 */
export declare class SmoothStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The radius of the camera from the target. */
    radius: number;
    /** The lerp factor for smoothing. */
    lerpFactor: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}

/**
 * A sphere geometry.
 */
export declare class Sphere extends AbstractGeometry {
    /** The radius of the sphere. */
    radius: number;
    /** The number of horizontal segments. */
    widthSegments: number;
    /** The number of vertical segments. */
    heightSegments: number;
    /**
     * Creates a new Sphere geometry.
     * @param options The configuration options for the sphere.
     */
    constructor(options?: SphereOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for sphere geometry.
 */
export declare interface SphereOptions {
    /** The radius of the sphere. Defaults to 1. */
    radius?: number;
    /** The number of horizontal segments. Defaults to 16. */
    widthSegments?: number;
    /** The number of vertical segments. Defaults to 12. */
    heightSegments?: number;
}

/**
 * Spotlight that emits light in a cone shape.
 */
export declare class SpotLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The direction of the light. */
    direction: Vector3D;
    /** The maximum distance of the light. */
    distance: number;
    /** The angle of the light cone in radians. */
    angle: number;
    /** The penumbra factor (0-1). */
    penumbra: number;
    /** The decay factor of the light. */
    decay: number;
    /**
     * Creates a new SpotLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: SpotLightOptions);
}

/**
 * Configuration options for spotlight.
 */
export declare interface SpotLightOptions extends LightOptions {
    /** The direction of the light. Defaults to (0, -1, 0). */
    direction?: Vector3D;
    /** The maximum distance of the light. Defaults to 50.0. */
    distance?: number;
    /** The angle of the light cone in radians. Defaults to PI / 6. */
    angle?: number;
    /** The penumbra factor (0-1). Defaults to 0.5. */
    penumbra?: number;
    /** The decay factor of the light. Defaults to 2.0. */
    decay?: number;
}

/**
 * A Sprite is a 2D plane that typically always faces the camera.
 */
export declare class Sprite extends Object3D {
    /**
     * Creates a new Sprite.
     * @param material The material for the sprite.
     * @param name The name of the sprite.
     */
    constructor(material?: SpriteMaterial, name?: string);
}

/**
 * Material for rendering 2D sprites.
 */
export declare class SpriteMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The texture to display on the sprite. */
    texture: Texture | undefined;
    /**
     * Creates a new SpriteMaterial.
     * @param options The texture for the sprite or a configuration object.
     */
    constructor(options?: Texture | {
        texture?: Texture;
        color?: Color;
    });
}

/**
 * A camera strategy that rigidly follows a target.
 */
export declare class StiffStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The radius of the camera from the target. */
    radius: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}

/**
 * A terrain geometry generated from height data.
 */
export declare class Terrain extends AbstractGeometry {
    /** The height data. */
    heightData: Float32Array;
    /** The resolution of the heightmap. */
    heightmapResolution: number;
    /** The width of the terrain. */
    width: number;
    /** The depth of the terrain. */
    depth: number;
    /** The maximum height of the terrain. */
    maxHeight: number;
    /** The number of segments along the width. */
    meshWidthSegments: number;
    /** The number of segments along the depth. */
    meshDepthSegments: number;
    /**
     * Protected constructor. Use Terrain.fromHeightData() or Terrain.fromImage() instead.
     * @param options The configuration options.
     */
    protected constructor(options: TerrainDataOptions);
    /**
     * Creates a Terrain from raw height data.
     * @param options The configuration options.
     * @returns A new Terrain instance.
     */
    static fromHeightData(options: TerrainDataOptions): Terrain;
    /**
     * Creates a Terrain from an image.
     * @param options The configuration options.
     * @returns A promise resolving to a new Terrain instance.
     */
    static fromImage(options: TerrainImageOptions): Promise<Terrain>;
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Algorithm for terrain generation.
 */
export declare type TerrainAlgorithm = "DiamondSquare" | "Perlin" | "Simplex";

/**
 * Configuration for terrain from raw data.
 */
export declare interface TerrainDataOptions extends TerrainOptions {
    /** The height data (normalized 0-1). */
    heightData: Float32Array;
    /** The resolution of the heightmap. */
    heightmapResolution: number;
}

/**
 * Strategy for extracting height from color data.
 */
export declare type TerrainHeightStrategy = (r: number, g: number, b: number, a: number, maxHeight?: number) => number;

/**
 * Configuration for terrain from an image.
 */
export declare interface TerrainImageOptions extends TerrainOptions {
    /** The image to use as heightmap. */
    image: HTMLImageElement | ImageBitmap;
    /** The strategy to extract height from image data. Defaults to CENTERED_AVERAGE. */
    strategy?: TerrainHeightStrategy;
}

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
    sandMap: Texture | undefined;
    /** Grass biome texture map. */
    grassMap: Texture | undefined;
    /** Rock biome texture map. */
    rockMap: Texture | undefined;
    /** Snow biome texture map. */
    snowMap: Texture | undefined;
    /** Texture repetition factors. */
    texRepeat: [number, number];
    /** Thresholds for biome transitions: [SandToGrass, GrassToRock, RockToSnow, TransitionSoftness]. */
    thresholds: [number, number, number, number];
    /**
     * Creates a new TerrainMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: TerrainMaterialOptions);
}

/**
 * Configuration options for terrain material.
 */
export declare interface TerrainMaterialOptions {
    /** The base color. Defaults to white. */
    color?: Color;
    /** The shininess factor. Defaults to 10. */
    shininess?: number;
    /** Sand biome texture map. Defaults to undefined. */
    sandMap?: Texture | undefined;
    /** Grass biome texture map. Defaults to undefined. */
    grassMap?: Texture | undefined;
    /** Rock biome texture map. Defaults to undefined. */
    rockMap?: Texture | undefined;
    /** Snow biome texture map. Defaults to undefined. */
    snowMap?: Texture | undefined;
    /** Texture repetition factors. Defaults to [20.0, 20.0]. */
    texRepeat?: [number, number];
    /** Thresholds for biome transitions. Defaults to [2.0, 15.0, 25.0, 2.0]. */
    thresholds?: [number, number, number, number];
}

/**
 * Configuration options for terrain geometry.
 */
export declare interface TerrainOptions {
    /** The width of the terrain. Defaults to 100. */
    width?: number;
    /** The depth of the terrain. Defaults to 100. */
    depth?: number;
    /** The maximum height of the terrain. Defaults to 20. */
    maxHeight?: number;
    /** The number of segments along the width for the mesh. Defaults to 64. */
    meshWidthSegments?: number;
    /** The number of segments along the depth for the mesh. Defaults to 64. */
    meshDepthSegments?: number;
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
     * Flips the texture horizontally by modifying the UV offset and repeat.
     * @returns This texture instance for chaining.
     */
    flipX(): this;
    /**
     * Flips the texture vertically by modifying the UV offset and repeat.
     * @returns This texture instance for chaining.
     */
    flipY(): this;
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
    /** The radius of the torus. */
    radius: number;
    /** The radius of the tube. */
    tube: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of tubular segments. */
    tubularSegments: number;
    /**
     * Creates a new Torus geometry.
     * @param options The configuration options for the torus.
     */
    constructor(options?: TorusOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for torus geometry.
 */
export declare interface TorusOptions {
    /** The radius of the torus. Defaults to 1. */
    radius?: number;
    /** The radius of the tube. Defaults to 0.4. */
    tube?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of tubular segments. Defaults to 32. */
    tubularSegments?: number;
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
 * A hollow cylinder geometry (Tube).
 */
export declare class Tube extends AbstractGeometry {
    /** The outer radius. */
    radius: number;
    /** The inner radius. */
    innerRadius: number;
    /** The height. */
    height: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of height segments. */
    heightSegments: number;
    /**
     * Creates a new Tube geometry.
     * @param options The configuration options.
     */
    constructor(options?: TubeOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}

/**
 * Configuration options for tube geometry.
 */
export declare interface TubeOptions {
    /** The outer radius of the tube. Defaults to 1. */
    radius?: number;
    /** The inner radius of the tube. Defaults to 0.5. */
    innerRadius?: number;
    /** The height of the tube. Defaults to 2. */
    height?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of height segments. Defaults to 1. */
    heightSegments?: number;
}

export declare interface Vector {
    length(): number;
    lengthSq(): number;
    normalize(): Vector;
    scale(s: number): Vector;
}

/**
 * A 2D vector class.
 */
export declare class Vector2D implements Vector {
    /**
     * The x component.
     */
    x: number;
    /**
     * The y component.
     */
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
     * Adds a scalar to this vector.
     * @param s The scalar to add.
     * @returns this
     */
    addScalar(s: number): this;
    /**
     * Multiplies this vector by another.
     * @param v The other vector.
     * @returns this
     */
    multiply(v: Vector2D): this;
    /**
     * Divides this vector by a scalar.
     * @param s The scalar to divide by.
     * @returns this
     */
    divideScalar(s: number): this;
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
export declare class Vector3D implements Vector {
    /** Static zero vector to avoid unnecessary allocations. */
    static readonly ZERO: Vector3D;
    /**
     * The x component.
     */
    x: number;
    /**
     * The y component.
     */
    y: number;
    /**
     * The z component.
     */
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
    set(x: number, y?: number, z?: number): this;
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
     * Adds a scalar value to all components.
     * @param s The scalar to add.
     * @returns this
     */
    addScalar(s: number): this;
    /**
     * Multiplies the vector components by another vector.
     * @param v The vector to multiply by.
     * @returns this
     */
    multiply(v: Vector3D): this;
    /**
     * Divides the vector by a scalar.
     * @param s The scalar to divide by.
     * @returns this
     */
    divideScalar(s: number): this;
    /**
     * Cross product of this vector and another vector.
     * @param v The other vector.
     * @returns this
     */
    cross(v: Vector3D): this;
    /**
     * Calculates the cross product of two vectors and stores the result in this vector.
     * @param a The first vector.
     * @param b The second vector.
     * @returns this
     */
    crossVectors(a: Vector3D, b: Vector3D): this;
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
     * Clamps the vector components between min and max vectors.
     * @param min The minimum vector.
     * @param max The maximum vector.
     * @returns this
     */
    clamp(min: Vector3D, max: Vector3D): this;
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

/**
 * WebGL 1.0 implementation of the renderer.
 */
export declare class WebGL1Renderer extends AbstractWebGLRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
    protected gl: WebGLRenderingContext;
    private _programs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>): Promise<void>;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
    private _drawSkybox;
    private _drawNormal;
}

/**
 * WebGL 2.0 implementation of the renderer.
 */
export declare class WebGL2Renderer extends AbstractWebGLRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
    protected gl: WebGL2RenderingContext;
    private _programs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    private _scratchModelMatrix;
    private _scratchVec3;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>): Promise<void>;
    private _getProgram;
    private _getWebGLTexture;
    private _getWebGLCubeTexture;
    /** @inheritdoc */
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
    /**
     * Internal skybox draw function.
     * @private
     */
    private _drawSkybox;
    /**
     * Internal normal object draw function.
     * @private
     */
    private _drawNormal;
}

/**
 * WebGPU implementation of the renderer.
 */
export declare class WebGPURenderer extends AbstractRenderer {
    /** @inheritdoc */
    readonly type: RendererType;
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
    private _cubeTextureViewCache;
    private _cubeTexBindGroupCache;
    private _terrainTexCache;
    private _samplerCache;
    private _depthTexture;
    /** @inheritdoc */
    initialize(canvas: HTMLCanvasElement, attributes?: Record<string, unknown>): Promise<void>;
    destroy(): void;
    private _getTextureView;
    private _getGPUCubeTextureView;
    private _getSampler;
    private _getGeoCache;
    private _getObjCache;
    private _getGPUTextureBindGroup;
    private _getGPUCubeTextureBindGroup;
    private _getGPUTerrainBindGroup;
    /** @inheritdoc */
    render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    /** @inheritdoc */
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
