[WGSL_STRUCTS]

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
    
    let waves = array<vec4f, 3>(w1, w2, w3);
    
    for (var i = 0; i < 3; i++) {
        let wave = waves[i];
        let dir = normalize(wave.xy);
        let steepness = wave.z;
        let wavelength = wave.w;
        let k = 2.0 * 3.14159 / max(wavelength, 0.001);
        let a = steepness / max(k, 0.001);
        let c = speed;
        let f = k * (dot(dir, wp.xz) - c * time);
        let cosf = cos(f);
        let sinf = sin(f);
        
        let WA = a * k * dir.x * dir.y;
        let WB = a * k * dir.x * dir.x;
        let WC = a * k * dir.y * dir.y;
        
        displacement.x += dir.x * a * cosf;
        displacement.y += a * sinf;
        displacement.z += dir.y * a * cosf;
        
        t.x -= WB * sinf;
        t.y += dir.x * k * a * cosf;
        t.z -= WA * sinf;
        
        b.x -= WA * sinf;
        b.y += dir.y * k * a * cosf;
        b.z -= WC * sinf;
    }
    
    wp += displacement;
    o.wp = wp;
    o.pos = global.vp * vec4f(wp, 1.0);
    
    o.uv = uv;
    o.n = normalize(cross(b, t));
    o.t = normalize(t);
    o.b = normalize(b);
    
    return o;
}
