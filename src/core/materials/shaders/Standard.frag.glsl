[BASE_FRAGMENT_HEADER]
[FOG_DEFS]
[LIGHT_DEFS]
[PBR_MATH]

uniform float u_metallic;
uniform float u_roughness;
uniform float u_ao;

uniform sampler2D u_metallicMap;
uniform sampler2D u_roughnessMap;
uniform sampler2D u_emissiveMap;
uniform sampler2D u_alphaMap;
uniform samplerCube u_envMap;
uniform sampler2D u_reflectionMap;

uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;
uniform float u_useEnvMap;
uniform float u_useReflectionMap;
uniform float u_reflectivity;

void main() {
    // Reconstruct original UV for static alpha map
    vec2 original_uv = v_uv / u_texRepeat;

    // Convert sampled albedo to linear space
    vec4 texColor = texture(u_diffuseMap, v_uv);
    
    texColor.a *= texture(u_alphaMap, original_uv).r;

    if (texColor.a < u_extraParams.y) {
        discard;
    }

    vec3 albedo = sRGBToLinear(texColor.rgb) * sRGBToLinear(u_color.rgb);
    
    float metallic = u_metallic * texture(u_metallicMap, v_uv).b;
    float roughness = clamp(u_roughness * texture(u_roughnessMap, v_uv).g, 0.05, 1.0); // Avoid divide by zero
    float ao = u_ao;

    [LIGHT_CALC_PBR]
    
    if (u_useReflectionMap > 0.5) {
        vec4 clipPos = u_vp * vec4(v_worldPos, 1.0);
        vec2 ndc = clipPos.xy / clipPos.w;
        vec2 screenUV = ndc * 0.5 + 0.5;
        vec3 reflectionColor = sRGBToLinear(texture(u_reflectionMap, screenUV).rgb);
        
        // Blend based on reflectivity and fresnel or fixed factor
        float f = u_reflectivity * mix(1.0, F_Schlick(max(dot(normalize(v_normal), V), 0.0), F0).x, 0.5); // simple approx
        fragColor.rgb = mix(fragColor.rgb, reflectionColor, f);
    }
    
    [FOG_CALC]
}