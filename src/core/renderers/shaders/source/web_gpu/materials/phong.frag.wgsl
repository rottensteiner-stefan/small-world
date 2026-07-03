@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  let sMap = textureSample(u_specularMap, s, i.uv);
  let specValue = sMap.r;
  
  // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
  [WGSL_LIGHTING]
  
  let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(obj.color.rgb);
  
  // fL already contains ambient + directional + other lights scaled by their intensities (from Renderer)
  var finalColor = fL * albedo + (spec * sRGBToLinear(obj.specColor.rgb) * specValue);

  // Apply exposure
  finalColor *= global.exposure;

  // Apply gamma correction
  finalColor = linearToSRGB(finalColor);

  return vec4f(finalColor, obj.color.a * texCol.a);
}
