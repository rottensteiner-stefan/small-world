if (u_filterMode == 1) { // Night Vision
    float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
    float scanline = sin(distortUv.y * 350.0 + u_time * 12.0) * 0.08;
    luma -= scanline;
    float flicker = 1.0 + (sin(u_time * 40.0) * cos(u_time * 25.0) * 0.03);
    luma *= flicker;
    
    float noise = random(distortUv + vec2(u_time, -u_time));
    if (noise > 0.99) {
        luma += 0.25;
    }
    srgb = vec3(luma * 0.12, luma * 1.6, luma * 0.25);
}
else if (u_filterMode == 2) { // Noir Detective
    float luma = dot(srgb, vec3(0.2126, 0.7152, 0.0722));
    luma = smoothstep(0.04, 0.96, luma);
    srgb = mix(vec3(luma * 0.85, luma * 0.88, luma * 0.95), vec3(luma * 1.05, luma * 1.0, luma * 0.9), luma);
}
else if (u_filterMode == 3) { // Cyber Glitch
    srgb.r *= 1.25;
    srgb.g *= 0.75;
    srgb.b *= 1.5;
    srgb = pow(clamp(srgb, 0.0, 1.0), vec3(1.2));
    float grid = sin(distortUv.y * 450.0) * 0.05;
    srgb -= vec3(grid);
}
else if (u_filterMode == 4) { // VHS Tape
    float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
    srgb = mix(srgb, vec3(luma), 0.45);
    float scanline = sin(distortUv.y * 280.0) * 0.06;
    srgb -= vec3(scanline);
    srgb.r *= 1.15;
    srgb.g *= 0.95;
    srgb.b *= 0.82;
    float lineNoise = step(0.99, random(vec2(u_time, distortUv.y)));
    srgb += vec3(lineNoise * 0.2);
}
else if (u_filterMode == 5) { // Underworld
    srgb.r *= 1.35;
    srgb.g *= 0.88;
    srgb.b *= 0.52;
    srgb = pow(clamp(srgb, 0.0, 1.0), vec3(1.3));
}
else if (u_filterMode == 6) { // Old Projector
    float projFlicker = 0.85 + 0.15 * random(vec2(u_time * 25.0, 9.0));
    srgb *= projFlicker;
    float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
    srgb = vec3(luma * 1.15, luma * 0.95, luma * 0.75);
    
    float scratchX = random(vec2(floor(u_time * 8.0), 12.0));
    float scratchWidth = 0.0012;
    float isScratch = step(scratchX, distortUv.x) * step(distortUv.x, scratchX + scratchWidth);
    float scratchVis = step(0.65, random(vec2(floor(u_time * 4.0), 13.0)));
    float scratchIntensity = isScratch * scratchVis * (0.4 + 0.6 * random(distortUv + u_time));
    srgb = mix(srgb, vec3(1.0), scratchIntensity);
    
    float spotFrame = floor(u_time * 12.0);
    vec2 spotPos = vec2(random(vec2(spotFrame, 14.0)), random(vec2(spotFrame, 15.0)));
    float spotRadius = 0.006 + 0.012 * random(vec2(spotFrame, 16.0));
    float distToSpot = distance(distortUv, spotPos);
    float isSpot = step(distToSpot, spotRadius) * step(0.82, random(vec2(spotFrame, 17.0)));
    
    float hairSeed = random(vec2(spotFrame, 18.0));
    float isHair = 0.0;
    if (hairSeed > 0.80) {
        float hairX = spotPos.x + sin(distortUv.y * 60.0 + spotFrame) * 0.004;
        float hairWidth = 0.0008;
        isHair = step(hairX - hairWidth, distortUv.x) * step(distortUv.x, hairX + hairWidth) * step(abs(distortUv.y - spotPos.y), 0.06);
    }
    float dirtColor = max(isSpot, isHair);
    srgb = mix(srgb, vec3(random(vec2(spotFrame)) > 0.5 ? 0.05 : 0.95), dirtColor);
}
else if (u_filterMode == 7) { // Thermal Vision
    float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
    vec3 cold = vec3(0.05, 0.05, 0.45);
    vec3 warm = vec3(0.85, 0.1, 0.05);
    vec3 hot = vec3(0.95, 0.9, 0.05);
    vec3 whiteHot = vec3(1.0, 1.0, 1.0);
    
    vec3 c1 = mix(cold, warm, clamp(luma / 0.3, 0.0, 1.0));
    vec3 c2 = mix(c1, hot, clamp((luma - 0.3) / 0.4, 0.0, 1.0));
    srgb = mix(c2, whiteHot, clamp((luma - 0.7) / 0.3, 0.0, 1.0));
}
