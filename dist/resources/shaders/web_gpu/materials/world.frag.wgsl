@group(1) @binding(0) var tDiff: texture_2d<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f {
  var blendWeights = abs(i.n);
  // Sharpness
  blendWeights = pow(blendWeights, vec3f(4.0));
  let totalWeight = blendWeights.x + blendWeights.y + blendWeights.z;
  blendWeights = blendWeights / totalWeight;

  // We use u.tRep as the triplanar scale factor
  var coordX = i.wp.zy * u.tRep;
  var coordY = i.wp.xz * u.tRep;
  var coordZ = i.wp.xy * u.tRep;

  if (i.n.x < 0.0) { coordX.x = -coordX.x; }
  if (i.n.y < 0.0) { coordY.x = -coordY.x; }
  if (i.n.z >= 0.0) { coordZ.x = -coordZ.x; }

  // Use sampler 's' from WGSL_STRUCTS chunk
  let colX = textureSample(tDiff, s, coordX);
  let colY = textureSample(tDiff, s, coordY);
  let colZ = textureSample(tDiff, s, coordZ);

  let finalTexColor = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;

  return u.color * finalTexColor;
}
