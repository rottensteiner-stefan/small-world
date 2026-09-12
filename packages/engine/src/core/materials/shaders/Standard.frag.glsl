[BASE_FRAGMENT_HEADER]
[FOG_DEFS]
[LIGHT_DEFS]
[PBR_MATH]

uniform float u_metallic;
uniform float u_roughness;
uniform float u_ao;

#ifdef USE_METALLIC_MAP
uniform sampler2D u_metallicMap;
#endif
#ifdef USE_ROUGHNESS_MAP
uniform sampler2D u_roughnessMap;
#endif
#ifdef USE_AO_MAP
uniform sampler2D u_aoMap;
#endif
#ifdef USE_EMISSIVE_MAP
uniform sampler2D u_emissiveMap;
#endif
#ifdef USE_ALPHA_MAP
uniform sampler2D u_alphaMap;
#endif
#ifdef USE_ENV_MAP
uniform samplerCube u_envMap;
#endif
#ifdef USE_REFLECTION_MAP
uniform sampler2D u_reflectionMap;
#endif

uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;
uniform float u_useEnvMap;
uniform float u_useReflectionMap;
uniform float u_reflectivity;
uniform float u_time;

void main() {
    // Reconstruct original UV for static alpha map
    vec2 original_uv = v_uv / u_texRepeat;

    // Convert sampled albedo to linear space
#if defined(USE_INSTANCING) && defined(USE_TEXTURE_ARRAY)
    vec4 texColor = texture(u_diffuseMap, vec3(v_uv, v_texIndex));
#else
    vec4 texColor = texture(u_diffuseMap, v_uv);
#endif
    
#ifdef USE_ALPHA_MAP
    texColor.a *= texture(u_alphaMap, original_uv).r;
#endif

    if (texColor.a < u_extraParams.y) {
        discard;
    }

    vec3 albedo = sRGBToLinear(texColor.rgb) * sRGBToLinear(u_color.rgb);
    
#ifdef USE_METALLIC_MAP
    float metallic = u_metallic * texture(u_metallicMap, v_uv).b;
#else
    float metallic = u_metallic;
#endif

#ifdef USE_ROUGHNESS_MAP
    float roughness = clamp(u_roughness * texture(u_roughnessMap, v_uv).g, 0.05, 1.0); // Avoid divide by zero
#else
    float roughness = clamp(u_roughness, 0.05, 1.0);
#endif

#ifdef USE_AO_MAP
    float ao = u_ao * texture(u_aoMap, v_uv).r;
#else
    float ao = u_ao;
#endif

    [LIGHT_CALC_PBR]
    
#ifdef USE_REFLECTION_MAP
    if (u_useReflectionMap > 0.5) {
        vec4 clipPos = u_vp * vec4(v_worldPos, 1.0);
        vec2 ndc = clipPos.xy / clipPos.w;
        vec2 screenUV = ndc * 0.5 + 0.5;
        vec3 reflectionColor = sRGBToLinear(texture(u_reflectionMap, screenUV).rgb);
        
        // Blend based on reflectivity and fresnel or fixed factor
        float f = u_reflectivity * mix(1.0, F_Schlick(max(dot(normalize(v_normal), V), 0.0), F0).x, 0.5); // simple approx
        fragColor.rgb = mix(fragColor.rgb, reflectionColor, f);
    }
#endif
    
    [FOG_CALC]
}