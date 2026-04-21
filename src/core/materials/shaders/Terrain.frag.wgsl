@fragment fn fs(i: Out) -> @location(0) vec4f {
    let sand = textureSample(u_sandMap, s, i.uv);
    let grass = textureSample(u_grassMap, s, i.uv);
    let rock = textureSample(u_rockMap, s, i.uv);
    let snow = textureSample(u_snowMap, s, i.uv);

    let h = i.wp.y;
    var texCol: vec4f;

    if (h < obj.thresholds.x) {
        texCol = sand;
    } else if (h < obj.thresholds.y) {
        let t = (h - obj.thresholds.x) / (obj.thresholds.y - obj.thresholds.x);
        texCol = mix(sand, grass, t);
    } else if (h < obj.thresholds.z) {
        let t = (h - obj.thresholds.y) / (obj.thresholds.z - obj.thresholds.y);
        texCol = mix(grass, rock, t);
    } else if (h < obj.thresholds.w) {
        let t = (h - obj.thresholds.z) / (obj.thresholds.w - obj.thresholds.z);
        texCol = mix(rock, snow, t);
    } else {
        texCol = snow;
    }

    // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
    [WGSL_LIGHTING]

    let diffuseColor = texCol.rgb * obj.color.rgb;
    let finalColor = fL * diffuseColor;

    return vec4f(finalColor, obj.color.a);
}