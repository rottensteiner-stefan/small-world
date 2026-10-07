#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;
in float v_crest;

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
uniform float u_pad3; // repurposed: foamDistance
uniform float u_time;
uniform sampler2D u_opaqueDepthMap;
uniform sampler2D u_opaqueMap;

out vec4 fragColor;

[LIQUID_WORLEY_NOISE]

void main() {
    vec3 waterColor = sRGBToLinear(u_color.rgb);
    vec3 deepWaterColor = sRGBToLinear(u_specColor.rgb);

    vec3 edgeColor = vec3(u_texOffset.x, u_texOffset.y, u_texRepeat.x);
    float edgeSoftness = max(u_texRepeat.y, 0.001);
    float foamDistance = max(u_pad3, 0.001);

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
    // components, damped in shallow depth to prevent edge tear.
    float refrDamping = clamp(depthDiff / 0.3, 0.0, 1.0);
    vec2 distortedUv = screenUv + (v_normal.xz * u_shininess * refrDamping);
    float distortedBgDepth = texture(u_opaqueDepthMap, distortedUv).r;
    float ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    float linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    vec2 refractionUv = (linDistortedBgDepth > linFragDepth) ? distortedUv : screenUv;

    vec3 refractedColor = sRGBToLinear(texture(u_opaqueMap, refractionUv).rgb);

    // Beer-Lambert absorption: light traveling through `depthDiff` units of water loses each
    // color channel at its own exponential rate (waterAbsorption). Ambient in-scattering prevents
    // unnatural blackness in deep or shaded regions.
    vec3 waterAbsorption = vec3(u_isSkinned, u_boneOffset, u_pad1);
    vec3 transmittance = exp(-depthDiff * waterAbsorption);
    vec3 tintedSeabed = refractedColor * mix(vec3(1.0), waterColor, 0.6);
    vec3 inScatterCol = mix(waterColor, deepWaterColor, 0.35) * 0.15;
    vec3 underwaterLighting = tintedSeabed * transmittance + inScatterCol * (1.0 - transmittance);
    vec3 baseColor = mix(deepWaterColor, underwaterLighting, transmittance);

    // Squared falloff, capped at 0.55: the edge colour tints the shoreline instead of blowing it out to white.
    float edgeBlend = pow(1.0 - clamp(depthDiff / edgeSoftness, 0.0, 1.0), 2.0) * 0.4;

    vec3 viewDir = normalize(u_viewPos - v_worldPos);
    float fresnel = pow(1.0 - clamp(dot(v_normal, viewDir), 0.0, 1.0), 5.0);
    vec3 skyColor = vec3(0.6, 0.8, 1.0);
    baseColor = mix(baseColor, skyColor, fresnel * 0.5);

    vec3 lightDir = normalize(u_dirLightDir);
    vec3 halfVector = normalize(lightDir + viewDir);
    float nDotH = clamp(dot(v_normal, halfVector), 0.0, 1.0);
    float specular = pow(nDotH, 1200.0) * 0.8;
    baseColor += u_dirLightColor * specular;

    vec3 edgeColLinear = sRGBToLinear(edgeColor);
    vec3 finalColor = mix(baseColor, edgeColLinear, edgeBlend);

    // Procedural foam: a Worley-noise pattern drifting in world-space XZ, masked to its own
    // shoreline/intersection band (foamDistance).
    vec3 foamColor = sRGBToLinear(vec3(u_isTerrain, u_metallic, u_roughness));
    float foamCutoff = u_useEnvMap;
    float foamNoiseScale = u_useReflectionMap;
    float foamNoiseSpeed = u_pad2;
    float foamBlend = pow(1.0 - clamp(depthDiff / foamDistance, 0.0, 1.0), 2.0);
    vec2 foamUv = v_worldPos.xz * foamNoiseScale + u_time * foamNoiseSpeed;
    float foamCell = waterCellNoise(foamUv);
    float foamPattern = 1.0 - smoothstep(foamCutoff, foamCutoff + 0.15, foamCell);

    // Splash pulse: modulates intersection foam intensity over time instead of a static band
    float splashPhase = dot(normalize(vec2(1.0, 0.4)), v_worldPos.xz) * 0.8 - u_time * 1.6;
    float splashPulse = 0.6 + 0.4 * sin(splashPhase);
    float foamMask = foamPattern * foamBlend * splashPulse * 0.65;

    // Wave-crest foam from vertex Jacobian metric
    float crestFoam = smoothstep(0.65, 0.95, v_crest) * foamPattern * 0.5;
    foamMask = max(foamMask, crestFoam);

    finalColor = mix(finalColor, foamColor, foamMask);

    // Ground-projected caustics: cells are anchored to the pool floor by following the sun ray
    // (not the view ray, which smeared them radially along the walls). Own scale, independent of foam.
    vec3 toLight = normalize(u_dirLightDir);
    float causticsDepth = min(depthDiff, 3.0);
    vec2 groundXZ = v_worldPos.xz - toLight.xz * causticsDepth / max(toLight.y, 0.3);
    float causticsScale = 1.4;
    vec2 causticsUv1 = (groundXZ + v_normal.xz * 0.25) * causticsScale + vec2(u_time * foamNoiseSpeed * 0.35, u_time * foamNoiseSpeed * 0.2);
    vec2 causticsUv2 = (groundXZ - v_normal.xz * 0.2) * causticsScale * 1.4 - vec2(u_time * foamNoiseSpeed * 0.25, u_time * foamNoiseSpeed * 0.4);
    float caustics1 = 1.0 - waterCellNoise(causticsUv1);
    float caustics2 = 1.0 - waterCellNoise(causticsUv2);
    float causticsValue = pow(caustics1 * caustics2, 1.6) * 3.2;
    float causticsFade = exp(-depthDiff * 0.7) * smoothstep(0.05, 0.4, depthDiff);
    float underwaterLuma = dot(refractedColor, vec3(0.299, 0.587, 0.114));
    float shadowMask = smoothstep(0.05, 0.22, underwaterLuma);
    vec3 causticsLight = vec3(1.0, 0.98, 0.88) * causticsValue * causticsFade * shadowMask * 0.1;
    finalColor += causticsLight;

    finalColor *= u_exposure;
    finalColor = linearToSRGB(finalColor);

    fragColor = vec4(finalColor, 1.0);
}
