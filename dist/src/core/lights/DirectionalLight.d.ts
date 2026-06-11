import { AbstractLight, LightOptions } from './AbstractLight.js';
import { LightType } from '../../enums/index.js';
import { Vector3D } from '../../math/Vector3D.js';
import { LightDataInterface } from '../../interfaces/index.js';
import { Camera } from '../Camera.js';
/**
 * Configuration options for directional light.
 */
export interface DirectionalLightOptions extends LightOptions {
    /** The direction of the light. Defaults to (0, -1, 0). */
    direction?: Vector3D;
    /** Number of shadow cascades. Defaults to 4. */
    numCascades?: number;
    /** Ratio between uniform and logarithmic split (0.0 = uniform, 1.0 = logarithmic). Defaults to 0.5. */
    cascadeSplitLambda?: number;
}
/**
 * Directional light that emits light in a specific direction.
 */
export declare class DirectionalLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The direction of the light. */
    direction: Vector3D;
    /** Number of shadow cascades. */
    numCascades: number;
    /** Ratio between uniform and logarithmic split. */
    cascadeSplitLambda: number;
    /** The shadow cameras for each cascade. */
    cascadeCameras: Camera[];
    /** The far depth split distances for each cascade. */
    cascadeSplits: number[];
    private readonly _corners;
    private readonly _center;
    private readonly _forward;
    private readonly _right;
    private readonly _up;
    private readonly _nearCenter;
    private readonly _farCenter;
    private readonly _lightPos;
    private readonly _lightUp;
    /**
     * Creates a new DirectionalLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: DirectionalLightOptions);
    /**
     * Updates the shadow cascades based on the main camera's frustum.
     * @param cam The main camera interface data.
     */
    updateCascades(cam: import('../../interfaces/index.js').CameraInterfaceData): void;
    private _updateFrustumCorners;
    private _setCorner;
    /** @inheritdoc */
    applyTo(data: LightDataInterface): void;
}
