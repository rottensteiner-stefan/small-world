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
    /** Physically based rendering material. */
    readonly STANDARD: "StandardMaterial";
    /** Material for wireframe rendering. */
    readonly WIREFRAME: "WireframeMaterial";
    /** Material for sprites. */
    readonly SPRITE: "SpriteMaterial";
    /** Special triplanar mapping material for seamless tiling. */
    readonly WORLD: "WorldMaterial";
    /** Specialized animated lava material. */
    readonly LAVA: "LavaMaterial";
    /** Specialized animated toxic slime material. */
    readonly SLIME: "SlimeMaterial";
    /** Specialized fluid material. */
    readonly FLUID: "FluidMaterial";
};
/** Type definition for MaterialType. */
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
