[BASE_FRAGMENT_HEADER]
in vec3 v_uvw;
uniform samplerCube u_skybox;
void main() {
  fragColor = texture(u_skybox, v_uvw);
}