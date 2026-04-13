// [INCLUDE_BASE]
// [INCLUDE_LIGHTS]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);

  vec3 normalMap = texture(u_normalMap, v_uv).rgb;
  normalMap = normalize(normalMap * 2.0 - 1.0);
  vec3 N = normalize(v_tbn * normalMap);

  // [CHUNK_LIGHT_CALC]

  c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
}