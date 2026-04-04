#version 300 es
precision highp float;
in vec3 v_uvw;
uniform samplerCube u_skybox;
out vec4 c;
void main() {
  c = texture(u_skybox, v_uvw);
}
