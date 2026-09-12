// One Gerstner wave term. Accumulates its tangent/bitangent contribution into `t`/`b` and
// returns its displacement. Shared by every wave-displaced liquid surface (OpenWater,
// StylizedWater) -- mirrors liquid_gerstner_wave.wgsl exactly. Plain GLSL ES 1.00-compatible
// syntax so the same source serves both the WebGL2 (glsl300) and WebGL1 (glsl100) backends.
vec3 gerstnerWave(vec4 wave, vec3 wp, float speed, float time, inout vec3 t, inout vec3 b) {
    vec2 dir = normalize(wave.xy);
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 6.28318530718 / max(wavelength, 0.001);
    float a = steepness / max(k, 0.001);
    float f = k * (dot(dir, wp.xz) - speed * time);
    float cosf = cos(f);
    float sinf = sin(f);

    float WA = a * k * dir.x * dir.y;
    float WB = a * k * dir.x * dir.x;
    float WC = a * k * dir.y * dir.y;

    t.x -= WB * sinf;
    t.y += dir.x * k * a * cosf;
    t.z -= WA * sinf;

    b.x -= WA * sinf;
    b.y += dir.y * k * a * cosf;
    b.z -= WC * sinf;

    return vec3(dir.x * a * cosf, a * sinf, dir.y * a * cosf);
}
