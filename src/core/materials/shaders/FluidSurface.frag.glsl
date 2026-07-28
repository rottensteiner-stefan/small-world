#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_worldPos;
in vec3 v_normal;

[LIGHT_DEFS]

uniform vec4 u_color;
uniform vec4 u_specColor;
uniform vec4 u_extraParams;
uniform sampler2D u_diffuseMap;
uniform sampler2D u_opaqueDepthMap;

out vec4 fragColor;

void main() {
    float time = u_extraParams.y;
    float flowSpeed = u_extraParams.z;
    float noiseScale = u_extraParams.w;

    // Use world position XZ for seamless tiling across objects
    vec2 worldUV = v_worldPos.xz * 0.5;
    vec2 uv = worldUV * noiseScale;

    vec2 uv1 = uv + vec2(time * 0.05, time * 0.02) * flowSpeed;
    vec2 uv2 = uv + vec2(-time * 0.03, time * 0.04) * flowSpeed;

    float n1 = dot(texture(u_diffuseMap, uv1).rgb, vec3(0.299, 0.587, 0.114));
    float n2 = dot(texture(u_diffuseMap, uv2).rgb, vec3(0.299, 0.587, 0.114));
    float noise = (n1 + n2) * 0.5;

    vec3 baseColor = sRGBToLinear(u_color.rgb) * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    vec3 edgeColor = sRGBToLinear(u_specColor.rgb);

    // Depth Fade -- texture() (not texelFetch) so the 1x1 fallback texture's CLAMP_TO_EDGE wrap
    // mode kicks in correctly when no real depth capture exists (same reasoning as OpenWater.frag.glsl).
    vec2 depthUv = gl_FragCoord.xy / vec2(textureSize(u_opaqueDepthMap, 0));
    float bgDepth = texture(u_opaqueDepthMap, depthUv).r;

    float near = u_cameraNearFar.x;
    float far = u_cameraNearFar.y;

    float ndcBg = bgDepth * 2.0 - 1.0;
    float linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    float ndcFrag = gl_FragCoord.z * 2.0 - 1.0;
    float linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    float depthDiff = linBgDepth - linFragDepth;

    float edgeBlend = 1.0 - clamp(depthDiff / 1.0, 0.0, 1.0); // Softness of 1.0 units
    float noiseBlend = smoothstep(0.6, 0.8, noise);
    float finalBlend = clamp(noiseBlend + edgeBlend, 0.0, 1.0);

    vec3 finalColor = mix(baseColor, edgeColor, finalBlend);

    finalColor *= u_exposure;
    finalColor = linearToSRGB(finalColor);

    fragColor = vec4(finalColor, 1.0);
}
