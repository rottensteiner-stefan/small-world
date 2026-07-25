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
    
    let depthBlend = saturate(depthDiff / 10.0);
    var baseColor = mix(waterColor, deepWaterColor, depthBlend);
    
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
