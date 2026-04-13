// [INCLUDE_BASE]
// [INCLUDE_LIGHTS]

void main() {
  vec4 texColor = texture2D(u_diffuseMap, v_uv);

  vec3 normalMap = texture2D(u_normalMap, v_uv).rgb;
  normalMap = normalize(normalMap * 2.0 - 1.0);
  vec3 N = normalize(v_tbn * normalMap);

  // [CHUNK_LIGHT_CALC]

  gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (spec * u_specColor.rgb), u_color.a * texColor.a);
}