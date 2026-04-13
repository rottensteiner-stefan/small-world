void main() {
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_worldPos = wp.xyz;
  v_normal = normalize(mat3(u_model) * a_normal);
  v_uv = (a_uv * u_texRepeat) + u_texOffset;

  vec3 T = normalize(mat3(u_model) * a_tangent);
  vec3 N = v_normal;
  T = normalize(T - dot(T, N) * N);
  vec3 B = cross(N, T);
  v_tbn = mat3(T, B, N);

  gl_Position = u_vp * wp;
}
