#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;

void main() {
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_worldPos = wp.xyz;
  v_normal = mat3(u_model) * a_normal;
  v_uv = (a_uv * u_texRepeat) + u_texOffset;
  gl_Position = u_vp * wp;
}