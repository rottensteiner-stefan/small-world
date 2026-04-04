// [INCLUDE_BASE]
// [INCLUDE_LIGHTS]

void main() {
  vec3 N = normalize(v_normal);
  vec4 texColor = texture2D(u_diffuseMap, v_uv); // Fallback for WebGL1 terrain

  // [CHUNK_LIGHT_CALC]

  gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
}