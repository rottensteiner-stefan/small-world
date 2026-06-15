precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_hdrTexture;
uniform float u_exposure;
uniform float u_inverseGamma;
uniform int u_toneMappingMode;
uniform int u_vignetteEnabled;
uniform float u_vignetteOffset;
uniform float u_vignetteDarkness;

vec3 toneMapReinhard(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    return mapped / (mapped + vec3(1.0));
}

vec3 toneMapCineon(vec3 hdr, float exposure) {
    vec3 mapped = max(vec3(0.0), hdr * exposure - vec3(0.004));
    return (mapped * (6.2 * mapped + vec3(0.5))) / (mapped * (6.2 * mapped + vec3(1.7)) + vec3(0.06));
}

vec3 toneMapACESFilmic(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((mapped * (a * mapped + b)) / (mapped * (c * mapped + d) + e), 0.0, 1.0);
}

vec3 linearToSRGB(vec3 linear, float invGamma) {
    return pow(clamp(linear, 0.0, 1.0), vec3(invGamma));
}

void main() {
    // Flip Y: WebGL FBO is stored bottom-up, screen is top-down
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    vec3 hdr = texture2D(u_hdrTexture, uv).rgb;

    vec3 tonemapped = hdr * u_exposure;
    if (u_toneMappingMode == 1) {
        tonemapped = toneMapReinhard(hdr, u_exposure);
    } else if (u_toneMappingMode == 2) {
        tonemapped = toneMapCineon(hdr, u_exposure);
    } else if (u_toneMappingMode == 3) {
        tonemapped = toneMapACESFilmic(hdr, u_exposure);
    }

    vec3 srgb = linearToSRGB(tonemapped, u_inverseGamma);

    // Apply Vignette
    if (u_vignetteEnabled == 1) {
        float d = distance(uv, vec2(0.5));
        float v_edge0 = u_vignetteOffset - u_vignetteDarkness;
        float vignette = 1.0 - smoothstep(v_edge0, u_vignetteOffset, d);
        srgb *= mix(1.0, vignette, clamp(u_vignetteDarkness, 0.0, 1.0));
    }

    gl_FragColor = vec4(srgb, 1.0);
}
