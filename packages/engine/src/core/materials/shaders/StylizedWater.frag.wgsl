[WGSL_LIQUID_WORLEY_NOISE]

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
    let distortedUv = screenUv + i.n.xz * obj.shininess;
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
    let causticsUv1 = uvCaustics * (obj.useReflectionMap * 0.85) + vec2<f32>(obj.time * causticsSpeed, obj.time * causticsSpeed * 0.5);
    let causticsUv2 = uvCaustics * (obj.useReflectionMap * 1.1) - vec2<f32>(obj.time * causticsSpeed * 0.6, obj.time * causticsSpeed * 0.8);
    let causticsNoise1 = 1.0 - waterCellNoise(causticsUv1);
    let causticsNoise2 = 1.0 - waterCellNoise(causticsUv2);

    let maxCausticsDepth = 6.0;
    let causticsFade = 1.0 - smoothstep(0.0, maxCausticsDepth, depthDiff);
    let causticsThreshold = 0.42;
    let causticsColor = vec3<f32>(1.0, 0.98, 0.88);
    let finalCaustics = vec3<f32>(step(causticsThreshold, causticsNoise1 * causticsNoise2)) * causticsFade * causticsColor * 1.2;

    let illuminatedUnderwater = opaqueUnderwaterColor + finalCaustics;

    let waterAbsorption = vec3<f32>(obj.isSkinned, obj.boneOffset, obj.pad1);
    let transmittance = exp(-depthDiff * waterAbsorption);
    let tintedSeabed = illuminatedUnderwater * shallowColor;
    var baseWaterColor = mix(deepColor, tintedSeabed, transmittance);

    let edgeBlend = 1.0 - saturate(depthDiff / edgeSoftness);
    var surfaceColor = mix(baseWaterColor, edgeColor, edgeBlend * 0.7);

    let camDir = normalize(global.viewPos.xyz - i.wp);
    let fresnel = pow(1.0 - saturate(dot(i.n, camDir)), 4.0);
    let skyColor = vec3<f32>(0.65, 0.85, 1.0);
    surfaceColor = mix(surfaceColor, skyColor, fresnel * 0.45);

    let lightDir = normalize(global.dirLightDir.xyz);
    let halfVector = normalize(lightDir + camDir);
    let nDotH = saturate(dot(i.n, halfVector));
    let specular = step(0.92, nDotH) * 1.2;
    surfaceColor += global.dirLightColor.rgb * specular;

    let foamColor = sRGBToLinear(vec3<f32>(obj.isTerrain, obj.metallic, obj.roughness));
    let foamCutoff = obj.useEnvMap;
    let foamScale = obj.useReflectionMap;
    let foamSpeed = obj.pad2;

    // Shoreline foam
    let uvFoam1 = i.wp.xz * foamScale + vec2<f32>(obj.time * foamSpeed, obj.time * foamSpeed * 0.4);
    let uvFoam2 = i.wp.xz * (foamScale * 1.4) - vec2<f32>(obj.time * foamSpeed * 0.5, obj.time * foamSpeed * 0.8);
    let noise1 = 1.0 - waterCellNoise(uvFoam1);
    let noise2 = 1.0 - waterCellNoise(uvFoam2);
    let shoreFoamDepthMod = 1.0 - smoothstep(0.0, foamDistance, depthDiff);
    let shoreFoamMask = (noise1 * noise2) * shoreFoamDepthMod;
    let finalShoreFoam = step(foamCutoff, shoreFoamMask);

    // Wave Crest foam
    let crestIntensity = smoothstep(0.92, 0.75, i.n.y);
    let crestFoamCutoff = foamCutoff * 0.85;
    let finalCrestFoam = step(crestFoamCutoff, noise1 * crestIntensity);

    let totalFoam = max(finalShoreFoam, finalCrestFoam);
    var finalColor = mix(surfaceColor, foamColor, totalFoam);

    finalColor *= global.exposure;
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}
