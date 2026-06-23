float luma = dot(srgb, vec3(0.2126, 0.7152, 0.0722));
luma = smoothstep(0.04, 0.96, luma);
srgb = mix(vec3(luma * 0.85, luma * 0.88, luma * 0.95), vec3(luma * 1.05, luma * 1.0, luma * 0.9), luma);
