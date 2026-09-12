@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    let specMap = textureSample(u_specularMap, s, i.uv).r;

    [WGSL_LIGHTING]

    let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(obj.color.rgb);
    // fL contains ambient + all diffuse components
    // spec contains all specular components
    var color = fL * albedo + spec * sRGBToLinear(obj.specColor.rgb) * specMap;

    // Apply exposure
    color *= global.exposure;

    // Apply gamma correction
    color = linearToSRGB(color);

    let finalAlpha = obj.color.a * texCol.a;
    if (finalAlpha < obj.extraParams.y) {
        discard;
    }
    [WGSL_FOG_CALC]
    return vec4f(color, finalAlpha);
}