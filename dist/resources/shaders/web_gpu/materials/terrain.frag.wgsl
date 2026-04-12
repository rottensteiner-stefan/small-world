@group(1) @binding(2) var tSand: texture_2d<f32>;
@group(1) @binding(3) var tGrass: texture_2d<f32>;
@group(1) @binding(4) var tRock: texture_2d<f32>;
@group(1) @binding(5) var tSnow: texture_2d<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f {
  let sand = textureSample(tSand, s, i.uv);
  let grass = textureSample(tGrass, s, i.uv);
  let rock = textureSample(tRock, s, i.uv);
  let snow = textureSample(tSnow, s, i.uv);

  let h = i.wp.y;
  let b1 = smoothstep(u.thresholds.x - u.thresholds.w, u.thresholds.x + u.thresholds.w, h);
  let b2 = smoothstep(u.thresholds.y - u.thresholds.w, u.thresholds.y + u.thresholds.w, h);
  let b3 = smoothstep(u.thresholds.z - u.thresholds.w, u.thresholds.z + u.thresholds.w, h);

  var texCol = mix(sand, grass, b1);
  texCol = mix(texCol, rock, b2);
  texCol = mix(texCol, snow, b3);

  let terrainNormal = normalize(i.n); 
  let slope = 1.0 - terrainNormal.y;
  let slopeBlend = smoothstep(0.25, 0.45, slope);
  texCol = mix(texCol, rock, slopeBlend);

  [WGSL_LIGHTING]
  return vec4f(fL * u.color.rgb * texCol.rgb, u.color.a * texCol.a);
}
