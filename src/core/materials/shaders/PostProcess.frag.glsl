#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_hdrTexture;
uniform sampler2D u_bloomTexture;
uniform int u_bloomEnabled;
uniform float u_bloomIntensity;
uniform vec3 u_bloomColor;
uniform float u_exposure;
uniform float u_gamma;
uniform int u_toneMappingMode;
uniform int u_vignetteEnabled;
uniform float u_vignetteOffset;
uniform float u_vignetteDarkness;
uniform float u_vignetteRoundness;
uniform int u_grainEnabled;
uniform float u_grainIntensity;
uniform int u_quantizeEnabled;
uniform float u_quantizeSteps;
uniform float u_time;

uniform int u_filterMode;

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
    
    vec2 distortUv = uv;
    
    // Cyber Glitch (mode 3) - horizontal block glitch offset
    if (u_filterMode == 3) {
[FILTER_GLITCH_DISTORT]
    }
    // VHS Tape (mode 4) - tape tracking distortion & horizontal jitter
    else if (u_filterMode == 4) {
[FILTER_VHS_DISTORT]
    }
    // Night Vision (mode 1) - scanline jitter
    else if (u_filterMode == 1) {
        float jitter = (random(vec2(u_time * 10.0, uv.y)) - 0.5) * 0.001;
        distortUv.x += jitter;
    }
    // Old Projector (mode 6) - frame shake and bounce
    else if (u_filterMode == 6) {
        float shakeX = (random(vec2(u_time * 6.0, 1.0)) - 0.5) * 0.002;
        float shakeY = (random(vec2(u_time * 10.0, 2.0)) - 0.5) * 0.004;
        if (random(vec2(floor(u_time * 4.0), 3.0)) > 0.88) {
            shakeY += (random(vec2(u_time, 4.0)) - 0.5) * 0.012;
        }
        distortUv += vec2(shakeX, shakeY);
    }
    // Gravitational Lensing (mode 8)
    if (u_filterMode == 8) {
        ivec2 dims = textureSize(u_hdrTexture, 0);
        float aspect = float(dims.x) / float(dims.y);
        vec2 dir = uv - vec2(0.5);
        dir.x *= aspect;
        float dist = length(dir);
        float eh = 0.15; // Much larger Event Horizon (15% of screen)
        if (dist > eh) {
            float bending = (eh * eh) / (dist * dist);
            vec2 disp = dir / dist;
            disp.x /= aspect;
            distortUv = uv + disp * bending * 0.25;
        } else {
            distortUv = vec2(-1.0); // Sample nowhere
        }
    }

    // Chromatic Aberration (sampling R, G, B at slightly different coordinates)
    vec3 hdr;
    if (u_filterMode == 3) { // Cyber Glitch (High CA)
        vec2 dir = distortUv - vec2(0.5);
        float shift = 0.025 + 0.015 * sin(u_time * 4.0);
        hdr.r = texture(u_hdrTexture, distortUv - dir * shift).r;
        hdr.g = texture(u_hdrTexture, distortUv).g;
        hdr.b = texture(u_hdrTexture, distortUv + dir * shift).b;
    } else if (u_filterMode == 4) { // VHS Tape (Linear CA)
        hdr.r = texture(u_hdrTexture, distortUv - vec2(0.008, 0.0)).r;
        hdr.g = texture(u_hdrTexture, distortUv).g;
        hdr.b = texture(u_hdrTexture, distortUv + vec2(0.008, 0.0)).b;
    } else if (u_filterMode == 2) { // Noir Detective (Edge CA)
        vec2 dDir = distortUv - vec2(0.5);
        float shift = 0.006 * length(dDir);
        hdr.r = texture(u_hdrTexture, distortUv - dDir * shift).r;
        hdr.g = texture(u_hdrTexture, distortUv).g;
        hdr.b = texture(u_hdrTexture, distortUv + dDir * shift).b;
    } else {
        hdr = texture(u_hdrTexture, distortUv).rgb;
    }

    if (u_filterMode == 8) {
        ivec2 dims = textureSize(u_hdrTexture, 0);
        float aspect = float(dims.x) / float(dims.y);
        vec2 dir = uv - vec2(0.5);
        dir.x *= aspect;
        if (length(dir) < 0.15) {
            hdr = vec3(0.0); // Absolute pitch black Event Horizon
        }
    }

    // Bloom mixing
    if (u_bloomEnabled == 1) {
        vec3 bloom;
        if (u_filterMode == 3) {
            vec2 dir = distortUv - 0.5;
            float shift = 0.025 + 0.015 * sin(u_time * 4.0);
            bloom.r = texture(u_bloomTexture, distortUv - dir * shift).r;
            bloom.g = texture(u_bloomTexture, distortUv).g;
            bloom.b = texture(u_bloomTexture, distortUv + dir * shift).b;
        } else if (u_filterMode == 4) {
            bloom.r = texture(u_bloomTexture, distortUv - vec2(0.008, 0.0)).r;
            bloom.g = texture(u_bloomTexture, distortUv).g;
            bloom.b = texture(u_bloomTexture, distortUv + vec2(0.008, 0.0)).b;
        } else {
            bloom = texture(u_bloomTexture, distortUv).rgb;
        }
        if (u_filterMode == 8) {
            ivec2 dims = textureSize(u_hdrTexture, 0);
            float aspect = float(dims.x) / float(dims.y);
            vec2 dir = uv - vec2(0.5);
            dir.x *= aspect;
            if (length(dir) < 0.15) {
                bloom = vec3(0.0);
            }
        }
        hdr += bloom * u_bloomIntensity * u_bloomColor;
    }

    // Tone Mapping
    vec3 tonemapped = hdr * u_exposure;
    if (u_toneMappingMode == 1) {
        tonemapped = toneMapReinhard(hdr, u_exposure);
    } else if (u_toneMappingMode == 2) {
        tonemapped = toneMapCineon(hdr, u_exposure);
    } else if (u_toneMappingMode == 3) {
        tonemapped = toneMapACESFilmic(hdr, u_exposure);
    }

    // Gamma correction
    vec3 srgb = linearToSRGB(tonemapped, u_gamma);

    // Apply Vignette
    if (u_vignetteEnabled == 1) {
        vec2 d_uv = abs(distortUv - vec2(0.5)) * 2.0;
        float d = 0.0;
        if (u_vignetteRoundness == 2.0) {
            d = length(d_uv);
        } else {
            d = pow(pow(d_uv.x, u_vignetteRoundness) + pow(d_uv.y, u_vignetteRoundness), 1.0 / u_vignetteRoundness);
        }
        float d_old_scale = d * 0.5;
        float innerRadius = u_vignetteOffset * 0.5;
        float vignette = 1.0 - smoothstep(innerRadius, u_vignetteOffset, d_old_scale);
        srgb *= mix(1.0, vignette, clamp(u_vignetteDarkness, 0.0, 1.0));
    }

    // Apply Film Grain
    if (u_grainEnabled == 1) {
        float noise = random(gl_FragCoord.xy + vec2(u_time, -u_time));
        float grain = (noise - 0.5) * u_grainIntensity;
        srgb += vec3(grain);
    }

    // Apply Filter Color Grading
[FILTER_COLOR_GRADING]

    // Quantize Colors (Posterization / Color Banding)
    if (u_quantizeEnabled == 1) {
        srgb = floor(srgb * u_quantizeSteps) / u_quantizeSteps;
    }

    fragColor = vec4(srgb, 1.0);
}
