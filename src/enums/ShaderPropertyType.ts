/// src/enums/ShaderPropertyType.ts

/**
 * Supported data types for shader properties.
 */
export const ShaderPropertyType = {
  FLOAT: "float",
  VEC2: "vec2",
  VEC3: "vec3",
  VEC4: "vec4",
  MAT4: "mat4",
  COLOR: "color",
  TEXTURE: "texture",
} as const;

/** Type definition for ShaderPropertyType. */
export type ShaderPropertyType = (typeof ShaderPropertyType)[keyof typeof ShaderPropertyType];
