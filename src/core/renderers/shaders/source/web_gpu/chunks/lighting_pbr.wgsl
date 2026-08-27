// WGSL PBR Lighting calculation (Logic only)

let V = normalize(global.viewPos.xyz - i.wp);
let TBN = mat3x3f(normalize(i.t), normalize(i.b), normalize(i.n));
var rawNormal = textureSample(u_normalMap, s, i.uv).rgb * 2.0 - 1.0;
rawNormal.x *= obj.extraParams.z;
rawNormal.y *= obj.extraParams.w;
let N = normalize(TBN * rawNormal);
let dotNV = max(dot(N, V), 0.0001);

var F0 = vec3f(0.04);
F0 = mix(F0, albedo, metallic);

var Lo = vec3f(0.0);

// Directional Light
{
    let L = normalize(global.dirLightDir.xyz);
    let H = normalize(V + L);
    let dotNL = max(dot(N, L), 0.0);
    let dotNH = max(dot(N, H), 0.0);
    let dotVH = max(dot(V, H), 0.0);
    
    var shadow: f32 = 1.0;
    if (global.dirShadowInfo.z > 0.5) {
        let numCascades = u32(global.dirShadowInfo.w);
        var cascadeIndex = 0u;
        let viewDist = length(global.viewPos.xyz - i.wp);
        for (var c: u32 = 0u; c < numCascades; c++) {
            if (viewDist < global.cascadeSplits[c]) {
                cascadeIndex = c;
                break;
            }
        }

        // Cascade blending (see lighting.wgsl for rationale).
        var blendToNext: f32 = 0.0;
        if (cascadeIndex + 1u < numCascades) {
            let splitFar = global.cascadeSplits[cascadeIndex];
            let blendBand = max(splitFar * 0.1, 0.0001);
            blendToNext = 1.0 - clamp((splitFar - viewDist) / blendBand, 0.0, 1.0);
        }

        // Normal-offset bias, scaled by NdotL (see lighting.wgsl for rationale).
        let dirShadowSamplePos = i.wp + N * global.dirShadowInfo.y * (1.0 - dotNL);
        let shadowPos = global.cascadeMatrices[cascadeIndex] * vec4f(dirShadowSamplePos, 1.0);
        let shadowA = getShadowPCSS(u_dirShadowMap, shadowSampler, shadowPos, cascadeIndex, global.dirShadowInfo.x);

        var shadowB = shadowA;
        if (blendToNext > 0.0) {
            let nextCascade = cascadeIndex + 1u;
            let shadowPosB = global.cascadeMatrices[nextCascade] * vec4f(dirShadowSamplePos, 1.0);
            shadowB = getShadowPCF(u_dirShadowMap, shadowSampler, shadowPosB, nextCascade, global.dirShadowInfo.x);
        }

        shadow = mix(shadowA, shadowB, blendToNext);
    }

    let radiance = global.dirLightColor.xyz * shadow;

    let D = D_GGX(dotNH, roughness);
    let G = G_SchlickGGX(dotNL, dotNV, roughness);
    let F = F_Schlick(dotVH, F0);

    let kS = F;
    let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
    let specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
    Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
}

// Clustered light lookup -- see docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md and
// lighting.wgsl (identical formula, duplicated here since this chunk has no shared-code
// mechanism with the non-PBR lighting chunk).
let clusterDimsU = vec3u(u32(global.clusterDims.x), u32(global.clusterDims.y), u32(global.clusterDims.z));
let clusterCellX = min(u32(i.pos.x / global.tileSizePx.x), clusterDimsU.x - 1u);
let clusterCellY = min(u32(i.pos.y / global.tileSizePx.y), clusterDimsU.y - 1u);
let clusterViewDist = clamp(length(global.viewPos.xyz - i.wp), global.cameraNearFar.x, global.cameraNearFar.y);
let clusterLogRatio = log(global.cameraNearFar.y / global.cameraNearFar.x);
let clusterSliceF = floor(log(clusterViewDist / global.cameraNearFar.x) * f32(clusterDimsU.z) / clusterLogRatio);
let clusterCellZ = min(u32(max(clusterSliceF, 0.0)), clusterDimsU.z - 1u);
let clusterCellIndex = clusterCellX + clusterDimsU.x * (clusterCellY + clusterDimsU.y * clusterCellZ);

