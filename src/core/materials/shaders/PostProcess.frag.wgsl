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
const u_filterMode: u32 = 0u;

struct LocalUniforms {
    exposure: f32,
    inverseGamma: f32,
    toneMappingMode: u32,
    vignetteEnabled: u32,
    vignetteOffset: f32,
    vignetteDarkness: f32,
    vignetteRoundness: f32,
    grainEnabled: u32,
    grainIntensity: f32,
    time: f32,
    bloomEnabled: u32,
    bloomIntensity: f32,
    bloomColor: vec3f,
    filterMode: u32,
}

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
    var u: LocalUniforms;
    u.exposure = u_exposure;
    u.inverseGamma = u_inverseGamma;
    u.toneMappingMode = u_toneMappingMode;
    u.vignetteEnabled = u_vignetteEnabled;
    u.vignetteOffset = u_vignetteOffset;
    u.vignetteDarkness = u_vignetteDarkness;
    u.vignetteRoundness = u_vignetteRoundness;
    u.grainEnabled = u_grainEnabled;
    u.grainIntensity = u_grainIntensity;
    u.time = dyn.time;
    u.bloomEnabled = u_bloomEnabled;
    u.bloomIntensity = u_bloomIntensity;
    u.bloomColor = u_bloomColor;
    u.filterMode = u_filterMode;

    let dims = vec2f(textureDimensions(hdrTexture, 0));

    var distortUv = uv;

    // Cyber Glitch (mode 3)
    if (3u == u.filterMode) {
[FILTER_GLITCH_DISTORT]
    }
    // VHS Tape (mode 4)
    else if (4u == u.filterMode) {
[FILTER_VHS_DISTORT]
    }
    // Night Vision (mode 1)
    else if (1u == u.filterMode) {
        let jitter = (random(vec2f(u.time * 10.0, uv.y)) - 0.5) * 0.001;
        distortUv.x += jitter;
    }
    // Old Projector (mode 6)
    else if (6u == u.filterMode) {
        let shakeX = (random(vec2f(u.time * 6.0, 1.0)) - 0.5) * 0.002;
        let shakeY = (random(vec2f(u.time * 10.0, 2.0)) - 0.5) * 0.004;
        var jump = 0.0;
        if (random(vec2f(floor(u.time * 4.0), 3.0)) > 0.88) {
            jump = (random(vec2f(u.time, 4.0)) - 0.5) * 0.012;
        }
        distortUv.x += shakeX;
        distortUv.y += shakeY + jump;
    }

    var hdr: vec3f;
    if (3u == u.filterMode) { // Cyber Glitch (High CA)
        let dir = distortUv - 0.5;
        let shift = 0.025 + 0.015 * sin(u.time * 4.0);
        hdr = vec3f(
            textureSample(hdrTexture, hdrSampler, distortUv - dir * shift).r,
            textureSample(hdrTexture, hdrSampler, distortUv).g,
            textureSample(hdrTexture, hdrSampler, distortUv + dir * shift).b
        );
    } else if (4u == u.filterMode) { // VHS Tape (Linear CA)
        hdr = vec3f(
            textureSample(hdrTexture, hdrSampler, distortUv - vec2f(0.008, 0.0)).r,
            textureSample(hdrTexture, hdrSampler, distortUv).g,
            textureSample(hdrTexture, hdrSampler, distortUv + vec2f(0.008, 0.0)).b
        );
    } else if (2u == u.filterMode) { // Noir Detective (Edge CA)
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

    // Bloom
    if (1u == u.bloomEnabled) {
        var bloom: vec3f;
        if (3u == u.filterMode) {
            let dir = distortUv - 0.5;
            let shift = 0.025 + 0.015 * sin(u.time * 4.0);
            bloom = vec3f(
                textureSample(bloomTexture, hdrSampler, distortUv - dir * shift).r,
                textureSample(bloomTexture, hdrSampler, distortUv).g,
                textureSample(bloomTexture, hdrSampler, distortUv + dir * shift).b
            );
        } else if (4u == u.filterMode) {
            bloom = vec3f(
                textureSample(bloomTexture, hdrSampler, distortUv - vec2f(0.008, 0.0)).r,
                textureSample(bloomTexture, hdrSampler, distortUv).g,
                textureSample(bloomTexture, hdrSampler, distortUv + vec2f(0.008, 0.0)).b
            );
        } else {
            bloom = textureSample(bloomTexture, hdrSampler, distortUv).rgb;
        }
        hdr += bloom * u.bloomIntensity * u.bloomColor;
    }

    var tonemapped = hdr * u.exposure;
    if (1u == u.toneMappingMode) {
        tonemapped = toneMapReinhard(hdr, u.exposure);
    } else if (2u == u.toneMappingMode) {
        tonemapped = toneMapCineon(hdr, u.exposure);
    } else if (3u == u.toneMappingMode) {
        tonemapped = toneMapACESFilmic(hdr, u.exposure);
    }

    var srgb = linearToSRGB(tonemapped, u.inverseGamma);

    // Apply Vignette if enabled
    if (1u == u.vignetteEnabled) {
        let d_uv = abs(distortUv - vec2f(0.5)) * 2.0;
        var d = 0.0;
        if (u.vignetteRoundness == 2.0) {
            d = length(d_uv);
        } else {
            d = pow(pow(d_uv.x, u.vignetteRoundness) + pow(d_uv.y, u.vignetteRoundness), 1.0 / u.vignetteRoundness);
        }
        let d_old_scale = d * 0.5;
        let innerRadius = u.vignetteOffset * 0.5;
        let vignette = 1.0 - smoothstep(innerRadius, u.vignetteOffset, d_old_scale);
        srgb *= mix(1.0, vignette, clamp(u.vignetteDarkness, 0.0, 1.0));
    }

    // Apply Film Grain
    if (1u == u.grainEnabled) {
        let noise = random(uv * dims + vec2f(u.time, -u.time));
        let grain = (noise - 0.5) * u.grainIntensity;
        srgb += vec3f(grain);
    }

    // Filter modes
[FILTER_COLOR_GRADING]

    return vec4f(srgb, 1.0);
}


