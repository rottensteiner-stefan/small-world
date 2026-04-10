/// src/core/renderers/shaders/ShaderDefinition.ts

import { Color } from "../../colors/Color.js";

/**
 * Defines the types of data that can be passed to a shader.
 */
export type ShaderPropertyType = "float" | "vec2" | "vec3" | "vec4" | "mat4" | "color" | "texture";

/**
 * Metadata for a shader property.
 */
export interface ShaderPropertyMetadata {
  type: ShaderPropertyType;
  defaultValue?: any;
}

/**
 * Defines the requirements of a shader.
 */
export interface ShaderLayout {
  /** Map of uniform names to their metadata. */
  uniforms: Record<string, ShaderPropertyMetadata>;
  /** Map of texture names to their metadata. */
  textures: Record<string, ShaderPropertyMetadata>;
}

/**
 * Defines a shader for all supported APIs.
 */
export interface ShaderDefinition {
  /** Unique ID of the shader. */
  id: string;
  /** Shader sources for different APIs. */
  sources: {
    wgsl?: string;
    glsl300?: { vs: string; fs: string };
    glsl100?: { vs: string; fs: string };
  };
  /** The data layout expected by this shader. */
  layout: ShaderLayout;
  /** Optional default state for the GPU pipeline. */
  defaultState?: {
    culling?: "back" | "front" | "none";
    blending?: "alpha" | "opaque" | "additive";
    depthWrite?: boolean;
    transparent?: boolean;
  };
}
