@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(u_diffuseMap, s, i.uv);
  
  // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
  [WGSL_LIGHTING]
  
  let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(obj.color.rgb);
  var color = fL * albedo;

  // Exposure
  color *= global.exposure;

  // Gamma correction
  color = linearToSRGB(color);

  [WGSL_FOG_CALC]
  return vec4f(color, obj.color.a * texCol.a);
}