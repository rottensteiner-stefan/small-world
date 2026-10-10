[WGSL_LIQUID_WORLEY_NOISE]

@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let time = obj.time;

    // --- Uniform Parameter Mapping ---
    // u_matParam0: [scaleMain, scaleDistort, distortionStrength, pulseFrequency]
    let scaleMain = obj.matParam0.x;
    let scaleDistort = obj.matParam0.y;
    let distortionStrength = obj.matParam0.z;
    let pulseFrequency = obj.matParam0.w;

    // u_matParam1: [speedMainX, speedMainY, speedDistortX, speedDistortY]
    let speedMain = obj.matParam1.xy;
    let speedDistort = obj.matParam1.zw;

    // u_matParam2: [cutoffTop, topBlur, tintOffset, pulseAmount]
    let cutoffTop = obj.matParam2.x;
    let topBlur = obj.matParam2.y;
    let tintOffset = obj.matParam2.z;
    let pulseAmount = obj.matParam2.w;

    // u_matParam3: [edgeThickness, edgeBlur, depthFalloff, unused]
    let edgeThickness = obj.matParam3.x;
    let edgeBlur = obj.matParam3.y;

    // u_matParam5: [brightnessUnderLava, brightnessTopLava, brightnessEdge, emissionGlowPower]
    let brightnessUnderLava = obj.matParam5.x;
    let brightnessTopLava = obj.matParam5.y;
    let brightnessEdge = obj.matParam5.z;

    // Colors:
    // u_matParam6: Main Tint Start (Cool Basalt / Crust Color - RGB)
    let colorStart = sRGBToLinear(obj.matParam6.rgb);
    // u_matParam7: Main Tint End (Molten Core Color - RGB)
    let colorEnd = sRGBToLinear(obj.matParam7.rgb);
    // u_matParam8: Top Fissure Tint (Superheated Seams - RGB)
    let colorTop = sRGBToLinear(obj.matParam8.rgb);
    // u_matParam9: Contact Edge Tint (Shore Scorch Glow - RGB)
    let colorEdge = sRGBToLinear(obj.matParam9.rgb);

    // --- 1. Dual-Frequency Flow Distortion (MinionsArt) ---
    // World-Space XZ coordinates for seamless procedural tiling
    let uvDistortBase = i.wp.xz * scaleDistort;
    let speedDistortCombined = speedDistort * time;

    // Sample continuous noise at two scales (1x and 0.5x)
    let d1 = waterCellNoise(uvDistortBase + speedDistortCombined);
    let d2 = waterCellNoise((i.wp.xz * (scaleDistort * 0.5)) + speedDistortCombined);
    let layeredDist = saturate((d1 + d2) * 0.5);

    // --- 2. Main Crust Coordinate with Flow Distortion ---
    let uvMainBase = i.wp.xz * scaleMain;
    let speedMainCombined = speedMain * time;
    let uvMainDistorted = uvMainBase + (layeredDist * distortionStrength) + speedMainCombined;

    // Sample main Voronoi crust pattern
    // (If diffuseMap is bound, sample it; otherwise use procedural Worley cell noise)
    var crustNoise: f32 = 0.0;
    if (USE_DIFFUSE_MAP) {
        crustNoise = textureSample(u_diffuseMap, s, uvMainDistorted).r;
    } else {
        crustNoise = waterCellNoise(uvMainDistorted);
    }

    // Composite layered noise onto main pattern
    let colPattern = saturate(crustNoise + layeredDist * 0.35);

    // --- 3. Scene Depth Edge Detection (Organic Shore Scorch) ---
    let fragPosCoords = vec2<i32>(i.pos.xy);
    let bgDepth = textureLoad(u_opaqueDepthMap, fragPosCoords, 0);

    let near = global.cameraNearFar.x;
    let far = global.cameraNearFar.y;

    let ndcBg = bgDepth * 2.0 - 1.0;
    let linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    let ndcFrag = i.pos.z * 2.0 - 1.0;
    let linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    let depthDiff = max(linBgDepth - linFragDepth, 0.0);
    let edgeLine = 1.0 - saturate(edgeThickness * depthDiff);

    // MinionsArt Organic Shoreline: carve edge line based on the inverse of the crust texture
    let edgeMask = smoothstep(1.0 - colPattern, (1.0 - colPattern) + edgeBlur, edgeLine);

    // --- 4. Glowing Top Fissures / Cracks Isolation ---
    let topMask = smoothstep(cutoffTop, cutoffTop + topBlur, colPattern);

    // --- 5. Thermal Heat Calculation & Ramp LUT (Lücke 3 Muscle Flex) ---
    var baseColor: vec3<f32>;
    let pulse = 1.0 + pulseAmount * sin(time * pulseFrequency);

    if (USE_RAMP_MAP) {
        // Thermal heat coordinate T_heat in [0, 1]
        let heatCoord = saturate(colPattern * tintOffset * pulse);
        let rampUv = vec2<f32>((heatCoord * 255.0 + 0.5) / 256.0, 0.5);
        let thermalRgb = sRGBToLinear(textureSampleLevel(u_rampMap, s, rampUv, 0.0).rgb);
        baseColor = thermalRgb * brightnessUnderLava;
    } else {
        // MinionsArt 3-color lerp
        baseColor = mix(colorStart, colorEnd, saturate(colPattern * tintOffset)) * brightnessUnderLava * pulse;
    }

    // --- 6. Non-Overlapping Subtractive Isolation (Anti-Blowout Algebra) ---
    // Carve out edge and top fissure footprints from base color to eliminate HDR bloom burnout
    baseColor *= (1.0 - edgeMask);
    baseColor *= (1.0 - topMask);

    // Re-inject distinct glowing emissive layers with independent HDR intensity multipliers
    let emissiveEdge = edgeMask * colorEdge * brightnessEdge;
    let emissiveTop = topMask * colorTop * brightnessTopLava;

    var finalRgb = baseColor + emissiveEdge + emissiveTop;

    // Exposure & Tonemapping
    finalRgb *= global.exposure;
    if (global.gamma != 1.0) {
        finalRgb = finalRgb / (finalRgb + vec3f(1.0)); // Reinhard
    }
    finalRgb = linearToSRGB(finalRgb);

    // The fog chunk blends a `color` variable in-place
    var color = finalRgb;
    [WGSL_FOG_CALC]

    return vec4<f32>(color, 1.0);
}
