@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let waterColor = sRGBToLinear(obj.color.rgb);
    let deepWaterColor = sRGBToLinear(obj.specColor.rgb);

    let edgeColor = vec3<f32>(obj.texOffset.x, obj.texOffset.y, obj.texRepeat.x);
    let edgeSoftness = max(obj.texRepeat.y, 0.001);

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
    let distortedUv = screenUv + i.n.xz * obj.shininess;
    let distortedCoords = vec2<i32>(distortedUv * screenRes);
    let distortedBgDepth = textureLoad(u_opaqueDepthMap, distortedCoords, 0);
    let ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    let linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    let refractionUv = select(screenUv, distortedUv, linDistortedBgDepth > linFragDepth);

    let refractedColor = sRGBToLinear(textureSample(u_opaqueMap, s, refractionUv).rgb);

    let depthBlend = saturate(depthDiff / 10.0);
    var baseColor = mix(refractedColor, deepWaterColor, depthBlend);

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

    finalColor *= global.exposure;
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}
