/**
 * Supported data types for shader properties.
 */
export declare const ShaderPropertyType: {
    /** Single float value. */
    readonly FLOAT: "float";
    /** 2-component vector. */
    readonly VEC2: "vec2";
    /** 3-component vector. */
    readonly VEC3: "vec3";
    /** 4-component vector. */
    readonly VEC4: "vec4";
    /** 4x4 matrix. */
    readonly MAT4: "mat4";
    /** Color value (RGBA). */
    readonly COLOR: "color";
    /** Texture sampler. */
    readonly TEXTURE: "texture";
};
/** Type definition for ShaderPropertyType. */
export type ShaderPropertyType = (typeof ShaderPropertyType)[keyof typeof ShaderPropertyType];
