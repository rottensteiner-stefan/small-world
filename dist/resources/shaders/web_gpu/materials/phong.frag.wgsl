@group(1) @binding(0) var tDiff: texture_2d<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(tDiff, s, i.uv);
  [WGSL_LIGHTING]
  return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
}
