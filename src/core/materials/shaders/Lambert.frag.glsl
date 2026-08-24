[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]

void main() {
  vec4 texColor = texture(u_diffuseMap, v_uv);

#ifdef USE_NORMAL_MAP
  vec3 rawNormal = texture(u_normalMap, v_uv).rgb * 2.0 - 1.0;
  rawNormal.xy *= u_extraParams.zw;
  vec3 N = normalize(v_tbn * rawNormal);
#else
  vec3 N = normalize(v_normal);
#endif

  [LIGHT_CALC]
  vec3 albedo = sRGBToLinear(texColor.rgb) * sRGBToLinear(u_color.rgb);
  vec3 finalColor = finalLight * albedo;
  
  finalColor *= u_exposure;
  finalColor = linearToSRGB(finalColor);

  fragColor = vec4(finalColor, u_color.a * texColor.a);
}