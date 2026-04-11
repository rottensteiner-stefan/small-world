@group(1) @binding(0) var tDiff: texture_2d<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(tDiff, s, i.uv);
  return u.color * texCol;
}
