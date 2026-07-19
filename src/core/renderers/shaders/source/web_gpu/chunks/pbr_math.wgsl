fn D_GGX(dotNH: f32, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let denom = (dotNH * dotNH * (a2 - 1.0) + 1.0);
    return a2 / (3.14159265359 * denom * denom);
}

fn G_SchlickGGX(dotNL: f32, dotNV: f32, roughness: f32) -> f32 {
    let r = (roughness + 1.0);
    let k = (r * r) / 8.0;
    let GL = dotNL / (dotNL * (1.0 - k) + k);
    let GV = dotNV / (dotNV * (1.0 - k) + k);
    return GL * GV;
}

fn F_Schlick(cosTheta: f32, F0: vec3f) -> vec3f {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

fn F_SchlickRoughness(cosTheta: f32, F0: vec3f, roughness: f32) -> vec3f {
    return F0 + (max(vec3f(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

fn linearToSRGB(color: vec3f) -> vec3f {
    return pow(color, vec3f(1.0 / global.gamma));
}

fn sRGBToLinear(color: vec3f) -> vec3f {
    return pow(color, vec3f(global.gamma));
}

fn getShadowPCF(map: texture_depth_2d_array, samp: sampler_comparison, shadowPos: vec4f, layer: u32, bias: f32) -> f32 {
    let ndc = shadowPos.xyz / shadowPos.w;
    let uv = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
    
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || ndc.z > 1.0 || ndc.z < 0.0) {
        return 1.0;
    }
    
    let depthRef = ndc.z - bias;
    var shadow: f32 = 0.0;
    
    // Get texture dimensions for the specific mip level (level 0)
    let dims = textureDimensions(map);
    let texelSize = vec2f(1.0 / f32(dims.x), 1.0 / f32(dims.y));
    
    for (var y: i32 = -1; y <= 1; y++) {
        for (var x: i32 = -1; x <= 1; x++) {
            let offset = vec2f(f32(x), f32(y)) * texelSize;
            shadow += textureSampleCompareLevel(map, samp, uv + offset, layer, depthRef);
        }
    }
    return shadow / 9.0;
}

