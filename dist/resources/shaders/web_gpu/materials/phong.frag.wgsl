@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  let sMap = textureSample(u_specularMap, s, i.uv);
  let specValue = sMap.r;
  
  // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
  [WGSL_LIGHTING]
  
  let diffuseColor = texCol.rgb * obj.color.rgb;
  
  // fL already contains ambient + directional + other lights scaled by their intensities (from Renderer)
  let finalColor = fL * diffuseColor + (spec * obj.specularColor.rgb * specValue);

  return vec4f(finalColor, obj.color.a * texCol.a);
}
