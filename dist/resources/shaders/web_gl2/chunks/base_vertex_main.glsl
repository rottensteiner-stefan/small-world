void main() {
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_worldPos = wp.xyz;
  v_normal = mat3(u_model) * a_normal;
  v_uv = (a_uv * u_texRepeat) + u_texOffset;
  gl_Position = u_vp * wp;
}
