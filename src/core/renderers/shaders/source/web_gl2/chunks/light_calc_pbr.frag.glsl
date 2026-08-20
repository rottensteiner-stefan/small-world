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
    vec3 L = normalize(-u_dirLightDir);
    vec3 H = normalize(V + L);
    float dotNL = max(dot(N, L), 0.0);
    float dotNH = max(dot(N, H), 0.0);
    float dotVH = max(dot(V, H), 0.0);

    float dirShadow = 1.0;
    if (u_dirShadowInfo.z > 0.5 && u_dirShadowInfo.w > 0.0) {
        float depth = length(u_viewPos - v_worldPos);
        int numCascades = int(u_dirShadowInfo.w);
        int cascadeIndex = numCascades - 1;
        for (int i = 0; i < 4; i++) {
            if (i >= numCascades) break;
            if (depth < u_cascadeSplits[i]) {
                cascadeIndex = i;
                break;
            }
        }

        // Cascade blending (see non-PBR light_calc.frag.glsl for rationale).
        float blendToNext = 0.0;
        if (cascadeIndex < numCascades - 1) {
            float splitFar = u_cascadeSplits[cascadeIndex];
            float blendBand = max(splitFar * 0.1, 0.0001);
            blendToNext = 1.0 - clamp((splitFar - depth) / blendBand, 0.0, 1.0);
        }

        // Normal-offset bias (see non-PBR light_calc.frag.glsl for rationale).
        vec3 dirShadowSamplePos = v_worldPos + N * u_dirShadowInfo.y * (1.0 - dotNL);
        float cols = ceil(sqrt(u_dirShadowInfo.w));
        float bias = u_dirShadowInfo.x;
        vec2 texelSize = 1.0 / vec2(textureSize(u_dirShadowMap, 0));

        vec4 lightSpacePos = u_cascadeMatrices[cascadeIndex] * vec4(dirShadowSamplePos, 1.0);
        vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
        projCoords = projCoords * 0.5 + 0.5;

        float shadowA = 1.0;
        if (projCoords.z <= 1.0 && projCoords.x >= 0.0 && projCoords.x <= 1.0 && projCoords.y >= 0.0 && projCoords.y <= 1.0) {
            float col = mod(float(cascadeIndex), cols);
            float row = floor(float(cascadeIndex) / cols);
            vec2 cellMin = vec2(col, row) / cols;
            vec2 cellMax = cellMin + vec2(1.0) / cols;
            vec2 atlasUV = (projCoords.xy + vec2(col, row)) / cols;
            float currentDepth = projCoords.z;

            // PCSS (see non-PBR light_calc.frag.glsl for full rationale).
            const int PCSS_TAPS = 8;
            vec2 searchOffsets[PCSS_TAPS];
            searchOffsets[0] = vec2(-1.0, -1.0);
            searchOffsets[1] = vec2(0.0, -1.0);
            searchOffsets[2] = vec2(1.0, -1.0);
            searchOffsets[3] = vec2(-1.0, 0.0);
            searchOffsets[4] = vec2(1.0, 0.0);
            searchOffsets[5] = vec2(-1.0, 1.0);
            searchOffsets[6] = vec2(0.0, 1.0);
            searchOffsets[7] = vec2(1.0, 1.0);

            float searchRadiusTexels = 2.0;
            float avgBlockerDepth = 0.0;
            float blockerCount = 0.0;
            for (int s = 0; s < PCSS_TAPS; s++) {
                vec2 sampleUV = clamp(
                    atlasUV + searchOffsets[s] * texelSize * searchRadiusTexels,
                    cellMin, cellMax
                );
                float blockerDepth = texture(u_dirShadowMapRaw, sampleUV).r;
                if (blockerDepth < currentDepth - bias) {
                    avgBlockerDepth += blockerDepth;
                    blockerCount += 1.0;
                }
            }

            if (blockerCount < 1.0) {
                shadowA = 1.0;
            } else {
                avgBlockerDepth /= blockerCount;
                float occluderDepthDelta = currentDepth - avgBlockerDepth;
                float pcfRadius = clamp(1.0 + occluderDepthDelta / max(bias, 0.0001), 1.0, 4.0);

                shadowA = 0.0;
                for(int x = -1; x <= 1; ++x) {
                    for(int y = -1; y <= 1; ++y) {
                        vec2 tapUV = clamp(atlasUV + vec2(x, y) * texelSize * pcfRadius, cellMin, cellMax);
                        shadowA += texture(u_dirShadowMap, vec3(tapUV, currentDepth - bias));
                    }
                }
                shadowA /= 9.0;
            }
        }

        float shadowB = shadowA;
        if (blendToNext > 0.0) {
            int nextCascade = cascadeIndex + 1;
            vec4 lightSpacePosB = u_cascadeMatrices[nextCascade] * vec4(dirShadowSamplePos, 1.0);
            vec3 projCoordsB = lightSpacePosB.xyz / lightSpacePosB.w;
            projCoordsB = projCoordsB * 0.5 + 0.5;

            shadowB = 1.0;
            if (projCoordsB.z <= 1.0 && projCoordsB.x >= 0.0 && projCoordsB.x <= 1.0 && projCoordsB.y >= 0.0 && projCoordsB.y <= 1.0) {
                float colB = mod(float(nextCascade), cols);
                float rowB = floor(float(nextCascade) / cols);
                vec2 atlasUVB = (projCoordsB.xy + vec2(colB, rowB)) / cols;
                float currentDepthB = projCoordsB.z;

                shadowB = 0.0;
                for(int x = -1; x <= 1; ++x) {
                    for(int y = -1; y <= 1; ++y) {
                        shadowB += texture(u_dirShadowMap, vec3(atlasUVB + vec2(x, y) * texelSize, currentDepthB - bias));
                    }
                }
                shadowB /= 9.0;
            }
        }

        dirShadow = mix(shadowA, shadowB, blendToNext);
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
for(int i = 0; i < 16; i++) {
    if (i >= u_numPointLights) break;
    vec3 lightVec = u_pointLights[i].pos - v_worldPos;
    float dist = length(lightVec);
    vec3 L = normalize(lightVec);
    vec3 H = normalize(V + L);

    // Compute attenuation
    float lightDistance = max(u_pointLights[i].distance, 0.001);
    float decay = u_pointLights[i].decay;
    
    // PBR physically based attenuation: 1 / (distance^2)
    float distanceFalloff = 1.0 / max(dist * dist, 0.01);
    
    // Windowing function to zero out light at max distance
    float distRatio = dist / lightDistance;
    float distRatio4 = distRatio * distRatio * distRatio * distRatio;
    float window = clamp(1.0 - distRatio4, 0.0, 1.0);
    float cutoff = window * window;
    
    // If decay is 0, we don't fall off physically, we just do linear/constant
    float attenuation = (decay > 0.0) ? (distanceFalloff * cutoff) : clamp(1.0 - dist / lightDistance, 0.0, 1.0);
    vec3 radiance = u_pointLights[i].color * attenuation;

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
for(int i = 0; i < 16; i++) {
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

// -- Ambient IBL --
vec3 kS_ambient = F_SchlickRoughness(dotNV, F0, roughness);
vec3 kD_ambient = 1.0 - kS_ambient;
kD_ambient *= 1.0 - metallic;

// Diffuse
vec3 irradiance = texture(u_irradianceMap, N).rgb * u_envIntensity;
vec3 diffuseAmbient = irradiance * albedo;

// Specular
vec3 R = reflect(-V, N);
const float MAX_REFLECTION_LOD = 4.0;
vec3 prefilteredColor = textureLod(u_prefilterMap, R, roughness * MAX_REFLECTION_LOD).rgb * u_envIntensity;
vec2 envBRDF  = texture(u_brdfLUT, vec2(max(dotNV, 0.0), roughness)).rg;
vec3 specularAmbient = prefilteredColor * (kS_ambient * envBRDF.x + envBRDF.y);

vec3 ambient = (kD_ambient * diffuseAmbient + specularAmbient) * ao;

// Fallback if IBL is not bound (irradiance is black)
if (length(irradiance) < 0.001) {
    vec3 f_fallback = F_Schlick(dotNV, F0);
    vec3 kD_fallback = (1.0 - f_fallback) * (1.0 - metallic);
    ambient = (kD_fallback * u_ambientColor * albedo) * ao;
    
    // Per-material envMap fallback
    if (u_useEnvMap > 0.5) {
        float lod = roughness * 5.0;
        vec3 envColor = sRGBToLinear(textureLod(u_envMap, R, lod).rgb);
        ambient += (envColor * f_fallback) * ao;
    }
}

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

fragColor = vec4(color, u_color.a * texColor.a);

if (fragColor.a < u_extraParams.y) {
    discard;
}
