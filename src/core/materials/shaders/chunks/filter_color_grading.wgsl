if (1u == u.filterMode) { // Night Vision
    var luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
    let scanline = sin(distortUv.y * 350.0 + u.time * 12.0) * 0.08;
    luma -= scanline;
    let flicker = 1.0 + (sin(u.time * 40.0) * cos(u.time * 25.0) * 0.03);
    luma *= flicker;

    let noise = random(distortUv + vec2f(u.time, -u.time));
    if (noise > 0.99) {
        luma += 0.25;
    }

    srgb = vec3f(luma * 0.12, luma * 1.6, luma * 0.25);
}
else if (2u == u.filterMode) { // Noir Detective
    var luma = dot(srgb, vec3f(0.2126, 0.7152, 0.0722));
    luma = smoothstep(0.04, 0.96, luma);
    srgb = mix(vec3f(luma * 0.85, luma * 0.88, luma * 0.95), vec3f(luma * 1.05, luma * 1.0, luma * 0.9), luma);
}
else if (3u == u.filterMode) { // Cyber Glitch
    srgb.x *= 1.25;
    srgb.y *= 0.75;
    srgb.z *= 1.5;
    srgb = pow(clamp(srgb, vec3f(0.0), vec3f(1.0)), vec3f(1.2));
    let grid = sin(distortUv.y * 450.0) * 0.05;
    srgb -= vec3f(grid);
}
else if (4u == u.filterMode) { // VHS Tape
    let luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
    srgb = mix(srgb, vec3f(luma), 0.45);
    let scanline = sin(distortUv.y * 280.0) * 0.06;
    srgb -= vec3f(scanline);
    srgb.x *= 1.15;
    srgb.y *= 0.95;
    srgb.z *= 0.82;
    let lineNoise = step(0.99, random(vec2f(u.time, distortUv.y)));
    srgb += vec3f(lineNoise * 0.2);
}
else if (5u == u.filterMode) { // Underworld
    srgb.x *= 1.35;
    srgb.y *= 0.88;
    srgb.z *= 0.52;
    srgb = pow(clamp(srgb, vec3f(0.0), vec3f(1.0)), vec3f(1.3));
}
else if (6u == u.filterMode) { // Old Projector
    let projFlicker = 0.85 + 0.15 * random(vec2f(u.time * 25.0, 9.0));
    srgb *= projFlicker;
    let luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
    srgb = vec3f(luma * 1.15, luma * 0.95, luma * 0.75);
    
    let scratchX = random(vec2f(floor(u.time * 8.0), 12.0));
    let scratchWidth = 0.0012;
    let isScratch = step(scratchX, distortUv.x) * step(distortUv.x, scratchX + scratchWidth);
    let scratchVis = step(0.65, random(vec2f(floor(u.time * 4.0), 13.0)));
    let scratchIntensity = isScratch * scratchVis * (0.4 + 0.6 * random(distortUv + vec2f(u.time)));
    srgb = mix(srgb, vec3f(1.0), scratchIntensity);
    
    let spotFrame = floor(u.time * 12.0);
    let spotPos = vec2f(random(vec2f(spotFrame, 14.0)), random(vec2f(spotFrame, 15.0)));
    let spotRadius = 0.006 + 0.012 * random(vec2f(spotFrame, 16.0));
    let distToSpot = distance(distortUv, spotPos);
    let isSpot = step(distToSpot, spotRadius) * step(0.82, random(vec2f(spotFrame, 17.0)));
    
    let hairSeed = random(vec2f(spotFrame, 18.0));
    let hairX = spotPos.x + sin(distortUv.y * 60.0 + spotFrame) * 0.004;
    let hairWidth = 0.0008;
    let isHair = select(0.0, step(hairX - hairWidth, distortUv.x) * step(distortUv.x, hairX + hairWidth) * step(abs(distortUv.y - spotPos.y), 0.06), hairSeed > 0.80);
    let dirtColor = max(isSpot, isHair);
    srgb = mix(srgb, vec3f(select(0.95, 0.05, random(vec2f(spotFrame, 19.0)) > 0.5)), dirtColor);
}
else if (7u == u.filterMode) { // Thermal Vision
    let luma = dot(srgb, vec3f(0.299, 0.587, 0.114));
    let cold = vec3f(0.05, 0.05, 0.45);
    let warm = vec3f(0.85, 0.1, 0.05);
    let hot = vec3f(0.95, 0.9, 0.05);
    let whiteHot = vec3f(1.0, 1.0, 1.0);

    let c1 = mix(cold, warm, clamp(luma / 0.3, 0.0, 1.0));
    let c2 = mix(c1, hot, clamp((luma - 0.3) / 0.4, 0.0, 1.0));
    srgb = mix(c2, whiteHot, clamp((luma - 0.7) / 0.3, 0.0, 1.0));
}
