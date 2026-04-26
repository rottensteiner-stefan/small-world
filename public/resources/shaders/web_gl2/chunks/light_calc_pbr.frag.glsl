vec3 V = normalize(u_viewPos - v_worldPos);
vec3 N = normalize(v_tbn * (texture(u_normalMap, v_uv).rgb * 2.0 - 1.0));
float dotNV = max(dot(N, V), 0.0001);

// Base Reflectivity for non-metals
vec3 F0 = vec3(0.04); 
F0 = mix(F0, albedo, metallic);

vec3 Lo = vec3(0.0);

// -- Directional Light --
{
    vec3 L = normalize(u_dirLightDir);
    vec3 H = normalize(V + L);
    float dotNL = max(dot(N, L), 0.0);
    float dotNH = max(dot(N, H), 0.0);
    float dotVH = max(dot(V, H), 0.0);

    vec3 radiance = u_dirLightColor;

    // Cook-Torrance BRDF
    float D = D_GGX(dotNH, roughness);
    float G = G_SchlickGGX(dotNL, dotNV, roughness);
    vec3 F = F_Schlick(dotVH, F0);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;

    vec3 numerator = D * G * F;
    float denominator = 4.0 * dotNV * dotNL + 0.0001;
    vec3 specular = numerator / denominator;

    Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
}

// -- Point Lights --
for(int i = 0; i < u_numPointLights; ++i) {
    vec3 lightVec = u_pointLightPos[i] - v_worldPos;
    float dist = length(lightVec);
    vec3 L = normalize(lightVec);
    vec3 H = normalize(V + L);

    float attenuation = 1.0 / (dist * dist);
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

vec3 ambient = u_ambientColor * albedo * ao;
vec3 color = ambient + Lo;

// Exposure
color *= u_exposure;

// Simple HDR Tone Mapping
color = color / (color + vec3(1.0));
// Gamma Correction
color = linearToSRGB(color);

fragColor = vec4(color, u_color.a * texture(u_diffuseMap, v_uv).a);
