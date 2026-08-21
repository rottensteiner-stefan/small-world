import { ShaderPropertyType } from "../../../enums/index.js";

/**
 * The standard uniform layout for objects using the [WGSL_STRUCTS] chunk.
 * This MUST match the ObjectUniforms struct in structs.wgsl.
 */
export const StandardWebGPULayout = {
  uniforms: {
    u_model: { type: ShaderPropertyType.MAT4 },
    u_color: { type: ShaderPropertyType.COLOR },
    u_specColor: { type: ShaderPropertyType.COLOR },
    u_texOffset: { type: ShaderPropertyType.VEC2 },
    u_texRepeat: { type: ShaderPropertyType.VEC2 },
    u_shininess: { type: ShaderPropertyType.FLOAT },
    u_isTerrain: { type: ShaderPropertyType.FLOAT },
    u_metallic: { type: ShaderPropertyType.FLOAT },
    u_roughness: { type: ShaderPropertyType.FLOAT },
    u_extraParams: { type: ShaderPropertyType.VEC4 },
    u_liquidParams: { type: ShaderPropertyType.VEC4 },
    u_thresholds: { type: ShaderPropertyType.VEC4 },
    u_useEnvMap: { type: ShaderPropertyType.FLOAT, defaultValue: 0 },
    u_useReflectionMap: { type: ShaderPropertyType.FLOAT, defaultValue: 0 },
    u_reflectivity: { type: ShaderPropertyType.FLOAT, defaultValue: 1.0 },
    u_time: { type: ShaderPropertyType.FLOAT, defaultValue: 0.0 },
  },
  uniformLayout: [
    "u_model",
    "u_color",
    "u_specColor",
    "u_texOffset",
    "u_texRepeat",
    "u_shininess",
    "u_isTerrain",
    "u_metallic",
    "u_roughness",
    "u_extraParams",
    "u_liquidParams",
    "u_thresholds",
    "u_useEnvMap",
    "u_useReflectionMap",
    "u_reflectivity",
    "u_time",
  ],
  textures: {
    u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
    u_normalMap: { type: ShaderPropertyType.TEXTURE },
    u_metallicMap: { type: ShaderPropertyType.TEXTURE },
    u_roughnessMap: { type: ShaderPropertyType.TEXTURE },
    u_emissiveMap: { type: ShaderPropertyType.TEXTURE },
    u_alphaMap: { type: ShaderPropertyType.TEXTURE },
    u_envMap: { type: ShaderPropertyType.TEXTURE },
    u_reflectionMap: { type: ShaderPropertyType.TEXTURE },
    u_aoMap: { type: ShaderPropertyType.TEXTURE },
  },
};
