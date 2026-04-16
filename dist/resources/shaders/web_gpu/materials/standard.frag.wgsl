@group(1) @binding(0) var tDiff: texture_2d<f32>;
@group(1) @binding(6) var tNorm: texture_2d<f32>;

[WGSL_PBR_MATH]

@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(tDiff, s, i.uv);
    let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(u.color.rgb);
    
    let metallic = u.metallic;
    let roughness = clamp(u.roughness, 0.05, 1.0);
    let ao = u.ao;

    [WGSL_PBR_LIGHTING]

    return vec4f(color, u.color.a * texCol.a);
}
