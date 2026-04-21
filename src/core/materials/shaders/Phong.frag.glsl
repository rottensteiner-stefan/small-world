[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]
void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);
  float specMapValue = texture(u_specularMap, v_uv).r;
  vec3 normalMapValue = texture(u_normalMap, v_uv).rgb;
  
  vec3 N;
  if (normalMapValue.b > 0.9 && normalMapValue.r > 0.4 && normalMapValue.r < 0.6 && normalMapValue.g > 0.4 && normalMapValue.g < 0.6) {
    N = normalize(v_normal);
  } else {
    normalMapValue = normalize(normalMapValue * 2.0 - 1.0);
    N = normalize(v_tbn * normalMapValue);
  }

  [LIGHT_CALC]

  vec3 albedo = texColor.rgb * u_color.rgb;
  // finalLight already contains ambient + all diffuse components
  // specular contains all specular components
  vec3 finalColor = finalLight * albedo + specular * u_specColor.rgb * specMapValue;
  
  fragColor = vec4(finalColor, u_color.a * texColor.a);
}