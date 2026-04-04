// [INCLUDE_BASE]
// [INCLUDE_LIGHTS]
// [INCLUDE_TERRAIN_UNIFORMS]

void main() {
  vec3 N = normalize(v_normal);
  vec4 sand = texture(u_sandMap, v_uv);
  vec4 grass = texture(u_grassMap, v_uv);
  vec4 rock = texture(u_rockMap, v_uv);
  vec4 snow = texture(u_snowMap, v_uv);

  float h = v_worldPos.y;
  float b1 = smoothstep(u_thresholds.x - u_thresholds.w, u_thresholds.x + u_thresholds.w, h);
  float b2 = smoothstep(u_thresholds.y - u_thresholds.w, u_thresholds.y + u_thresholds.w, h);
  float b3 = smoothstep(u_thresholds.z - u_thresholds.w, u_thresholds.z + u_thresholds.w, h);

  vec4 texColor = mix(sand, grass, b1);
  texColor = mix(texColor, rock, b2);
  texColor = mix(texColor, snow, b3);

  float slope = 1.0 - N.y;
  float slopeBlend = smoothstep(0.25, 0.45, slope);
  texColor = mix(texColor, rock, slopeBlend);

  // [CHUNK_LIGHT_CALC]

  c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
}
