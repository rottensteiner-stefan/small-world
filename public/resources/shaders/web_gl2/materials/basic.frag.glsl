// [INCLUDE_BASE]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);
  c = u_color * texColor;
}
