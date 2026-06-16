vec3 V = normalize(u_viewPos - v_worldPos);
vec3 rawNormal = texture2D(u_normalMap, v_uv).rgb * 2.0 - 1.0;
rawNormal.xy *= u_extraParams.zw;
vec3 N = normalize(v_tbn * rawNormal);
float dotNV = max(dot(N, V), 0.0001);

vec3 F0 = vec3(0.04); 
F0 = mix(F0, albedo, metallic);

vec3 Lo = vec3(0.0);

// Directional Light
{
    vec3 L = normalize(u_dirLightDir);
    vec3 H = normalize(V + L);
    float dotNL = max(dot(N, L), 0.0);
    float dotNH = max(dot(N, H), 0.0);
    float dotVH = max(dot(V, H), 0.0);

    vec3 radiance = u_dirLightColor;

    float D = D_GGX(dotNH, roughness);
    float G = G_SchlickGGX(dotNL, dotNV, roughness);
    vec3 F = F_Schlick(dotVH, F0);

    vec3 kS = F;
    vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

    vec3 specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
    Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
}

// -- Point Lights --
for(int i = 0; i < 4; i++) {
    if (i >= u_numPointLights) break;
    vec3 lightVec = u_pointLightPos[i] - v_worldPos;
    float dist = length(lightVec);
    vec3 L = normalize(lightVec);
    vec3 H = normalize(V + L);

    // Compute attenuation
    float lightDistance = max(u_pointLightDistance[i], 0.001);
    float decay = u_pointLightDecay[i];
    
    // PBR physically based attenuation: 1 / (distance^2)
    float distanceFalloff = 1.0 / max(dist * dist, 0.01);
    
    // Windowing function to zero out light at max distance
    float distRatio = dist / lightDistance;
    float distRatio4 = distRatio * distRatio * distRatio * distRatio;
    float window = clamp(1.0 - distRatio4, 0.0, 1.0);
    float cutoff = window * window;
    
    // If decay is 0, we don't fall off physically, we just do linear/constant
    float attenuation = (decay > 0.0) ? (distanceFalloff * cutoff) : clamp(1.0 - dist / lightDistance, 0.0, 1.0);
    vec3 radiance = u_pointLightColor[i] * attenuation;

    float dotNL = max(dot(N, L), 0.0);
    float dotNH = max(dot(N, H), 0.0);
    float dotVH = max(dot(V, H), 0.0);

    float D = D_GGX(dotNH, roughness);
    float G = G_SchlickGGX(dotNL, dotNV, roughness);
    vec3 F = F_Schlick(dotVH, F0);

    vec3 kS = F;
    vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

    vec3 specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
    Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
}

vec3 irradiance = u_ambientColor;
vec3 diffuseAmbient = irradiance * albedo;
vec3 specularAmbient = vec3(0.0);

if (u_useEnvMap > 0.5) {
    vec3 R = reflect(-V, N);
    // In WebGL1, textureCubeLod is not universally available without extension, 
    // so we just sample the base cubemap or let hardware handle mip-mapping.
    vec3 envColor = sRGBToLinear(textureCube(u_envMap, R).rgb);
    
    vec3 F_env = F_Schlick(dotNV, F0);
    specularAmbient = envColor * F_env;
}

vec3 ambient = (diffuseAmbient * (1.0 - metallic) + specularAmbient) * ao;
if (u_useEnvMap <= 0.5) {
    ambient = u_ambientColor * albedo * ao;
}
vec3 color = ambient + Lo;

// Emissive
vec3 emissive = sRGBToLinear(texture2D(u_emissiveMap, v_uv).rgb) * sRGBToLinear(u_specColor.rgb) * u_specColor.a;
color += emissive;

color = color / (color + vec3(1.0));
color = linearToSRGB(color);

gl_FragColor = vec4(color, u_color.a * texture2D(u_diffuseMap, v_uv).a);
if (gl_FragColor.a < u_extraParams.y) {
    discard;
}
