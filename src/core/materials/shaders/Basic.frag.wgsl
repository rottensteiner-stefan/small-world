@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    return vec4f(texCol.rgb * obj.color.rgb, texCol.a * obj.color.a);
}