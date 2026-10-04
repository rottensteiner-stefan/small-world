// 4-point star billboards / sun glint with stepped time quantization for anime water in WGSL.

fn waterGlintStar(p: vec2<f32>, steppedTime: f32, gate: f32) -> f32 {
    if (gate < 0.85) {
        return 0.0;
    }
    let cell = floor(p);
    let localPos = fract(p) - 0.5;
    let h = waterHash(cell + floor(steppedTime));
    if (h < 0.6) {
        return 0.0;
    }

    let armX = max(1.0 - abs(localPos.x) * 6.0, 0.0) * max(1.0 - abs(localPos.y) * 1.5, 0.0);
    let armY = max(1.0 - abs(localPos.y) * 6.0, 0.0) * max(1.0 - abs(localPos.x) * 1.5, 0.0);
    let star = armX + armY;

    let gateIntensity = smoothstep(0.85, 0.98, gate);
    return star * gateIntensity * (0.6 + 0.4 * sin(h * 6.28318));
}
