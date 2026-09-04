#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;
in float v_displacementY;

[LIGHT_DEFS]

uniform vec4 u_color;          // Shallow water color (RGBA)
uniform vec4 u_specColor;      // Deep water color (RGBA)
uniform vec2 u_texOffset;      // Edge/Shore color (R, G)
uniform vec2 u_texRepeat;      // Edge color (B), edgeSoftness
uniform float u_shininess;     // refractionStrength
uniform float u_isSkinned;     // waterAbsorption.r
uniform float u_boneOffset;    // waterAbsorption.g
uniform float u_pad1;          // waterAbsorption.b
uniform float u_isTerrain;     // foamColor.r
uniform float u_metallic;      // foamColor.g
uniform float u_roughness;     // foamColor.b
uniform float u_useEnvMap;     // foamCutoff (threshold for toon foam)
uniform float u_useReflectionMap; // foamNoiseScale
uniform float u_pad2;          // foamNoiseSpeed
uniform float u_pad3;          // foamDistance (shore/intersection width)
uniform float u_time;
uniform sampler2D u_opaqueDepthMap;
uniform sampler2D u_opaqueMap;

out vec4 fragColor;

[LIQUID_WORLEY_NOISE]

void main() {
    vec3 shallowColor = sRGBToLinear(u_color.rgb);
    vec3 deepColor = sRGBToLinear(u_specColor.rgb);
    vec3 edgeColor = sRGBToLinear(vec3(u_texOffset.x, u_texOffset.y, u_texRepeat.x));
    float edgeSoftness = max(u_texRepeat.y, 0.001);
    float foamDistance = max(u_pad3, 0.001);

    // 1. Depth buffer reading & exact linear depth delta
    vec2 screenUv = gl_FragCoord.xy / vec2(textureSize(u_opaqueDepthMap, 0));
    float bgDepth = texture(u_opaqueDepthMap, screenUv).r;

    float near = u_cameraNearFar.x;
    float far = u_cameraNearFar.y;

    float ndcBg = bgDepth * 2.0 - 1.0;
    float linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    float ndcFrag = gl_FragCoord.z * 2.0 - 1.0;
    float linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    float depthDiff = max(linBgDepth - linFragDepth, 0.0);

    // 2. Screen-space Refraction (Masked strictly to depthDiff > 0.0)
    vec2 distortedUv = screenUv + v_normal.xz * u_shininess;
    float distortedBgDepth = texture(u_opaqueDepthMap, distortedUv).r;
    float ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    float linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    vec2 refractionUv = (linDistortedBgDepth > linFragDepth) ? distortedUv : screenUv;

    vec3 opaqueUnderwaterColor = sRGBToLinear(texture(u_opaqueMap, refractionUv).rgb);

    // 3. Ground Position Reconstruction for Directional Caustics Projection
    vec3 viewDir = normalize(v_worldPos - u_viewPos);
    vec3 groundWorldPos = v_worldPos + viewDir * depthDiff;

    // Distorted Caustics UVs mapped to underwater ground
    float causticsDistortionStrength = 0.45;
    vec2 uvCaustics = groundWorldPos.xz + (v_normal.xz * causticsDistortionStrength);
    
    // Dual-Chromatic Panning Voronoi noise
    float causticsSpeed = u_pad2 * 0.75;
    vec2 causticsUv1 = uvCaustics * (u_useReflectionMap * 0.85) + vec2(u_time * causticsSpeed, u_time * causticsSpeed * 0.5);
    vec2 causticsUv2 = uvCaustics * (u_useReflectionMap * 1.1) - vec2(u_time * causticsSpeed * 0.6, u_time * causticsSpeed * 0.8);
    float causticsNoise1 = 1.0 - waterCellNoise(causticsUv1);
    float causticsNoise2 = 1.0 - waterCellNoise(causticsUv2);

    float maxCausticsDepth = 6.0;
    float causticsFade = 1.0 - smoothstep(0.0, maxCausticsDepth, depthDiff);
    float causticsThreshold = 0.42;
    vec3 causticsColor = vec3(1.0, 0.98, 0.88);
    vec3 finalCaustics = vec3(step(causticsThreshold, causticsNoise1 * causticsNoise2)) * causticsFade * causticsColor * 1.2;

    // Add caustics to underwater scene before absorption/transmittance
    vec3 illuminatedUnderwater = opaqueUnderwaterColor + finalCaustics;

    // 4. Stylized Beer-Lambert absorption
    vec3 waterAbsorption = vec3(u_isSkinned, u_boneOffset, u_pad1);
    vec3 transmittance = exp(-depthDiff * waterAbsorption);
    vec3 tintedSeabed = illuminatedUnderwater * shallowColor;
    vec3 baseWaterColor = mix(deepColor, tintedSeabed, transmittance);

    // 5. Stylized Edge color transition
    float edgeBlend = 1.0 - clamp(depthDiff / edgeSoftness, 0.0, 1.0);
    vec3 surfaceColor = mix(baseWaterColor, edgeColor, edgeBlend * 0.7);

    // 6. Fresnel & Specular
    vec3 camDir = normalize(u_viewPos - v_worldPos);
    float fresnel = pow(1.0 - clamp(dot(v_normal, camDir), 0.0, 1.0), 4.0);
    vec3 skyColor = vec3(0.65, 0.85, 1.0);
    surfaceColor = mix(surfaceColor, skyColor, fresnel * 0.45);

    vec3 lightDir = normalize(u_dirLightDir);
    vec3 halfVector = normalize(lightDir + camDir);
    float nDotH = clamp(dot(v_normal, halfVector), 0.0, 1.0);
    float specular = step(0.92, nDotH) * 1.2; // Toon-specular
    surfaceColor += u_dirLightColor * specular;

    // 7. Advanced Procedural Foam (Intersection Foam + Crest Foam)
    vec3 foamColor = sRGBToLinear(vec3(u_isTerrain, u_metallic, u_roughness));
    float foamCutoff = u_useEnvMap;
    float foamScale = u_useReflectionMap;
    float foamSpeed = u_pad2;

    // 7a. Intersection / Shoreline Foam (Depth-Driven Dual Noise)
    vec2 uvFoam1 = v_worldPos.xz * foamScale + vec2(u_time * foamSpeed, u_time * foamSpeed * 0.4);
    vec2 uvFoam2 = v_worldPos.xz * (foamScale * 1.4) - vec2(u_time * foamSpeed * 0.5, u_time * foamSpeed * 0.8);
    float noise1 = 1.0 - waterCellNoise(uvFoam1);
    float noise2 = 1.0 - waterCellNoise(uvFoam2);
    float shoreFoamDepthMod = 1.0 - smoothstep(0.0, foamDistance, depthDiff);
    float shoreFoamMask = (noise1 * noise2) * shoreFoamDepthMod;
    float finalShoreFoam = step(foamCutoff, shoreFoamMask);

    // 7b. Wave Crest Foam (Steepness / Slope-Driven)
    float crestIntensity = smoothstep(0.92, 0.75, v_normal.y); // Steeper slope = lower normal.y
    float crestFoamCutoff = foamCutoff * 0.85;
    float finalCrestFoam = step(crestFoamCutoff, noise1 * crestIntensity);

    // 7c. Total Foam synthesis
    float totalFoam = max(finalShoreFoam, finalCrestFoam);
    vec3 finalColor = mix(surfaceColor, foamColor, totalFoam);

    finalColor *= u_exposure;
    finalColor = linearToSRGB(finalColor);

    fragColor = vec4(finalColor, 1.0);
}
