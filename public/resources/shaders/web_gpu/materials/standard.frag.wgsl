@fragment fn fs(i: Out) -> @location(0) vec4f {
    let albedo = textureSample(u_diffuseMap, s, i.uv).rgb * obj.color.rgb;
    let metallic = obj.metallic;
    let roughness = obj.roughness;
    let ao = obj.extraParams.x;
    let alphaTest = obj.extraParams.y;
    var finalAlpha = obj.color.a;

    // The diffuse alpha
    let diffuseAlpha = textureSample(u_diffuseMap, s, i.uv).a;
    finalAlpha = finalAlpha * diffuseAlpha;

    // The puddle alpha map (using original unscrolled UVs)
    let puddleAlpha = textureSample(u_alphaMap, s, i.original_uv).r;
    finalAlpha = finalAlpha * puddleAlpha;

    if (finalAlpha < alphaTest) {
        discard;
    }

    [WGSL_PBR_LIGHTING]
    return vec4f(color, finalAlpha);
}
