[WGSL_STRUCTS]

@vertex fn vs(
    @location(0) pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f,
    @location(4) joints: vec4f,
    @location(5) weights: vec4f
) -> Out {
    var o: Out;

    let time = obj.time;
    // u_matParam4: [waveSpeed, waveAmount, waveHeight, viscousDamping]
    let waveSpeed = obj.matParam4.x;
    let waveAmount = obj.matParam4.y;
    let waveHeight = obj.matParam4.z;

    var localPos = vec4f(pos, 1.0);

    // Diagonal viscous undulation (MinionsArt X*Z wave):
    // v.vertex.y += (sin(time * speed + (x * z * amount)) * height)
    let waveOffset = sin(time * waveSpeed + (pos.x * pos.z * waveAmount)) * waveHeight;
    localPos.y += waveOffset;

    let worldPos = obj.model * localPos;
    o.wp = worldPos.xyz;
    o.pos = view.vp * worldPos;

    // Normal transformation
    let m33 = mat3x3f(obj.model[0].xyz, obj.model[1].xyz, obj.model[2].xyz);
    var worldN = m33 * normal;
    if (dot(normal, normal) < 0.0001 || dot(worldN, worldN) < 1e-20) {
        o.n = vec3f(0.0, 1.0, 0.0);
    } else {
        o.n = normalize(worldN);
    }

    o.uv = uv * obj.texRepeat + obj.texOffset;
    o.original_uv = uv;
    o.t = normalize(m33 * tangent);
    o.b = cross(o.n, o.t);
    o.texIndex = 0.0;

    return o;
}
