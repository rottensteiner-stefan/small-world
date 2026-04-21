@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  
  // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
  [WGSL_LIGHTING]
  
  let diffuseColor = texCol.rgb * obj.color.rgb;
  let finalColor = fL * diffuseColor;

  return vec4f(finalColor, obj.color.a * texCol.a);
}