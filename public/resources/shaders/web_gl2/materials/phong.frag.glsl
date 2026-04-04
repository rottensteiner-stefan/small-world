// [INCLUDE_BASE]
// [INCLUDE_LIGHTS]

void main() {
  vec3 N = normalize(v_normal);
  vec4 texColor = texture(u_diffuseMap, v_uv);

  // [CHUNK_LIGHT_CALC]

  c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
}