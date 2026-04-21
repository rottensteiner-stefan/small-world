@vertex fn vs(
    @location(0) pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f
) -> Out {
    var o: Out;
    
    let worldPos = obj.model * vec4f(pos, 1.0);
    o.wp = worldPos.xyz;
    o.pos = global.vp * worldPos;
    o.uv = uv * obj.texRepeat + obj.texOffset;
    
    // Improved Normal Matrix (handling scaling correctly)
    let m33 = mat3x3f(obj.model[0].xyz, obj.model[1].xyz, obj.model[2].xyz);
    
    // Normalize normals after transformation to world space
    o.n = normalize(m33 * normal);
    o.t = normalize(m33 * tangent);
    o.b = normalize(cross(o.n, o.t));
    
    return o;
}
