@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  let sMap = textureSample(u_specularMap, s, i.uv);
  let specValue = sMap.r;
  let nMap = textureSample(u_normalMap, s, i.uv).rgb;
  var N: vec3f;
  if (nMap.b > 0.9 && nMap.r > 0.4 && nMap.r < 0.6 && nMap.g > 0.4 && nMap.g < 0.6) {
    N = normalize(i.n);
  } else {
    let normalMap = nMap * 2.0 - 1.0;
    let TBN = mat3x3f(normalize(i.t), normalize(i.b), normalize(i.n));
    N = normalize(TBN * normalMap);
  }
  [WGSL_LIGHTING]
  let diffuseColor = texCol.rgb * obj.color.rgb;
  var ambientFinal = global.ambientColor.rgb * diffuseColor;
  if (length(ambientFinal) < 0.05) { ambientFinal = global.ambientColor.rgb * obj.color.rgb * 0.5; }
  return vec4f(ambientFinal + (fL - global.ambientColor.rgb) * diffuseColor + (spec * obj.specularColor.rgb * specValue), obj.color.a * texCol.a);
}
