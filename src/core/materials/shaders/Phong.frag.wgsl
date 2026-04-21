@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    // Basic lighting for now in WGSL
    return vec4f(texCol.rgb * obj.color.rgb, 1.0);
}