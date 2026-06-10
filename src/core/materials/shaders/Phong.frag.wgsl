@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    let specMap = textureSample(u_specularMap, s, i.uv).r;

    [WGSL_LIGHTING]

    let albedo = sRGBToLinear(texCol.rgb) * sRGBToLinear(obj.color.rgb);
    // fL contains ambient + all diffuse components
    // spec contains all specular components
    var finalColor = fL * albedo + spec * sRGBToLinear(obj.specColor.rgb) * specMap;

    // Apply exposure
    finalColor *= global.exposure;

    // Apply gamma correction
    finalColor = linearToSRGB(finalColor);

    let finalAlpha = obj.color.a * texCol.a;
    if (finalAlpha < obj.extraParams.y) {
        discard;
    }
    return vec4f(finalColor, finalAlpha);
}