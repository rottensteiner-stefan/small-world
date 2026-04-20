[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    if (texCol.a < 0.1) { discard; }
    return texCol * obj.color;
}