@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  
  // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
  [WGSL_LIGHTING]
  
  let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(obj.color.rgb);
  var finalColor = fL * albedo;

  // Exposure
  finalColor *= global.exposure;

  // Gamma correction
  finalColor = linearToSRGB(finalColor);

  return vec4f(finalColor, obj.color.a * texCol.a);
}