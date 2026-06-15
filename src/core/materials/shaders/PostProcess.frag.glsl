#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_hdrTexture;
uniform sampler2D u_bloomTexture;
uniform int u_bloomEnabled;
uniform float u_bloomIntensity;
uniform float u_exposure;
uniform float u_gamma;
uniform int u_toneMappingMode;
uniform int u_vignetteEnabled;
uniform float u_vignetteOffset;
uniform float u_vignetteDarkness;
uniform float u_vignetteRoundness;
uniform int u_grainEnabled;
uniform float u_grainIntensity;
uniform float u_time;

// Random noise
float random(vec2 st) {
    vec3 p3  = fract(vec3(st.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Reinhard tone mapping
vec3 toneMapReinhard(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    return mapped / (mapped + vec3(1.0));
}

// Cineon tone mapping
vec3 toneMapCineon(vec3 hdr, float exposure) {
    vec3 mapped = max(vec3(0.0), hdr * exposure - vec3(0.004));
    return (mapped * (6.2 * mapped + vec3(0.5))) / (mapped * (6.2 * mapped + vec3(1.7)) + vec3(0.06));
}

// ACES Filmic tone mapping
vec3 toneMapACESFilmic(vec3 hdr, float exposure) {
    vec3 mapped = hdr * exposure;
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((mapped * (a * mapped + b)) / (mapped * (c * mapped + d) + e), 0.0, 1.0);
}

// Linear -> sRGB gamma correction
vec3 linearToSRGB(vec3 linear, float gamma) {
    return pow(clamp(linear, 0.0, 1.0), vec3(1.0 / gamma));
}

void main() {
    // Flip Y: WebGL FBO is stored bottom-up, screen is top-down
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    vec3 hdr = texture(u_hdrTexture, uv).rgb;
    
    if (u_bloomEnabled == 1) {
        vec3 bloom = texture(u_bloomTexture, uv).rgb;
        hdr += bloom * u_bloomIntensity;
    }
    
    vec3 tonemapped = hdr * u_exposure;
    if (u_toneMappingMode == 1) {
        tonemapped = toneMapReinhard(hdr, u_exposure);
    } else if (u_toneMappingMode == 2) {
        tonemapped = toneMapCineon(hdr, u_exposure);
    } else if (u_toneMappingMode == 3) {
        tonemapped = toneMapACESFilmic(hdr, u_exposure);
    }

    vec3 srgb = linearToSRGB(tonemapped, u_gamma);

    // Apply Vignette
    if (u_vignetteEnabled == 1) {
        vec2 d_uv = abs(uv - vec2(0.5)) * 2.0;
        float d = pow(pow(d_uv.x, u_vignetteRoundness) + pow(d_uv.y, u_vignetteRoundness), 1.0 / u_vignetteRoundness);
        float d_old_scale = d * 0.5;
        float innerRadius = u_vignetteOffset * 0.5;
        float vignette = 1.0 - smoothstep(innerRadius, u_vignetteOffset, d_old_scale);
        srgb *= mix(1.0, vignette, clamp(u_vignetteDarkness, 0.0, 1.0));
    }

    // Apply Film Grain
    if (u_grainEnabled == 1) {
        // We don't have dims directly in WebGL unless passed, but we can just use uv with a large multiplier
        // gl_FragCoord.xy works well for screen pixel coordinates
        float noise = random(gl_FragCoord.xy + vec2(u_time, -u_time));
        float grain = (noise - 0.5) * u_grainIntensity;
        srgb += vec3(grain);
    }

    fragColor = vec4(srgb, 1.0);
}
