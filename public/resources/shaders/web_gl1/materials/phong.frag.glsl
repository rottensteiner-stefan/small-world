[BASE_FS_HEADER]
[LIGHT_DEFS]

void main() {
  vec4 texColor = texture2D(u_diffuseMap, v_uv);
  float specMap = texture2D(u_specularMap, v_uv).r;

  vec3 normalMap = texture2D(u_normalMap, v_uv).rgb;
  normalMap = normalize(normalMap * 2.0 - 1.0);
  vec3 N = normalize(v_tbn * normalMap);

  [LIGHT_CALC]

  gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb * specMap), u_color.a * texColor.a);
}