// Point Lights
let pointCluster = pointClusterGrid[clusterCellIndex];
for(var k=0u; k<pointCluster.y; k++) {
    let j = pointClusterIndices[pointCluster.x + k];
    let lightVec = pLights[j].pos.xyz - i.wp;
    let dist = length(lightVec);
    let L = lightVec / dist;
    let lDist = max(pLights[j].pos.w, 0.001);
    let decay = pLights[j].col.w;
    let distFalloff = 1.0 / max(dist * dist, 0.01);
    
    let distRatio = dist / lDist;
    let distRatio4 = distRatio * distRatio * distRatio * distRatio;
    let window = clamp(1.0 - distRatio4, 0.0, 1.0);
    let cutoff = window * window;
    
    var attenuation = clamp(1.0 - dist / lDist, 0.0, 1.0);
    if (decay > 0.0) {
        attenuation = distFalloff * cutoff;
    }
    
    if (attenuation > 0.0) {
        let H = normalize(V + L);
        let radiance = pLights[j].col.xyz * attenuation;
        
        let dotNL = max(dot(N, L), 0.0);
        let dotNH = max(dot(N, H), 0.0);
        let dotVH = max(dot(V, H), 0.0);

        let D = D_GGX(dotNH, roughness);
        let G = G_SchlickGGX(dotNL, dotNV, roughness);
        let F = F_Schlick(dotVH, F0);

        let kS = F;
        let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
        let specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
        Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
    }
}

// Spot Lights
let spotCluster = spotClusterGrid[clusterCellIndex];
for(var k=0u; k<spotCluster.y; k++) {
    let j = spotClusterIndices[spotCluster.x + k];
    let lightVec = sLights[j].pos.xyz - i.wp;
    let dist = length(lightVec);
    let L = lightVec / dist;
    
    // SpotLight parameters
    let spotDir = normalize(sLights[j].dir.xyz);
    let cosOuter = sLights[j].params.x;
    let cosInner = sLights[j].params.y;
    let maxDist = sLights[j].params.z;
    let decay = sLights[j].params.w;
    
    let theta = dot(L, -spotDir);
    let epsilon = max(cosInner - cosOuter, 0.0001);
    let intensity = clamp((theta - cosOuter) / epsilon, 0.0, 1.0);
    
    if (intensity > 0.0 && dist < maxDist) {
        let H = normalize(V + L);
        let distanceAttenuation = pow(clamp(1.0 - dist / maxDist, 0.0, 1.0), decay);
        let attenuation = distanceAttenuation * intensity;
        
        var shadow: f32 = 1.0;
        if (global.spotShadowInfo[j].z > 0.5) {
            let shadowPos = global.spotShadowMatrices[j] * vec4f(i.wp + N * global.spotShadowInfo[j].y * (1.0 - max(dot(N, L), 0.0)), 1.0);
            shadow = getShadowPCSS(u_spotShadowMap, shadowSampler, shadowPos, j, global.spotShadowInfo[j].x);
        }
        
        let radiance = sLights[j].col.xyz * attenuation * shadow;

        let dotNL = max(dot(N, L), 0.0);
        let dotNH = max(dot(N, H), 0.0);
        let dotVH = max(dot(V, H), 0.0);

        let D = D_GGX(dotNH, roughness);
        let G = G_SchlickGGX(dotNL, dotNV, roughness);
        let F = F_Schlick(dotVH, F0);

        let kS = F;
        let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
        let specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
        Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
    }
}

// -- Ambient IBL --
let kS_ambient = F_SchlickRoughness(dotNV, F0, roughness);
var kD_ambient = vec3f(1.0) - kS_ambient;
kD_ambient *= 1.0 - metallic;

let irradiance = textureSampleLevel(u_irradianceMap, globalSampler, N, 0.0).rgb * global.envIntensity;
let diffuseAmbient = irradiance * albedo;

let R = reflect(-V, N);
let MAX_REFLECTION_LOD = 4.0;
let prefilteredColor = textureSampleLevel(u_prefilterMap, globalSampler, R, roughness * MAX_REFLECTION_LOD).rgb * global.envIntensity;
let envBRDF = textureSampleLevel(u_brdfLUT, globalSampler, vec2f(max(dotNV, 0.0), roughness), 0.0).rg;
let specularAmbient = prefilteredColor * (kS_ambient * envBRDF.x + envBRDF.y);

var ambient = (kD_ambient * diffuseAmbient + specularAmbient) * ao;

if (length(irradiance) < 0.001) {
    let f_fallback = F_Schlick(dotNV, F0);
    let kD_fallback = (vec3f(1.0) - f_fallback) * (1.0 - metallic);
    ambient = (kD_fallback * global.ambientColor.rgb * albedo) * ao;
    
    if (obj.useEnvMap > 0.5) {
        let lod = roughness * 5.0;
        let envColor = sRGBToLinear(textureSampleLevel(u_envMap, s, R, lod).rgb);
        ambient += (envColor * f_fallback) * ao;
    }
}

var color = ambient + Lo;

// Emissive
let emissive = sRGBToLinear(textureSample(u_emissiveMap, s, i.uv).rgb) * sRGBToLinear(obj.specColor.rgb) * obj.specColor.a;
color += emissive;

// Exposure
color *= global.exposure;

// Tone Mapping
if (global.gamma != 1.0) {
    color = color / (color + vec3f(1.0));
}

// Gamma Correction
color = linearToSRGB(color);
