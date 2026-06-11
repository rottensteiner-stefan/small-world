vec3 V = normalize(u_viewPos - v_worldPos);
vec3 rawNormal = texture(u_normalMap, v_uv).rgb * 2.0 - 1.0;
rawNormal.xy *= u_extraParams.zw;
vec3 N = normalize(v_tbn * rawNormal);
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

    float dirShadow = 1.0;
    if (u_dirShadowInfo.z > 0.5 && u_dirShadowInfo.w > 0.0) {
        float depth = length(u_viewPos - v_worldPos);
        int cascadeIndex = int(u_dirShadowInfo.w) - 1;
        for (int i = 0; i < 4; i++) {
            if (i >= int(u_dirShadowInfo.w)) break;
            if (depth < u_cascadeSplits[i]) {
                cascadeIndex = i;
                break;
            }
        }
        
        vec4 lightSpacePos = u_cascadeMatrices[cascadeIndex] * vec4(v_worldPos, 1.0);
        vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
        projCoords = projCoords * 0.5 + 0.5;
        
        if (projCoords.z <= 1.0 && projCoords.x >= 0.0 && projCoords.x <= 1.0 && projCoords.y >= 0.0 && projCoords.y <= 1.0) {
            float cols = ceil(sqrt(u_dirShadowInfo.w));
            float col = mod(float(cascadeIndex), cols);
            float row = floor(float(cascadeIndex) / cols);
            
            vec2 atlasUV = (projCoords.xy + vec2(col, row)) / cols;
            float bias = u_dirShadowInfo.x;
            float currentDepth = projCoords.z;
            
            dirShadow = 0.0;
            vec2 texelSize = 1.0 / vec2(textureSize(u_dirShadowMap, 0));
            for(int x = -1; x <= 1; ++x) {
                for(int y = -1; y <= 1; ++y) {
                    dirShadow += texture(u_dirShadowMap, vec3(atlasUV + vec2(x, y) * texelSize, currentDepth - bias));
                }
            }
            dirShadow /= 9.0;
        }
    }

    vec3 radiance = u_dirLightColor * dirShadow;

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

// -- Spot Lights --
for(int i = 0; i < 4; i++) {
    if (i >= u_numSpotLights) break;
    vec3 lightVec = u_spotLights[i].pos - v_worldPos;
    float dist = length(lightVec);
    vec3 L = normalize(lightVec);
    vec3 H = normalize(V + L);

    vec3 spotDir = normalize(u_spotLights[i].dir);
    float cosOuter = u_spotLights[i].params.x;
    float cosInner = u_spotLights[i].params.y;
    float maxDist = u_spotLights[i].params.z;
    float decay = u_spotLights[i].params.w;

    float theta = dot(-L, spotDir);
    float epsilon = max(cosInner - cosOuter, 0.0001);
    float intensity = clamp((theta - cosOuter) / epsilon, 0.0, 1.0);

    if (intensity > 0.0 && dist < maxDist) {
        float distanceAttenuation = pow(clamp(1.0 - dist / maxDist, 0.0, 1.0), decay);
        float attenuation = distanceAttenuation * intensity;
        
        // Shadow Calculation
        float shadow = 1.0;
        if (u_spotShadowInfo[i].z > 0.5) {
            vec3 projCoords = v_spotLightSpacePos[i].xyz / v_spotLightSpacePos[i].w;
            projCoords = projCoords * 0.5 + 0.5;
            if (projCoords.x >= 0.0 && projCoords.x <= 1.0 && projCoords.y >= 0.0 && projCoords.y <= 1.0 && projCoords.z <= 1.0) {
                float bias = u_spotShadowInfo[i].x;
                float currentDepth = projCoords.z;
                shadow = 0.0;
                vec2 texelSize;
                if (i == 0) texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[0], 0));
                else if (i == 1) texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[1], 0));
                else if (i == 2) texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[2], 0));
                else texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[3], 0));

                for(int x = -1; x <= 1; ++x) {
                    for(int y = -1; y <= 1; ++y) {
                        vec3 tCoord = vec3(projCoords.xy + vec2(x, y) * texelSize, currentDepth - bias);
                        if (i == 0) shadow += texture(u_spotShadowMap[0], tCoord);
                        else if (i == 1) shadow += texture(u_spotShadowMap[1], tCoord);
                        else if (i == 2) shadow += texture(u_spotShadowMap[2], tCoord);
                        else shadow += texture(u_spotShadowMap[3], tCoord);
                    }
                }
                shadow /= 9.0;
            }
        }

        vec3 radiance = u_spotLights[i].color * attenuation * shadow;

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
}

vec3 ambient = u_ambientColor * albedo * ao;
vec3 color = ambient + Lo;

// Emissive
vec3 emissive = sRGBToLinear(texture(u_emissiveMap, v_uv).rgb) * sRGBToLinear(u_specColor.rgb) * u_specColor.a;
color += emissive;

// Exposure
color *= u_exposure;

// Simple HDR Tone Mapping
color = color / (color + vec3(1.0));
// Gamma Correction
color = linearToSRGB(color);

fragColor = vec4(color, u_color.a * texture(u_diffuseMap, v_uv).a);

if (fragColor.a < u_extraParams.y) {
    discard;
}
