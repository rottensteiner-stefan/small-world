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
uniform sampler2D u_opaqueDepthMap;
uniform sampler2D u_opaqueMap;

out vec4 fragColor;

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

    float depthBlend = clamp(depthDiff / 10.0, 0.0, 1.0);
    vec3 baseColor = mix(refractedColor, deepWaterColor, depthBlend);

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

    finalColor *= u_exposure;
    finalColor = linearToSRGB(finalColor);

    fragColor = vec4(finalColor, 1.0);
}
