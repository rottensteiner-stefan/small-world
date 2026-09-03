#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;

[LIGHT_DEFS]

uniform vec4 u_color;
uniform vec4 u_specColor;
uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;
uniform float u_shininess; // repurposed: refractionStrength (see OpenWaterMaterial.ts)
uniform float u_isSkinned; // repurposed: waterAbsorption.r
uniform float u_boneOffset; // repurposed: waterAbsorption.g
uniform float u_pad1; // repurposed: waterAbsorption.b
uniform float u_isTerrain; // repurposed: foamColor.r
uniform float u_metallic; // repurposed: foamColor.g
uniform float u_roughness; // repurposed: foamColor.b
uniform float u_useEnvMap; // repurposed: foamCutoff
uniform float u_useReflectionMap; // repurposed: foamNoiseScale
uniform float u_pad2; // repurposed: foamNoiseSpeed
uniform float u_time;
uniform sampler2D u_opaqueDepthMap;
uniform sampler2D u_opaqueMap;

out vec4 fragColor;

// Cheap 2D hash for the foam cell noise below -- not a general-purpose PRNG, just enough
// decorrelation between neighboring cells to avoid an obviously repeating pattern.
float waterHash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Worley/cellular noise: distance from `p` to the nearest jittered point among the 3x3
// neighboring grid cells. Produces the blotchy, cell-like coverage foam needs -- unlike smooth
// Perlin-style noise, its edges are naturally sharp, which reads as foam clumps rather than a
// soft gradient.
float waterCellNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 localPos = fract(p);
    float minDistSq = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 jitter = vec2(
                waterHash(cell + neighbor),
                waterHash(cell + neighbor + vec2(17.0, 31.0))
            );
            vec2 diff = neighbor + jitter - localPos;
            minDistSq = min(minDistSq, dot(diff, diff));
        }
    }
    return sqrt(minDistSq);
}

void main() {
    vec3 waterColor = sRGBToLinear(u_color.rgb);
    vec3 deepWaterColor = sRGBToLinear(u_specColor.rgb);

    vec3 edgeColor = vec3(u_texOffset.x, u_texOffset.y, u_texRepeat.x);
    float edgeSoftness = max(u_texRepeat.y, 0.001);

    // texture() (not texelFetch) so the 1x1 fallback texture's CLAMP_TO_EDGE wrap mode kicks
    // in correctly when no real depth capture exists -- texelFetch has no such fallback and
    // returns 0 for any out-of-range texel, which a 1x1 texture always is at full-res coords.
    vec2 screenUv = gl_FragCoord.xy / vec2(textureSize(u_opaqueDepthMap, 0));
    float bgDepth = texture(u_opaqueDepthMap, screenUv).r;

    float near = u_cameraNearFar.x;
    float far = u_cameraNearFar.y;

    float ndcBg = bgDepth * 2.0 - 1.0;
    float linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    float ndcFrag = gl_FragCoord.z * 2.0 - 1.0;
    float linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    float depthDiff = max(linBgDepth - linFragDepth, 0.0);

    // Screen-space refraction: distort the sample point by the wave normal's horizontal
    // components. If the distorted sample lands in front of the water surface (e.g. a
    // foreground object peeking through a steep wave slope near the shore), fall back to the
    // undistorted UV -- otherwise that pixel would show something that's not actually underwater.
    vec2 distortedUv = screenUv + v_normal.xz * u_shininess;
    float distortedBgDepth = texture(u_opaqueDepthMap, distortedUv).r;
    float ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    float linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    vec2 refractionUv = (linDistortedBgDepth > linFragDepth) ? distortedUv : screenUv;

    vec3 refractedColor = sRGBToLinear(texture(u_opaqueMap, refractionUv).rgb);

    // Beer-Lambert absorption: light traveling through `depthDiff` units of water loses each
    // color channel at its own exponential rate (waterAbsorption), rather than fading linearly
    // to a single flat color -- this is what gives real water its per-channel, non-linear color
    // falloff (e.g. red disappearing long before blue in deep water).
    vec3 waterAbsorption = vec3(u_isSkinned, u_boneOffset, u_pad1);
    vec3 transmittance = exp(-depthDiff * waterAbsorption);
    vec3 tintedSeabed = refractedColor * waterColor;
    vec3 baseColor = mix(deepWaterColor, tintedSeabed, transmittance);

    float edgeBlend = 1.0 - clamp(depthDiff / edgeSoftness, 0.0, 1.0);

    vec3 viewDir = normalize(u_viewPos - v_worldPos);
    float fresnel = pow(1.0 - clamp(dot(v_normal, viewDir), 0.0, 1.0), 5.0);
    vec3 skyColor = vec3(0.6, 0.8, 1.0);
    baseColor = mix(baseColor, skyColor, fresnel * 0.5);

    vec3 lightDir = normalize(u_dirLightDir);
    vec3 halfVector = normalize(lightDir + viewDir);
    float nDotH = clamp(dot(v_normal, halfVector), 0.0, 1.0);
    float specular = pow(nDotH, 100.0) * 1.5;
    baseColor += u_dirLightColor * specular;

    vec3 edgeColLinear = sRGBToLinear(edgeColor);
    vec3 finalColor = mix(baseColor, edgeColLinear, edgeBlend);

    // Procedural foam: a Worley-noise pattern drifting in world-space XZ, masked to the same
    // shoreline/intersection band as the edge blend above (real foam only collects where the
    // water actually meets something, not across the open surface).
    vec3 foamColor = sRGBToLinear(vec3(u_isTerrain, u_metallic, u_roughness));
    float foamCutoff = u_useEnvMap;
    float foamNoiseScale = u_useReflectionMap;
    float foamNoiseSpeed = u_pad2;
    vec2 foamUv = v_worldPos.xz * foamNoiseScale + u_time * foamNoiseSpeed;
    float foamCell = waterCellNoise(foamUv);
    float foamPattern = 1.0 - smoothstep(foamCutoff, foamCutoff + 0.15, foamCell);
    float foamMask = foamPattern * edgeBlend;
    finalColor = mix(finalColor, foamColor, foamMask);

    // Procedural caustics: a lighter second Worley-noise layer, projected using the water
    // surface's own world position rather than the true refracted seabed position (which would
    // need reconstructing world position from depth via INV_VIEW_MATRIX/INV_PROJECTION_MATRIX --
    // new renderer-wide uniforms this material alone doesn't warrant). Close enough at the
    // shallow depths caustics are visible at anyway; fades out entirely in deep water.
    vec2 causticsUv1 = v_worldPos.xz * foamNoiseScale * 0.5 + u_time * foamNoiseSpeed * 0.3;
    vec2 causticsUv2 = v_worldPos.xz * foamNoiseScale * 0.35 - u_time * foamNoiseSpeed * 0.25;
    float caustics1 = 1.0 - waterCellNoise(causticsUv1);
    float caustics2 = 1.0 - waterCellNoise(causticsUv2);
    float causticsValue = caustics1 * caustics2;
    float causticsFade = 1.0 - smoothstep(0.0, 10.0, depthDiff);
    finalColor += causticsValue * causticsFade * 0.3;

    finalColor *= u_exposure;
    finalColor = linearToSRGB(finalColor);

    fragColor = vec4(finalColor, 1.0);
}
