struct VertexIn {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

@vertex fn vs(in: VertexIn) -> Out {
    var o: Out;
    o.uv = in.uv;
    var p = in.position;
    let time = obj.extraParams.y;
    let flowSpeed = obj.extraParams.z;
    let waveFreq = obj.liquidParams.x;
    let waveAmp = obj.liquidParams.y;
    
    let displacementSpeed = time * flowSpeed * 0.5;
    let wave = sin(p.x * waveFreq + displacementSpeed) * cos(p.z * waveFreq + displacementSpeed) * waveAmp;
    
    p.y += wave;

    let worldPos = obj.model * vec4<f32>(p, 1.0);
    o.wp = worldPos.xyz;
    o.pos = global.vp * worldPos;
    return o;
}

@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let time = obj.extraParams.y;
    let flowSpeed = obj.extraParams.z;
    let noiseScale = obj.extraParams.w;

    let uv = i.uv * noiseScale;
    let uv1 = uv + vec2<f32>(time * 0.05, time * 0.02) * flowSpeed;
    let uv2 = uv + vec2<f32>(-time * 0.03, time * 0.04) * flowSpeed;

    let tex1 = textureSample(u_diffuseMap, s, uv1).rgb;
    let tex2 = textureSample(u_diffuseMap, s, uv2).rgb;
    let n1 = dot(tex1, vec3<f32>(0.299, 0.587, 0.114));
    let n2 = dot(tex2, vec3<f32>(0.299, 0.587, 0.114));
    let noise = (n1 + n2) * 0.5;

    let blend = smoothstep(0.6, 0.8, noise);
    let glow = obj.color.rgb * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    let crust = obj.specColor.rgb; 
    let finalColor = mix(glow, crust, blend);

    return vec4<f32>(finalColor, 1.0);
}