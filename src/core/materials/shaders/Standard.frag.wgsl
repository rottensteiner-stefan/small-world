@fragment fn fs(i: Out) -> @location(0) vec4f {
    // original_uv must map the vertex UV (0-1) which was multiplied by obj.texRepeat.
    // So we just divide i.uv by obj.texRepeat to get back to 0-1, ignoring offset since puddle shouldn't scroll.
    let original_uv = i.uv / obj.texRepeat;

    let diffuseTex = textureSample(u_diffuseMap, s, i.uv);
    let albedo = sRGBToLinear(diffuseTex.rgb) * sRGBToLinear(obj.color.rgb);
    let metallic = obj.metallic * textureSample(u_metallicMap, s, i.uv).b;
    let roughness = clamp(obj.roughness * textureSample(u_roughnessMap, s, i.uv).g, 0.05, 1.0);
    let ao = obj.extraParams.x;
    [WGSL_PBR_LIGHTING]
    let finalAlpha = obj.color.a * diffuseTex.a * textureSample(u_alphaMap, s, original_uv).r;
    if (finalAlpha < obj.extraParams.y) {
        discard;
    }
    
    if (obj.useReflectionMap > 0.5) {
        let clipPos = global.vp * vec4f(i.wp, 1.0);
        let ndc = clipPos.xy / clipPos.w;
        let screenUV = vec2f(ndc.x * 0.5 + 0.5, ndc.y * -0.5 + 0.5); // WebGPU Y is down
        let reflectionColor = sRGBToLinear(textureSample(u_reflectionMap, s, screenUV).rgb);
        let V_dir = normalize(global.viewPos.xyz - i.wp);
        let dotNV_refl = max(dot(normalize(i.n), V_dir), 0.0);
        let F0_refl = mix(vec3f(0.04), albedo, metallic);
        let F_refl = F_Schlick(dotNV_refl, F0_refl).x;
        let f = obj.reflectivity * mix(1.0, F_refl, 0.5);
        color = mix(color, reflectionColor, f);
    }
    
    [WGSL_FOG_CALC]
    return vec4f(color, finalAlpha);
}