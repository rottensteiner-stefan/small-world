import { AbstractLight, LightOptions } from './AbstractLight.js';
import { LightType } from '../../enums/index.js';
import { LightDataInterface } from '../../interfaces/index.js';
import { Vector3D } from '../../math/index.js';
/**
 * Configuration options for spotlight.
 */
export interface SpotLightOptions extends LightOptions {
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
    /**
     * Updates the shadow camera's matrices based on the spotlight's properties.
     */
    updateShadowCamera(): void;
    /** @inheritdoc */
    applyTo(data: LightDataInterface): void;
}
