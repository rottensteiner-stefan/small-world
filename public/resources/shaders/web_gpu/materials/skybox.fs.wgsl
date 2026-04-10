@fragment fn fs(i: Out) -> @location(0) vec4f { 
  return textureSample(t, s, i.uvw); 
}
