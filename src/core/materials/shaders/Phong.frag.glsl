[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]
void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);
  float specMapValue = texture(u_specularMap, v_uv).r;
  vec3 normalMapValue = texture(u_normalMap, v_uv).rgb;
  
  vec3 normalMap = normalize(normalMapValue * 2.0 - 1.0);
  normalMap.xy *= u_extraParams.zw;
  vec3 N = normalize(v_tbn * normalMap);

  [LIGHT_CALC]

  vec3 albedo = sRGBToLinear(texColor.rgb) * sRGBToLinear(u_color.rgb);
  // finalLight already contains ambient + all diffuse components
  // specular contains all specular components
  vec3 finalColor = finalLight * albedo + specular * sRGBToLinear(u_specColor.rgb) * specMapValue;
  
  // Exposure
  finalColor *= u_exposure;

  // Gamma Correction
  finalColor = linearToSRGB(finalColor);

  fragColor = vec4(finalColor, u_color.a * texColor.a);
}