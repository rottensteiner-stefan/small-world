[WGSL_LIQUID_WORLEY_NOISE]
[WGSL_LIQUID_CAUSTICS]
[WGSL_LIQUID_GLINT]
[WGSL_WATER_EXT_DECL]

// Anti-aliased threshold: replaces a binary step() with a smoothstep ramp whose width tracks the
// local screen-space gradient (fwidth), so hard mask edges de-quantize instead of aliasing. The
// ramp only widens where the underlying value actually varies fast per pixel -- slow gradations
// stay pixel-sharp, which preserves the stylized toon identity (sharp edges, no jaggies/banding).
fn aaStepMask(edge: f32, value: f32, softness: f32) -> f32 {
    let width = max(fwidth(value) * 1.5, softness);
    return smoothstep(edge - width, edge + width, value);
}

@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let shallowColor = sRGBToLinear(obj.color.rgb);
    let deepColor = sRGBToLinear(obj.specColor.rgb);
    let edgeColor = sRGBToLinear(vec3<f32>(obj.texOffset.x, obj.texOffset.y, obj.texRepeat.x));
    let edgeSoftness = max(obj.texRepeat.y, 0.001);
    let foamDistance = max(obj.pad3, 0.001);

    let fragPosCoords = vec2<i32>(i.pos.xy);
    let bgDepth = textureLoad(u_opaqueDepthMap, fragPosCoords, 0);

    let near = global.cameraNearFar.x;
    let far = global.cameraNearFar.y;

    let ndcBg = bgDepth * 2.0 - 1.0;
    let linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    let ndcFrag = i.pos.z * 2.0 - 1.0;
    let linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    let depthDiff = max(linBgDepth - linFragDepth, 0.0);

    // Screen-space Refraction (Masked strictly to depthDiff > 0.0)
    let screenRes = vec2<f32>(textureDimensions(u_opaqueDepthMap));
    let screenUv = i.pos.xy / screenRes;
    let refrDamping = clamp(depthDiff / 0.3, 0.0, 1.0);
    let distortedUv = screenUv + (i.n.xz * obj.shininess * refrDamping);
    let distortedCoords = vec2<i32>(distortedUv * screenRes);
    let distortedBgDepth = textureLoad(u_opaqueDepthMap, distortedCoords, 0);
    let ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    let linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    let refractionUv = select(screenUv, distortedUv, linDistortedBgDepth > linFragDepth);

    let opaqueUnderwaterColor = sRGBToLinear(textureSample(u_opaqueMap, s, refractionUv).rgb);

    // Ground Position Reconstruction for Directional Caustics Projection
    let viewDir = normalize(i.wp - global.viewPos.xyz);
    let groundWorldPos = i.wp + viewDir * depthDiff;

    let causticsDistortionStrength = 0.45;
    let uvCaustics = groundWorldPos.xz + (i.n.xz * causticsDistortionStrength);
    let causticsSpeed = obj.pad2 * 0.75;

    let maxCausticsDepth = 6.0;
    let causticsFade = 1.0 - smoothstep(0.0, maxCausticsDepth, depthDiff);
    let causticsColor = vec3<f32>(1.0, 0.98, 0.88);
    var finalCaustics = vec3<f32>(0.0);
    var illuminatedUnderwater = opaqueUnderwaterColor;

    if (obj.styleB.w > 0.5) {
        let warpedCaustics = waterDomainWarp(uvCaustics * (obj.useReflectionMap * 0.9), obj.time * causticsSpeed);
        let lineSignal = waterCausticLine(warpedCaustics, 0.15);
        let causticLine = aaStepMask(0.45, lineSignal, 0.08);
        finalCaustics = vec3<f32>(causticLine) * causticsFade * causticsColor * obj.specColor.a;
        illuminatedUnderwater = opaqueUnderwaterColor * mix(vec3<f32>(0.85, 0.92, 0.98), vec3<f32>(1.0), 1.0 - causticLine * 0.4) + finalCaustics;
    } else {
        let causticsUv1 = uvCaustics * (obj.useReflectionMap * 0.85) + vec2<f32>(obj.time * causticsSpeed, obj.time * causticsSpeed * 0.5);
        let causticsUv2 = uvCaustics * (obj.useReflectionMap * 1.1) - vec2<f32>(obj.time * causticsSpeed * 0.6, obj.time * causticsSpeed * 0.8);
        let causticsNoise1 = 1.0 - waterCellNoise(causticsUv1);
        let causticsNoise2 = 1.0 - waterCellNoise(causticsUv2);
        let causticsThreshold = 0.42;
        finalCaustics = vec3<f32>(aaStepMask(causticsThreshold, causticsNoise1 * causticsNoise2, 0.08)) * causticsFade * causticsColor * obj.specColor.a;
        illuminatedUnderwater = opaqueUnderwaterColor + finalCaustics;
    }

    let waterAbsorption = vec3<f32>(obj.isSkinned, obj.boneOffset, obj.pad1);
    let washNoise = (waterCellNoise(i.wp.xz * 0.5 + vec2<f32>(obj.time * 0.08, obj.time * 0.04)) - 0.5) * obj.styleA.y;
    let effDepth = max(depthDiff + washNoise * 1.5, 0.0);
    let transmittance = exp(-effDepth * waterAbsorption);
    let tintedSeabed = illuminatedUnderwater * shallowColor;
    let inScatterCol = mix(shallowColor, deepColor, 0.35) * 0.15;
    let underwaterLighting = tintedSeabed * transmittance + inScatterCol * (1.0 - transmittance);
    var baseWaterColor = mix(deepColor, underwaterLighting, transmittance);

    if (obj.styleA.x > 0.05) {
        let rampT = clamp(effDepth / 4.0, 0.0, 1.0);
        let midColor = mix(shallowColor, deepColor, 0.5) * vec3<f32>(0.9, 1.1, 1.05);
        var softRamp = mix(shallowColor, midColor, smoothstep(0.0, 0.5, rampT));
        softRamp = mix(softRamp, deepColor, smoothstep(0.4, 1.0, rampT));
        baseWaterColor = mix(baseWaterColor, softRamp, obj.styleA.x * 0.6);
    }

    let edgeBlend = 1.0 - saturate(depthDiff / edgeSoftness);
    var surfaceColor = mix(baseWaterColor, edgeColor, smoothstep(0.0, 1.0, edgeBlend) * 0.6);

    let camDir = normalize(global.viewPos.xyz - i.wp);
    let fresnel = pow(1.0 - saturate(dot(i.n, camDir)), 4.0);
    let skyColor = vec3<f32>(0.65, 0.85, 1.0);
    let skyFactor = select(0.45, obj.styleB.y, obj.styleB.w > 0.5);
    surfaceColor = mix(surfaceColor, skyColor, fresnel * skyFactor);

    let lightDir = normalize(global.dirLightDir.xyz);
    let halfVector = normalize(lightDir + camDir);
    let nDotH = saturate(dot(i.n, halfVector));
    let specular = aaStepMask(0.99, nDotH, 0.008) * obj.color.a;
    surfaceColor += global.dirLightColor.rgb * specular;

    if (obj.styleB.z > 0.0) {
        let stepFps = select(12.0, 8.0, obj.styleB.w > 1.5);
        let glint = waterGlintStar(i.wp.xz * 3.5, obj.time * stepFps, nDotH) * obj.styleB.z;
        surfaceColor += vec3<f32>(1.0, 0.92, 0.7) * glint * obj.color.a;
    }

    if (obj.styleA.z > 0.0) {
        let ripplePattern = sin((i.wp.x + i.wp.z) * obj.styleA.w + obj.time * 1.5);
        let rippleLine = aaStepMask(0.75, ripplePattern, 0.05) * obj.styleA.z * (1.0 - smoothstep(0.0, 5.0, depthDiff));
        surfaceColor += edgeColor * rippleLine * 0.5;
    }

    let foamColor = sRGBToLinear(vec3<f32>(obj.isTerrain, obj.metallic, obj.roughness));
    let foamCutoff = obj.useEnvMap;
    let foamScale = obj.useReflectionMap;
    let foamSpeed = obj.pad2;
    let foamSoftness = select(0.06, max(obj.styleB.x, 0.01), obj.styleB.w > 0.5);

    // Shoreline foam
    let uvFoam1 = i.wp.xz * foamScale + vec2<f32>(obj.time * foamSpeed, obj.time * foamSpeed * 0.4);
    let uvFoam2 = i.wp.xz * (foamScale * 1.4) - vec2<f32>(obj.time * foamSpeed * 0.5, obj.time * foamSpeed * 0.8);
    let noise1 = 1.0 - waterCellNoise(uvFoam1);
    let noise2 = 1.0 - waterCellNoise(uvFoam2);
    let shoreFoamDepthMod = 1.0 - smoothstep(0.0, foamDistance, depthDiff);
    let shoreFoamMask = (noise1 * noise2) * shoreFoamDepthMod;
    let finalShoreFoam = aaStepMask(foamCutoff, shoreFoamMask, foamSoftness);

    var finalColor = mix(surfaceColor, foamColor, finalShoreFoam);

    [WGSL_WATER_EXT_SURFACE]

    finalColor *= global.exposure;
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}
