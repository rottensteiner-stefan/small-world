[WGSL_STRUCTS]

[WGSL_LIQUID_GERSTNER_WAVE]

@vertex
fn vs(
    @location(0) pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f
) -> Out {
    var o: Out;
    
    let time = obj.time;
    let speed = obj.reflectivity;
    
    var p = pos;
    let worldPosInit = obj.model * vec4f(p, 1.0);
    var wp = worldPosInit.xyz;
    
    let w1 = obj.extraParams;
    let w2 = obj.liquidParams;
    let w3 = obj.thresholds;
    
    var t = vec3f(1.0, 0.0, 0.0);
    var b = vec3f(0.0, 0.0, 1.0);
    var displacement = vec3f(0.0, 0.0, 0.0);

    let w4 = vec4f(w1.y, -w1.x, w1.z * 0.4, w1.w * 0.45); // Detail wave 1 (perpendicular, shorter)
    let w5 = vec4f(-w2.y, w2.x, w2.z * 0.3, w2.w * 0.35); // Detail wave 2

    displacement += gerstnerWave(w1, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w2, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w3, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w4, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w5, wp, speed, time, &t, &b);

    wp += displacement;
    o.wp = wp;
    o.pos = global.vp * vec4f(wp, 1.0);
    
    o.uv = uv;
    o.n = normalize(cross(b, t));
    o.t = normalize(t);
    o.b = normalize(b);
    
    return o;
}
