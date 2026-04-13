@group(1) @binding(0) var tDiff: texture_2d<f32>;
@group(1) @binding(6) var tNorm: texture_2d<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(tDiff, s, i.uv);
  
  let normalMap = textureSample(tNorm, s, i.uv).rgb * 2.0 - 1.0;
  let TBN = mat3x3f(normalize(i.t), normalize(i.b), normalize(i.n));
  let N = normalize(TBN * normalMap);

  [WGSL_LIGHTING]
  return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
}
