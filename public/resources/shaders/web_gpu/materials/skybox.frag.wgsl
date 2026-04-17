@fragment fn fs(i: Out) -> @location(0) vec4f {
    return textureSample(u_skybox, s, i.uv) * obj.color;
}
