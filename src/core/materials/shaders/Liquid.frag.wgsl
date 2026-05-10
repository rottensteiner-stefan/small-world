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

    let blend = smoothstep(0.6, 0.8, noise);
    let glow = sRGBToLinear(obj.color.rgb) * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    let crust = sRGBToLinear(obj.specColor.rgb); 
    var finalColor = mix(glow, crust, blend);

    // Exposure
    finalColor *= global.exposure;

    // Gamma correction
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}