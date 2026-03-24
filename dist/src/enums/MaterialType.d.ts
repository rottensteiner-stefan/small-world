export declare const MaterialType: {
    readonly BASIC: "BasicMaterial";
    readonly LAMBERT: "LambertMaterial";
    readonly PHONG: "PhongMaterial";
    readonly SKYBOX: "SkyboxMaterial";
    readonly TERRAIN: "TerrainMaterial";
    readonly WIREFRAME: "WireframeMaterial";
};
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
