[BASE_FS_HEADER]
varying vec3 v_uvw;
uniform samplerCube u_skybox;

void main() {
    gl_FragColor = textureCube(u_skybox, v_uvw);
}
