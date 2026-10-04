[WGSL_LIQUID_WORLEY_NOISE]

@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let waterColor = sRGBToLinear(obj.color.rgb);
    let deepWaterColor = sRGBToLinear(obj.specColor.rgb);

    let edgeColor = vec3<f32>(obj.texOffset.x, obj.texOffset.y, obj.texRepeat.x);
    let edgeSoftness = max(obj.texRepeat.y, 0.001);
    // obj.pad3 is the last remaining free named slot -- repurposed to carry foamDistance,
    // decoupled from edgeSoftness (see OpenWaterMaterial.ts).
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

    // Screen-space refraction: distort the sample point by the wave normal's horizontal
    // components (obj.shininess is repurposed as refractionStrength, see OpenWaterMaterial.ts).
    // If the distorted sample lands in front of the water surface, fall back to the undistorted
    // texel -- otherwise that pixel would show something that's not actually underwater.
    let screenRes = vec2<f32>(textureDimensions(u_opaqueDepthMap));
    let screenUv = i.pos.xy / screenRes;
    let refrDamping = clamp(depthDiff / 0.3, 0.0, 1.0);
    let distortedUv = screenUv + (i.n.xz * obj.shininess * refrDamping);
    let distortedCoords = vec2<i32>(distortedUv * screenRes);
    let distortedBgDepth = textureLoad(u_opaqueDepthMap, distortedCoords, 0);
    let ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    let linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    let refractionUv = select(screenUv, distortedUv, linDistortedBgDepth > linFragDepth);

    let refractedColor = sRGBToLinear(textureSample(u_opaqueMap, s, refractionUv).rgb);

    // Beer-Lambert absorption: light traveling through `depthDiff` units of water loses each
    // color channel at its own exponential rate (waterAbsorption). Ambient in-scattering prevents
    // unnatural blackness in deep or shaded regions.
    let waterAbsorption = vec3<f32>(obj.isSkinned, obj.boneOffset, obj.pad1);
    let transmittance = exp(-depthDiff * waterAbsorption);
    let tintedSeabed = refractedColor * waterColor;
    let inScatterCol = mix(waterColor, deepWaterColor, 0.35) * 0.15;
    let underwaterLighting = tintedSeabed * transmittance + inScatterCol * (1.0 - transmittance);
    var baseColor = mix(deepWaterColor, underwaterLighting, transmittance);

    let edgeBlend = 1.0 - saturate(depthDiff / edgeSoftness);

    let viewDir = normalize(global.viewPos.xyz - i.wp);
    let fresnel = pow(1.0 - saturate(dot(i.n, viewDir)), 5.0);
    let skyColor = vec3<f32>(0.6, 0.8, 1.0);
    baseColor = mix(baseColor, skyColor, fresnel * 0.5);

    let lightDir = normalize(global.dirLightDir.xyz);
    let halfVector = normalize(lightDir + viewDir);
    let nDotH = saturate(dot(i.n, halfVector));
    let specular = pow(nDotH, 100.0) * 1.5;
    baseColor += global.dirLightColor.rgb * specular;

    let edgeColLinear = sRGBToLinear(edgeColor);
    var finalColor = mix(baseColor, edgeColLinear, edgeBlend);

    // Procedural foam: a Worley-noise pattern drifting in world-space XZ, masked to its own
    // shoreline/intersection band (foamDistance).
    let foamColor = sRGBToLinear(vec3<f32>(obj.isTerrain, obj.metallic, obj.roughness));
    let foamCutoff = obj.useEnvMap;
    let foamNoiseScale = obj.useReflectionMap;
    let foamNoiseSpeed = obj.pad2;
    let foamBlend = 1.0 - saturate(depthDiff / foamDistance);
    let foamUv = i.wp.xz * foamNoiseScale + obj.time * foamNoiseSpeed;
    let foamCell = waterCellNoise(foamUv);
    let foamPattern = 1.0 - smoothstep(foamCutoff, foamCutoff + 0.15, foamCell);

    // Splash pulse: modulates intersection foam intensity over time instead of a static band
    let splashPhase = dot(normalize(vec2<f32>(1.0, 0.4)), i.wp.xz) * 0.8 - obj.time * 1.6;
    let splashPulse = 0.6 + 0.4 * sin(splashPhase);
    let foamMask = foamPattern * foamBlend * splashPulse;

    // Wave-crest foam from vertex Jacobian metric
    let crestFoam = smoothstep(0.4, 0.7, i.original_uv.x) * foamPattern * 0.9;
    let foamMaskFinal = max(foamMask, crestFoam);

    finalColor = mix(finalColor, foamColor, foamMaskFinal);

    // Ground-projected caustics: anchors caustic cells to the underwater pool tiles / seabed
    let rayDir = normalize(i.wp - global.viewPos.xyz);
    let groundWorldPos = i.wp + rayDir * depthDiff;
    let causticsUv1 = (groundWorldPos.xz + i.n.xz * 0.25) * foamNoiseScale * 0.75 + vec2<f32>(obj.time * foamNoiseSpeed * 0.35, obj.time * foamNoiseSpeed * 0.2);
    let causticsUv2 = (groundWorldPos.xz - i.n.xz * 0.2) * foamNoiseScale * 1.05 - vec2<f32>(obj.time * foamNoiseSpeed * 0.25, obj.time * foamNoiseSpeed * 0.4);
    let caustics1 = 1.0 - waterCellNoise(causticsUv1);
    let caustics2 = 1.0 - waterCellNoise(causticsUv2);
    let causticsValue = pow(caustics1 * caustics2, 1.6) * 3.2;
    let causticsFade = exp(-depthDiff * 0.35) * smoothstep(0.02, 0.2, depthDiff);
    let causticsLight = vec3<f32>(1.0, 0.98, 0.88) * causticsValue * causticsFade * 0.4;
    finalColor += causticsLight;

    finalColor *= global.exposure;
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}
