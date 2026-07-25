@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let time = obj.extraParams.y;
    let flowSpeed = obj.extraParams.z;
    let noiseScale = obj.extraParams.w;

    // Use world position XZ for seamless tiling
    let worldUV = i.wp.xz * 0.5; 
    let uv = worldUV * noiseScale;
    let uv1 = uv + vec2<f32>(time * 0.05, time * 0.02) * flowSpeed;
    let uv2 = uv + vec2<f32>(-time * 0.03, time * 0.04) * flowSpeed;

    let tex1 = textureSample(u_diffuseMap, s, uv1).rgb;
    let tex2 = textureSample(u_diffuseMap, s, uv2).rgb;
    let n1 = dot(tex1, vec3<f32>(0.299, 0.587, 0.114));
    let n2 = dot(tex2, vec3<f32>(0.299, 0.587, 0.114));
    let noise = (n1 + n2) * 0.5;

    let baseColor = sRGBToLinear(obj.color.rgb) * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    let edgeCol = sRGBToLinear(obj.specColor.rgb); 

    // Depth Fade
    let fragPosCoords = vec2<i32>(i.pos.xy);
    let bgDepth = textureLoad(u_opaqueDepthMap, fragPosCoords, 0);
    
    let near = global.cameraNearFar.x;
    let far = global.cameraNearFar.y;
    
    let ndcBg = bgDepth * 2.0 - 1.0;
    let linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));
    
    let ndcFrag = i.pos.z * 2.0 - 1.0;
    let linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));
    
    let depthDiff = linBgDepth - linFragDepth;
    
    let edgeBlend = 1.0 - saturate(depthDiff / 1.0); // Softness of 1.0 units
    let noiseBlend = smoothstep(0.6, 0.8, noise);
    let finalBlend = saturate(noiseBlend + edgeBlend);

    var finalColor = mix(baseColor, edgeCol, finalBlend);

    // Exposure
    finalColor *= global.exposure;

    // Gamma correction
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}