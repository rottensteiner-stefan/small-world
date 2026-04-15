/**
 * Supported data types for shader properties.
 */
export declare const ShaderPropertyType: {
    readonly FLOAT: "float";
    readonly VEC2: "vec2";
    readonly VEC3: "vec3";
    readonly VEC4: "vec4";
    readonly MAT4: "mat4";
    readonly COLOR: "color";
    readonly TEXTURE: "texture";
};
/** Type definition for ShaderPropertyType. */
export type ShaderPropertyType = (typeof ShaderPropertyType)[keyof typeof ShaderPropertyType];
