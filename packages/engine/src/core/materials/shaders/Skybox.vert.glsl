[BASE_VERTEX_HEADER]
out vec3 v_uvw;

void main() {
  v_uvw = a_position;
  gl_Position = u_vp * u_model * vec4(a_position, 1.0);
}