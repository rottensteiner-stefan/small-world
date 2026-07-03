[BASE_FS_HEADER]

void main() {
  vec4 texColor = texture2D(u_diffuseMap, v_uv);
  gl_FragColor = u_color * texColor;
}
