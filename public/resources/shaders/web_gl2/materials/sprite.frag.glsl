// [BASE_FRAGMENT_HEADER]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);
  fragColor = u_color * texColor;
}
