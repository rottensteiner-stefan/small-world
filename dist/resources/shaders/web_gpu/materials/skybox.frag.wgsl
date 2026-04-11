@group(1) @binding(0) var t: texture_cube<f32>;

@fragment fn fs(i: Out) -> @location(0) vec4f { 
  return textureSample(t, s, i.uvw); 
}
