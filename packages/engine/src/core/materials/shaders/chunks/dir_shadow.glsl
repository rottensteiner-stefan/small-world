// For shaders with their own header; BASE_FRAGMENT_HEADER already declares these, so never combine both.
precision highp sampler2DShadow;
uniform sampler2DShadow u_dirShadowMap;
uniform mat4 u_cascadeMatrices[4];
uniform vec4 u_cascadeSplits;
uniform vec4 u_dirShadowInfo; // x=bias, y=normalBias, z=castShadow, w=numCascades

float sampleDirShadow(vec3 worldPos, vec3 N) {
    if (u_dirShadowInfo.z < 0.5 || u_dirShadowInfo.w < 1.0) {
        return 1.0;
    }

    int numCascades = int(u_dirShadowInfo.w);
    int cascadeIndex = numCascades - 1;
    float viewDist = length(u_viewPos - worldPos);
    for (int c = 0; c < 4; c++) {
        if (c >= numCascades) break;
        if (viewDist < u_cascadeSplits[c]) {
            cascadeIndex = c;
            break;
        }
    }

    float nDotL = max(dot(N, normalize(u_dirLightDir)), 0.0);
    vec3 samplePos = worldPos + N * u_dirShadowInfo.y * (1.0 - nDotL);
    vec4 lightSpacePos = u_cascadeMatrices[cascadeIndex] * vec4(samplePos, 1.0);
    vec3 proj = lightSpacePos.xyz / lightSpacePos.w * 0.5 + 0.5;
    if (proj.z > 1.0 || proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0) {
        return 1.0;
    }

    float cols = ceil(sqrt(u_dirShadowInfo.w));
    vec2 cell = vec2(mod(float(cascadeIndex), cols), floor(float(cascadeIndex) / cols));
    vec2 cellMin = cell / cols;
    vec2 cellMax = cellMin + vec2(1.0 / cols);
    vec2 atlasUV = (proj.xy + cell) / cols;
    vec2 texelSize = 1.0 / vec2(textureSize(u_dirShadowMap, 0));

    float lit = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 tapUV = clamp(atlasUV + vec2(float(x), float(y)) * texelSize, cellMin, cellMax);
            lit += texture(u_dirShadowMap, vec3(tapUV, proj.z - u_dirShadowInfo.x));
        }
    }
    return lit / 9.0;
}
