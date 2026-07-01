/**
 * The standard uniform layout for objects using the [WGSL_STRUCTS] chunk.
 * This MUST match the ObjectUniforms struct in structs.wgsl.
 */
export declare const StandardWebGPULayout: {
    uniforms: {
        u_model: {
            type: "mat4";
        };
        u_color: {
            type: "color";
        };
        u_specColor: {
            type: "color";
        };
        u_texOffset: {
            type: "vec2";
        };
        u_texRepeat: {
            type: "vec2";
        };
        u_shininess: {
            type: "float";
        };
        u_isTerrain: {
            type: "float";
        };
        u_metallic: {
            type: "float";
        };
        u_roughness: {
            type: "float";
        };
        u_extraParams: {
            type: "vec4";
        };
        u_liquidParams: {
            type: "vec4";
        };
        u_thresholds: {
            type: "vec4";
        };
        u_useEnvMap: {
            type: "float";
            defaultValue: number;
        };
        u_useReflectionMap: {
            type: "float";
            defaultValue: number;
        };
        u_reflectivity: {
            type: "float";
            defaultValue: number;
        };
        _padObj2: {
            type: "float";
            defaultValue: number;
        };
    };
    uniformLayout: string[];
};
