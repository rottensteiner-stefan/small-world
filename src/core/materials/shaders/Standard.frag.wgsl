@fragment fn fs(i: Out) -> @location(0) vec4f {
    let albedo = sRGBToLinear(textureSample(u_diffuseMap, s, i.uv).rgb) * sRGBToLinear(obj.color.rgb);
    let metallic = obj.metallic * textureSample(u_metallicMap, s, i.uv).r;
    let roughness = clamp(obj.roughness * textureSample(u_roughnessMap, s, i.uv).r, 0.05, 1.0);
    let ao = obj.extraParams.x;
    [WGSL_PBR_LIGHTING]
    let finalAlpha = obj.color.a * textureSample(u_diffuseMap, s, i.uv).a;
    if (finalAlpha < obj.extraParams.y) {
        discard;
    }
    [WGSL_FOG_CALC]
    return vec4f(color, finalAlpha);
}