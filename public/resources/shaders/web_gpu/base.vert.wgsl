struct Out {
    @builtin(position) pos: vec4f,
    @location(0) wp: vec3f,
    @location(1) n: vec3f,
    @location(2) uv: vec2f,
    @location(3) t: vec3f,
    @location(4) b: vec3f
}

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
    let normalMatrix = mat3x3f(obj.model[0].xyz, obj.model[1].xyz, obj.model[2].xyz);
    o.n = normalize(normalMatrix * normal);
    o.t = normalize(normalMatrix * tangent);
    o.b = normalize(cross(o.n, o.t));
    return o;
}
