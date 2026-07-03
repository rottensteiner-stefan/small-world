@fragment fn fs(i: Out) -> @location(0) vec4f {
    let color = textureSample(u_envMap, s, i.wp).rgb;
    // EnvMap is sRGB loaded as rgba8unorm. Convert to linear before post-processing applies gamma.
    let linearColor = pow(color, vec3f(2.2));
    return vec4f(linearColor, 1.0) * obj.color;
}
