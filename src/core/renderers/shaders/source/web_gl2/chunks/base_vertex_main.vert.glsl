void main() {
#ifdef USE_INSTANCING
  mat4 modelMat = u_model * a_instanceMatrix;
#ifdef USE_TEXTURE_ARRAY
  v_texIndex = a_instanceData.x;
#endif
#else
  mat4 modelMat = u_model;
#endif

  vec4 wp = modelMat * vec4(a_position, 1.0);
  v_worldPos = wp.xyz;
  v_normal = normalize(mat3(modelMat) * a_normal);
  v_uv = (a_uv * u_texRepeat) + u_texOffset;

  vec3 tangent = a_tangent;
  if (dot(tangent, tangent) < 0.0001) {
    if (abs(v_normal.y) < 0.999) {
      tangent = cross(v_normal, vec3(0, 1, 0));
    } else {
      tangent = cross(v_normal, vec3(1, 0, 0));
    }
  }

  vec3 T = normalize(mat3(modelMat) * tangent);
  vec3 N_v = v_normal;
  T = normalize(T - dot(T, N_v) * N_v);
  vec3 B = cross(N_v, T);
  v_tbn = mat3(T, B, N_v);

  gl_Position = u_vp * wp;

  // Shadow Maps Light Space Transforms
  for (int i = 0; i < 4; i++) {
    if (i >= u_numSpotLights) break;
    // Normal-offset bias, scaled by NdotL so grazing angles get the biggest offset (see
    // light_calc.frag.glsl's directional-light shadow for the same technique).
    vec3 spotL = normalize(u_spotLights[i].pos - wp.xyz);
    float spotNdotL = max(dot(v_normal, spotL), 0.0);
    vec3 spotShadowSamplePos = wp.xyz + v_normal * u_spotShadowInfo[i].y * (1.0 - spotNdotL);
    v_spotLightSpacePos[i] = u_spotShadowMatrix[i] * vec4(spotShadowSamplePos, 1.0);
  }
}
