struct Out { @builtin(position) p: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f }

@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Out {
  var o: Out; let worldP = u.model * vec4f(p, 1.0); o.p = u.vp * worldP; o.wp = worldP.xyz;
  o.n = (u.model * vec4f(n, 0.0)).xyz; o.uv = (uv * u.tRep) + u.tOff; return o;
}
