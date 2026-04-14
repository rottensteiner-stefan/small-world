[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);
  float specMap = texture(u_specularMap, v_uv).r;

  vec3 normalMap = texture(u_normalMap, v_uv).rgb;
  vec3 N;
  
  // Standard-Normale nutzen, wenn keine echte Map vorhanden
  if (normalMap.b > 0.9 && normalMap.r > 0.4 && normalMap.r < 0.6 && normalMap.g > 0.4 && normalMap.g < 0.6) {
    N = normalize(v_normal);
  } else {
    normalMap = normalize(normalMap * 2.0 - 1.0);
    N = normalize(v_tbn * normalMap);
  }

  [LIGHT_CALC]

  // Kombiniere Textur-Farbe mit Material-Farbe
  vec3 diffuseColor = texColor.rgb * u_color.rgb;
  
  // Falls das Ergebnis extrem dunkel ist, erzwinge eine Mindesthelligkeit für das Ambient Light
  vec3 ambientFinal = u_ambientColor * diffuseColor;
  if (length(ambientFinal) < 0.05) {
    ambientFinal = u_ambientColor * u_color.rgb * 0.5; 
  }

  // Finales Shading
  fragColor = vec4(ambientFinal + (diff_dir * u_dirLightColor * diffuseColor) + (specular * u_specColor.rgb * specMap), 1.0);
}
