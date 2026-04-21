@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    let specMap = textureSample(u_specularMap, s, i.uv).r;

    [WGSL_LIGHTING]

    let albedo = texCol.rgb * obj.color.rgb;
    // fL contains ambient + all diffuse components
    // spec contains all specular components
    let finalColor = fL * albedo + spec * obj.specColor.rgb * specMap;

    return vec4f(finalColor, obj.color.a * texCol.a);
}