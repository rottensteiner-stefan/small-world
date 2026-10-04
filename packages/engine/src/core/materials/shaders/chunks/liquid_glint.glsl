// 4-point star billboards / sun glint with stepped time quantization for anime water.
// GLSL ES 1.00 and 3.00 compatible.

float waterGlintStar(vec2 p, float steppedTime, float gate) {
    if (gate < 0.85) {
        return 0.0;
    }
    vec2 cell = floor(p);
    vec2 localPos = fract(p) - 0.5;
    float h = waterHash(cell + floor(steppedTime));
    if (h < 0.6) {
        return 0.0;
    }

    float armX = max(1.0 - abs(localPos.x) * 6.0, 0.0) * max(1.0 - abs(localPos.y) * 1.5, 0.0);
    float armY = max(1.0 - abs(localPos.y) * 6.0, 0.0) * max(1.0 - abs(localPos.x) * 1.5, 0.0);
    float star = armX + armY;

    float gateIntensity = smoothstep(0.85, 0.98, gate);
    return star * gateIntensity * (0.6 + 0.4 * sin(h * 6.28318));
}
