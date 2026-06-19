@group(0) @binding(0) var hdrSampler: sampler;
@group(0) @binding(1) var hdrTexture: texture_2d<f32>;
@group(0) @binding(3) var bloomTexture: texture_2d<f32>;

struct PostUniforms {
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
    _pad: f32,
}
@group(0) @binding(2) var<uniform> u: PostUniforms;

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
    let dims = vec2f(textureDimensions(hdrTexture, 0));

    let hdr = textureSample(hdrTexture, hdrSampler, uv).rgb;
    var hdrVal = hdr;
    if (1u == u.bloomEnabled) {
        let bloom = textureSample(bloomTexture, hdrSampler, uv).rgb;
        hdrVal += bloom * u.bloomIntensity * u.bloomColor;
    }
    
    var tonemapped = hdrVal * u.exposure;
    if (1u == u.toneMappingMode) {
        tonemapped = toneMapReinhard(hdrVal, u.exposure);
    } else if (2u == u.toneMappingMode) {
        tonemapped = toneMapCineon(hdrVal, u.exposure);
    } else if (3u == u.toneMappingMode) {
        tonemapped = toneMapACESFilmic(hdrVal, u.exposure);
    }
    
    var srgb = linearToSRGB(tonemapped, u.inverseGamma);

    // Apply Vignette if enabled
    if (1u == u.vignetteEnabled) {
        let d_uv = abs(uv - vec2f(0.5)) * 2.0;
        let d = pow(pow(d_uv.x, u.vignetteRoundness) + pow(d_uv.y, u.vignetteRoundness), 1.0 / u.vignetteRoundness);
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

    return vec4f(srgb, 1.0);
}
