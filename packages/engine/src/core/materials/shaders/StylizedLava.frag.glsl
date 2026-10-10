#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;

layout(std140) uniform GlobalUniforms {
    mat4 u_vp;
    vec3 u_viewPos;
    int _pad0;
    vec3 u_ambientColor;
    int _pad1;
    vec3 u_dirLightColor;
    int _pad2;
    vec3 u_dirLightDir;
    int _pad3;
    int u_numPointLights;
    int u_numSpotLights;
    int u_numAreaLights;
    float u_gamma;
    float u_exposure;
    float _pad4;
    vec2 u_cameraNearFar;
};

uniform float u_time;
uniform sampler2D u_opaqueDepthMap;

#ifdef USE_DIFFUSE_MAP
uniform sampler2D u_diffuseMap;
#endif

#ifdef USE_RAMP_MAP
uniform sampler2D u_rampMap;
#endif

// Semantic Material Parameters:
uniform vec4 u_matParam0; // [scaleMain, scaleDistort, distortionStrength, pulseFrequency]
uniform vec4 u_matParam1; // [speedMainX, speedMainY, speedDistortX, speedDistortY]
uniform vec4 u_matParam2; // [cutoffTop, topBlur, tintOffset, pulseAmount]
uniform vec4 u_matParam3; // [edgeThickness, edgeBlur, depthFalloff, unused]
uniform vec4 u_matParam5; // [brightnessUnderLava, brightnessTopLava, brightnessEdge, unused]
uniform vec4 u_matParam6; // Main Tint Start (RGB)
uniform vec4 u_matParam7; // Main Tint End (RGB)
uniform vec4 u_matParam8; // Top Fissure Tint (RGB)
uniform vec4 u_matParam9; // Contact Edge Tint (RGB)

out vec4 fragColor;

[LIQUID_WORLEY_NOISE]

vec3 sRGBToLinear(vec3 c) {
    return pow(c, vec3(2.2));
}

vec3 linearToSRGB(vec3 c) {
    return pow(c, vec3(1.0 / 2.2));
}

void main() {
    float time = u_time;

    float scaleMain = u_matParam0.x;
    float scaleDistort = u_matParam0.y;
    float distortionStrength = u_matParam0.z;
    float pulseFrequency = u_matParam0.w;

    vec2 speedMain = u_matParam1.xy;
    vec2 speedDistort = u_matParam1.zw;

    float cutoffTop = u_matParam2.x;
    float topBlur = u_matParam2.y;
    float tintOffset = u_matParam2.z;
    float pulseAmount = u_matParam2.w;

    float edgeThickness = u_matParam3.x;
    float edgeBlur = u_matParam3.y;

    float brightnessUnderLava = u_matParam5.x;
    float brightnessTopLava = u_matParam5.y;
    float brightnessEdge = u_matParam5.z;

    vec3 colorStart = sRGBToLinear(u_matParam6.rgb);
    vec3 colorEnd = sRGBToLinear(u_matParam7.rgb);
    vec3 colorTop = sRGBToLinear(u_matParam8.rgb);
    vec3 colorEdge = sRGBToLinear(u_matParam9.rgb);

    // 1. Dual-Frequency Flow Distortion
    vec2 uvDistortBase = v_worldPos.xz * scaleDistort;
    vec2 speedDistortCombined = speedDistort * time;

    float d1 = waterCellNoise(uvDistortBase + speedDistortCombined);
    float d2 = waterCellNoise((v_worldPos.xz * (scaleDistort * 0.5)) + speedDistortCombined);
    float layeredDist = clamp((d1 + d2) * 0.5, 0.0, 1.0);

    // 2. Main Crust Coordinate
    vec2 uvMainBase = v_worldPos.xz * scaleMain;
    vec2 speedMainCombined = speedMain * time;
    vec2 uvMainDistorted = uvMainBase + (layeredDist * distortionStrength) + speedMainCombined;

    float crustNoise = 0.0;
    #ifdef USE_DIFFUSE_MAP
        crustNoise = texture(u_diffuseMap, uvMainDistorted).r;
    #else
        crustNoise = waterCellNoise(uvMainDistorted);
    #endif

    float colPattern = clamp(crustNoise + layeredDist * 0.35, 0.0, 1.0);

    // 3. Scene Depth Edge Detection
    ivec2 fragCoords = ivec2(gl_FragCoord.xy);
    float bgDepth = texelFetch(u_opaqueDepthMap, fragCoords, 0).r;

    float near = u_cameraNearFar.x;
    float far = u_cameraNearFar.y;

    float ndcBg = bgDepth * 2.0 - 1.0;
    float linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    float ndcFrag = gl_FragCoord.z * 2.0 - 1.0;
    float linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    float depthDiff = max(linBgDepth - linFragDepth, 0.0);
    float edgeLine = 1.0 - clamp(edgeThickness * depthDiff, 0.0, 1.0);

    float edgeMask = smoothstep(1.0 - colPattern, (1.0 - colPattern) + edgeBlur, edgeLine);

    // 4. Glowing Top Fissures
    float topMask = smoothstep(cutoffTop, cutoffTop + topBlur, colPattern);

    // 5. Thermal Heat Coordinate & Ramp LUT
    vec3 baseColor;
    float pulse = 1.0 + pulseAmount * sin(time * pulseFrequency);

    #ifdef USE_RAMP_MAP
        float heatCoord = clamp(colPattern * tintOffset * pulse, 0.0, 1.0);
        vec2 rampUv = vec2((heatCoord * 255.0 + 0.5) / 256.0, 0.5);
        vec3 thermalRgb = sRGBToLinear(texture(u_rampMap, rampUv).rgb);
        baseColor = thermalRgb * brightnessUnderLava;
    #else
        baseColor = mix(colorStart, colorEnd, clamp(colPattern * tintOffset, 0.0, 1.0)) * brightnessUnderLava * pulse;
    #endif

    // 6. Subtractive Non-Overlapping Compositing
    baseColor *= (1.0 - edgeMask);
    baseColor *= (1.0 - topMask);

    vec3 emissiveEdge = edgeMask * colorEdge * brightnessEdge;
    vec3 emissiveTop = topMask * colorTop * brightnessTopLava;

    vec3 finalRgb = baseColor + emissiveEdge + emissiveTop;

    finalRgb *= u_exposure;
    if (u_gamma != 1.0) {
        finalRgb = finalRgb / (finalRgb + vec3(1.0));
    }
    finalRgb = linearToSRGB(finalRgb);

    fragColor = vec4(finalRgb, 1.0);
}
