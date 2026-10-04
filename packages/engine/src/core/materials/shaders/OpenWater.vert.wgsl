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

    let w4 = vec4f(w1.y, -w1.x, w1.z * 0.45, w1.w * 0.42); // Detail wave 1 (perpendicular, shorter)
    let w5 = vec4f(-w2.y, w2.x, w2.z * 0.35, w2.w * 0.35); // Detail wave 2
    let w6 = vec4f(w1.x * 0.5 - w1.y * 0.866, w1.x * 0.866 + w1.y * 0.5, w1.z * 0.25, w1.w * 0.22); // Bimodal 60-deg cross-swell

    displacement += gerstnerWave(w1, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w2, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w3, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w4, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w5, wp, speed, time, &t, &b);
    displacement += gerstnerWave(w6, wp, speed, time, &t, &b);

    wp += displacement;
    o.wp = wp;
    o.pos = global.vp * vec4f(wp, 1.0);

    // Crest foam metric: horizontal Jacobian of the Gerstner displacement, J = Tx*Bz - Tz*Bx
    // (t/b are dP/dx, dP/dz). J < 1 means the surface is compressed (wave crest pinching),
    // J <= 0 means folding. Normalised by the summed steepness so the 0..1 range is
    // preset-independent. Carried in Out.original_uv.x (unused by this shader). NOT in Out.texIndex: GPUPipelineCache
    // injects a texIndex assignment at the end of every vertex function and would overwrite it.
    // (Never write the literal end-of-function statement in a comment here: it is regex-matched.)
    let steepSum = w1.z + w2.z + w3.z + w4.z + w5.z + w6.z;
    let jacobian = t.x * b.z - t.z * b.x;
    o.original_uv = vec2f(clamp((1.0 - jacobian) / max(steepSum, 0.001), -1.0, 1.0), 0.0);
    
    o.uv = uv;
    o.n = normalize(cross(b, t));
    o.t = normalize(t);
    o.b = normalize(b);
    
    return o;
}
