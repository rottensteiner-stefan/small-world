struct Out {
    @builtin(position) p: vec4f,
    @location(0) uvw: vec3f
}

@vertex fn vs(@location(0) p: vec3f) -> Out { 
    var o: Out;
    o.uvw = p;
    o.p = u.vp * u.model * vec4f(p, 1.0);
    return o; 
}
