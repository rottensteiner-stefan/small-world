@fragment fn fs(i: Out) -> @location(0) vec4f {
    let albedo = textureSample(u_diffuseMap, s, i.uv).rgb * obj.color.rgb;
    let metallic = obj.metallic;
    let roughness = obj.roughness;
    let ao = obj.extraParams.x;
    [WGSL_PBR_LIGHTING]
    return vec4f(color, obj.color.a);
}