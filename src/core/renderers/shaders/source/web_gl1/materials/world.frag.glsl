[BASE_FS_HEADER]
uniform vec2 u_texRepeat;

void main() {
  vec3 blendWeights = abs(v_normal);
  blendWeights = max(blendWeights - 0.2, 0.0);
  blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z);

  vec2 coordX = v_worldPos.zy * u_texRepeat;
  vec2 coordY = v_worldPos.xz * u_texRepeat;
  vec2 coordZ = v_worldPos.xy * u_texRepeat;

  if (v_normal.x < 0.0) coordX.x = -coordX.x;
  if (v_normal.y < 0.0) coordY.x = -coordY.x;
  if (v_normal.z >= 0.0) coordZ.x = -coordZ.x;

  vec4 colX = texture2D(u_diffuseMap, coordX);
  vec4 colY = texture2D(u_diffuseMap, coordY);
  vec4 colZ = texture2D(u_diffuseMap, coordZ);

  vec4 finalTexColor = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;

  gl_FragColor = u_color * finalTexColor;
}
