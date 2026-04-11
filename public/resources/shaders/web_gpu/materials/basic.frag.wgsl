@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texCol = textureSample(tDiff, s, i.uv);
  return u.color * texCol;
}
