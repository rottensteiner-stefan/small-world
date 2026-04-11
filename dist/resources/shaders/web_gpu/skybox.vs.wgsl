@vertex fn vs(@location(0) p: vec3f) -> Out { 
  var o: Out; o.uvw = p; o.p = u.vp * u.model * vec4f(p, 1.0); return o; 
}
