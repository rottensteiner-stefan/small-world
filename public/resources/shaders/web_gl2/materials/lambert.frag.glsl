// [BASE_FRAGMENT_HEADER]
// [LIGHT_DEFS]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);
  // [LIGHT_CALC]
  fragColor = vec4(finalLight * u_color.rgb * texColor.rgb, u_color.a * texColor.a);
}
