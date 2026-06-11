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
export type LightType = (typeof LightType)[keyof typeof LightType];
