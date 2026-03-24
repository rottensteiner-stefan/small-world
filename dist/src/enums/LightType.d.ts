export declare const LightType: {
    readonly AMBIENT: "AmbientLight";
    readonly AREA: "AreaLight";
    readonly DIRECTIONAL: "DirectionalLight";
    readonly POINT: "PointLight";
    readonly SPOT: "SpotLight";
};
export type LightType = (typeof LightType)[keyof typeof LightType];
