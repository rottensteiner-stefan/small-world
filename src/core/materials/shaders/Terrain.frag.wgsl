@fragment fn fs(i: Out) -> @location(0) vec4f {
    let sand = textureSample(u_sandMap, s, i.uv);
    let grass = textureSample(u_grassMap, s, i.uv);
    let rock = textureSample(u_rockMap, s, i.uv);
    let snow = textureSample(u_snowMap, s, i.uv);

    let h = i.wp.y;
    let t_sand_grass = clamp((h - obj.thresholds.x) / (obj.thresholds.y - obj.thresholds.x), 0.0, 1.0);
    let t_grass_rock = clamp((h - obj.thresholds.y) / (obj.thresholds.z - obj.thresholds.y), 0.0, 1.0);
    let t_rock_snow  = clamp((h - obj.thresholds.z) / (obj.thresholds.w - obj.thresholds.z), 0.0, 1.0);

    let c1 = mix(sand, grass, t_sand_grass);
    let c2 = mix(c1, rock, t_grass_rock);
    let texCol = mix(c2, snow, t_rock_snow);

    // Note: N is now defined inside WGSL_LIGHTING via normalize(i.n)
    [WGSL_LIGHTING]

    let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(obj.color.rgb);
    var finalColor = fL * albedo;

    // Exposure
    finalColor *= global.exposure;

    // Gamma correction
    finalColor = linearToSRGB(finalColor);

    return vec4f(finalColor, obj.color.a);
}