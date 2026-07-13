@group(0) @binding(0) var hdrSampler: sampler;
@group(0) @binding(1) var hdrTexture: texture_2d<f32>;
@group(0) @binding(3) var bloomTexture: texture_2d<f32>;

// Default constants (overwritten at compilation time)
const u_exposure: f32 = 1.0;
const u_inverseGamma: f32 = 1.0;
const u_toneMappingMode: u32 = 0u;
const u_vignetteEnabled: u32 = 0u;
const u_vignetteOffset: f32 = 0.8;
const u_vignetteDarkness: f32 = 0.5;
const u_vignetteRoundness: f32 = 2.0;
const u_grainEnabled: u32 = 0u;
const u_grainIntensity: f32 = 0.05;
const u_bloomEnabled: u32 = 0u;
const u_bloomIntensity: f32 = 1.0;
const u_bloomColor: vec3f = vec3f(1.0, 1.0, 1.0);
const u_quantizeEnabled: u32 = 0u;
const u_quantizeSteps: f32 = 8.0;
const u_filterMode: u32 = 0u;

struct TimeUniform {
    time: f32,
}
@group(0) @binding(2) var<uniform> dyn: TimeUniform;

fn random(st: vec2f) -> f32 {
    var p3  = fract(vec3f(st.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Reinhard tone mapping (simple, proven, industry-standard fallback)
fn toneMapReinhard(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = hdr * exposure;
    return mapped / (mapped + vec3f(1.0));
}

// Cineon tone mapping (Optimized filmic operator by Jim Hejl and Richard Burgess-Dawson)
fn toneMapCineon(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = max(vec3f(0.0), hdr * exposure - vec3f(0.004));
    return (mapped * (6.2 * mapped + vec3f(0.5))) / (mapped * (6.2 * mapped + vec3f(1.7)) + vec3f(0.06));
}

// ACES Filmic tone mapping (Narkowicz fit)
fn toneMapACESFilmic(hdr: vec3f, exposure: f32) -> vec3f {
    let mapped = hdr * exposure;
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return clamp((mapped * (a * mapped + b)) / (mapped * (c * mapped + d) + e), vec3f(0.0), vec3f(1.0));
}

// Linear -> sRGB gamma correction
fn linearToSRGB(linear: vec3f, invGamma: f32) -> vec3f {
    return pow(clamp(linear, vec3f(0.0), vec3f(1.0)), vec3f(invGamma));
}

@fragment
fn fs_main(@location(0) uv: vec2f, @builtin(position) coord: vec4f) -> @location(0) vec4f {
    let u_time = dyn.time;

    let dims = vec2f(textureDimensions(hdrTexture, 0));

    var distortUv = uv;

    // Cyber Glitch (mode 3)
    if (3u == u_filterMode) {
[FILTER_GLITCH_DISTORT]
    }
    // VHS Tape (mode 4)
    else if (4u == u_filterMode) {
[FILTER_VHS_DISTORT]
    }
    // Night Vision (mode 1)
    else if (1u == u_filterMode) {
        let jitter = (random(vec2f(u_time * 10.0, uv.y)) - 0.5) * 0.001;
        distortUv.x += jitter;
    }
    // Old Projector (mode 6)
    else if (6u == u_filterMode) {
        let shakeX = (random(vec2f(u_time * 6.0, 1.0)) - 0.5) * 0.002;
        let shakeY = (random(vec2f(u_time * 10.0, 2.0)) - 0.5) * 0.004;
        var jump = 0.0;
        if (random(vec2f(floor(u_time * 4.0), 3.0)) > 0.88) {
            jump = (random(vec2f(u_time, 4.0)) - 0.5) * 0.012;
        }
        distortUv.x += shakeX;
        distortUv.y += shakeY + jump;
    }
    // Gravitational Lensing (mode 8)
    if (8u == u_filterMode) {
        let aspect = dims.x / dims.y;
        var dir = uv - vec2f(0.5);
        dir.x *= aspect; // Make circle instead of ellipse
        let dist = length(dir);
        let eh = 0.15; // Event Horizon screen radius
        if (dist > eh) {
            let bending = (eh * eh) / (dist * dist);
            var disp = dir / dist; // normalized
            disp.x /= aspect; // back to uv space
            distortUv = uv + disp * bending * 0.25;
        } else {
            distortUv = vec2f(-1.0);
        }
    }

    var hdr: vec3f;
    if (3u == u_filterMode) { // Cyber Glitch (High CA)
        let dir = distortUv - 0.5;
        let shift = 0.025 + 0.015 * sin(u_time * 4.0);
        hdr = vec3f(
            textureSample(hdrTexture, hdrSampler, distortUv - dir * shift).r,
            textureSample(hdrTexture, hdrSampler, distortUv).g,
            textureSample(hdrTexture, hdrSampler, distortUv + dir * shift).b
        );
    } else if (4u == u_filterMode) { // VHS Tape (Linear CA)
        hdr = vec3f(
            textureSample(hdrTexture, hdrSampler, distortUv - vec2f(0.008, 0.0)).r,
            textureSample(hdrTexture, hdrSampler, distortUv).g,
            textureSample(hdrTexture, hdrSampler, distortUv + vec2f(0.008, 0.0)).b
        );
    } else if (2u == u_filterMode) { // Noir Detective (Edge CA)
        let dir = distortUv - 0.5;
        let shift = 0.006 * length(dir);
        hdr = vec3f(
            textureSample(hdrTexture, hdrSampler, distortUv - dir * shift).r,
            textureSample(hdrTexture, hdrSampler, distortUv).g,
            textureSample(hdrTexture, hdrSampler, distortUv + dir * shift).b
        );
    } else {
        hdr = textureSample(hdrTexture, hdrSampler, distortUv).rgb;
    }

    if (8u == u_filterMode) {
        let aspect = dims.x / dims.y;
        var dir = uv - vec2f(0.5);
        dir.x *= aspect;
        if (length(dir) < 0.15) {
            hdr = vec3f(0.0);
        }
    }

    // Bloom
    if (1u == u_bloomEnabled) {
        var bloom: vec3f;
        if (3u == u_filterMode) {
            let dir = distortUv - 0.5;
            let shift = 0.025 + 0.015 * sin(u_time * 4.0);
            bloom = vec3f(
                textureSample(bloomTexture, hdrSampler, distortUv - dir * shift).r,
                textureSample(bloomTexture, hdrSampler, distortUv).g,
                textureSample(bloomTexture, hdrSampler, distortUv + dir * shift).b
            );
        } else if (4u == u_filterMode) {
            bloom = vec3f(
                textureSample(bloomTexture, hdrSampler, distortUv - vec2f(0.008, 0.0)).r,
                textureSample(bloomTexture, hdrSampler, distortUv).g,
                textureSample(bloomTexture, hdrSampler, distortUv + vec2f(0.008, 0.0)).b
            );
        } else {
            bloom = textureSample(bloomTexture, hdrSampler, distortUv).rgb;
        }

        if (8u == u_filterMode) {
            let aspect = dims.x / dims.y;
            var dir = uv - vec2f(0.5);
            dir.x *= aspect;
            if (length(dir) < 0.15) {
                bloom = vec3f(0.0);
            }
        }

        hdr += bloom * u_bloomIntensity * u_bloomColor;
    }

    var tonemapped = hdr * u_exposure;
    if (1u == u_toneMappingMode) {
        tonemapped = toneMapReinhard(hdr, u_exposure);
    } else if (2u == u_toneMappingMode) {
        tonemapped = toneMapCineon(hdr, u_exposure);
    } else if (3u == u_toneMappingMode) {
        tonemapped = toneMapACESFilmic(hdr, u_exposure);
    }

    var srgb = linearToSRGB(tonemapped, u_inverseGamma);

    // Apply Vignette if enabled
    if (1u == u_vignetteEnabled) {
        let d_uv = abs(distortUv - vec2f(0.5)) * 2.0;
        var d = 0.0;
        if (u_vignetteRoundness == 2.0) {
            d = length(d_uv);
        } else {
            d = pow(pow(d_uv.x, u_vignetteRoundness) + pow(d_uv.y, u_vignetteRoundness), 1.0 / u_vignetteRoundness);
        }
        let d_old_scale = d * 0.5;
        let innerRadius = u_vignetteOffset * 0.5;
        let vignette = 1.0 - smoothstep(innerRadius, u_vignetteOffset, d_old_scale);
        srgb *= mix(1.0, vignette, clamp(u_vignetteDarkness, 0.0, 1.0));
    }

    // Apply Film Grain
    if (1u == u_grainEnabled) {
        let noise = random(uv * dims + vec2f(u_time, -u_time));
        let grain = (noise - 0.5) * u_grainIntensity;
        srgb += vec3f(grain);
    }

    // Filter modes
[FILTER_COLOR_GRADING]

    // Quantize Colors (Posterization / Color Banding)
    if (1u == u_quantizeEnabled) {
        srgb = floor(srgb * u_quantizeSteps) / u_quantizeSteps;
    }

    return vec4f(srgb, 1.0);
}


