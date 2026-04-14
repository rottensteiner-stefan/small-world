void main() {
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_worldPos = wp.xyz;
  v_normal = normalize(mat3(u_model) * a_normal);
  v_uv = (a_uv * u_texRepeat) + u_texOffset;

  vec3 tangent = a_tangent;
  if (dot(tangent, tangent) < 0.0001) {
    if (abs(v_normal.y) < 0.999) {
      tangent = cross(v_normal, vec3(0, 1, 0));
    } else {
      tangent = cross(v_normal, vec3(1, 0, 0));
    }
  }

  vec3 T = normalize(mat3(u_model) * tangent);
  vec3 N_v = v_normal;
  T = normalize(T - dot(T, N_v) * N_v);
  vec3 B = cross(N_v, T);
  v_tbn = mat3(T, B, N_v);

  gl_Position = u_vp * wp;
}
