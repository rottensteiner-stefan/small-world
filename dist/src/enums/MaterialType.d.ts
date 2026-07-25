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
    /** Specialized material for fluid surfaces with depth fade. */
    readonly FLUID_SURFACE: "FluidSurfaceMaterial";
    /** Depth material for shadow mapping. */
    readonly DEPTH: "DepthMaterial";
    /** Physically based rendering material with transmission/refraction. */
    readonly GLASS: "GlassMaterial";
    /** Specialized screen shader with retro TV and early film effects. */
    readonly RETRO_SCREEN: "RetroScreenMaterial";
};
/** Type definition for MaterialType. */
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
