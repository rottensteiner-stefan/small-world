@group(1) @binding(0) var tDiff: texture_2d<f32>;
@group(1) @binding(6) var tNorm: texture_2d<f32>;
@group(1) @binding(7) var tSpec: texture_2d<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(tDiff, s, i.uv);
  let sMap = textureSample(tSpec, s, i.uv);
  let specValue = sMap.r;
  
  let nMap = textureSample(tNorm, s, i.uv).rgb;
  var N: vec3f;
  if (nMap.b > 0.9 && nMap.r > 0.4 && nMap.r < 0.6 && nMap.g > 0.4 && nMap.g < 0.6) {
    N = normalize(i.n);
  } else {
    let normalMap = nMap * 2.0 - 1.0;
    let TBN = mat3x3f(normalize(i.t), normalize(i.b), normalize(i.n));
    N = normalize(TBN * normalMap);
  }

  [WGSL_LIGHTING]
  
  let diffuseColor = texCol.rgb * u.color.rgb;
  var ambientFinal = u.amb.rgb * diffuseColor;
  if (length(ambientFinal) < 0.05) {
    ambientFinal = u.amb.rgb * u.color.rgb * 0.5;
  }

  return vec4f(ambientFinal + (fL - u.amb.rgb) * diffuseColor + (spec * u.specCol.rgb * specValue), u.color.a * texCol.a);
}
