@fragment fn fs(i: Out) -> @location(0) vec4f {
    let original_uv = i.uv / obj.texRepeat;
    
    // IOR, Thickness, Transmission from liquidParams
    let ior = obj.liquidParams.x;
    let thickness = obj.liquidParams.y;
    let transmission = obj.liquidParams.z;
    
    let tintColor = sRGBToLinear(obj.color.rgb);
    let metallic = obj.metallic;
    let roughness = clamp(obj.roughness, 0.05, 1.0);
    let ao = obj.extraParams.x;
    
    let V = normalize(global.viewPos.xyz - i.wp);
    let TBN = mat3x3f(normalize(i.t), normalize(i.b), normalize(i.n));
    var rawNormal = textureSample(u_normalMap, s, i.uv).rgb * 2.0 - 1.0;
    rawNormal.x *= obj.extraParams.z;
    rawNormal.y *= obj.extraParams.w;
    let N = normalize(TBN * rawNormal);
    let dotNV = max(dot(N, V), 0.0001);

    var F0 = vec3f(0.04);
    F0 = mix(F0, tintColor, metallic);

    var Lo = vec3f(0.0);

    // Directional Light
    {
        let L = normalize(global.dirLightDir.xyz);
        let H = normalize(V + L);
        let dotNL = max(dot(N, L), 0.0);
        let dotNH = max(dot(N, H), 0.0);
        let dotVH = max(dot(V, H), 0.0);
        let radiance = global.dirLightColor.xyz;

        let D = D_GGX(dotNH, roughness);
        let G = G_SchlickGGX(dotNL, dotNV, roughness);
        let F = F_Schlick(dotVH, F0);

        let kS = F;
        let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
        let specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
        Lo += (kD * tintColor / 3.14159265359 + specular) * radiance * dotNL;
    }

    // Point Lights
    for(var j=0u; j<u32(global.numPointLights); j++) {
        let lightVec = pLights[j].pos.xyz - i.wp;
        let dist = length(lightVec);
        let L = lightVec / dist;
        let H = normalize(V + L);
        let attenuation = 1.0 / (dist * dist + 0.0001);
        let radiance = pLights[j].col.xyz * attenuation;

        let dotNL = max(dot(N, L), 0.0);
        let dotNH = max(dot(N, H), 0.0);
        let dotVH = max(dot(V, H), 0.0);

        let D = D_GGX(dotNH, roughness);
        let G = G_SchlickGGX(dotNL, dotNV, roughness);
        let F = F_Schlick(dotVH, F0);

        let kS = F;
        let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
        let specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
        Lo += (kD * tintColor / 3.14159265359 + specular) * radiance * dotNL;
    }

    // Spot Lights
    for(var k=0u; k<u32(global.numSpotLights); k++) {
        let lightVec = sLights[k].pos.xyz - i.wp;
        let dist = length(lightVec);
        let L = lightVec / dist;
        let H = normalize(V + L);
        
        let theta = dot(-L, normalize(sLights[k].dir.xyz));
        let epsilon = sLights[k].params.x - sLights[k].params.y;
        let spotIntensity = clamp((theta - sLights[k].params.y) / epsilon, 0.0, 1.0);
        
        let attenuation = 1.0 / (dist * dist + 0.0001);
        let radiance = sLights[k].col.xyz * attenuation * spotIntensity;

        let dotNL = max(dot(N, L), 0.0);
        let dotNH = max(dot(N, H), 0.0);
        let dotVH = max(dot(V, H), 0.0);

        let D = D_GGX(dotNH, roughness);
        let G = G_SchlickGGX(dotNL, dotNV, roughness);
        let F = F_Schlick(dotVH, F0);

        let kS = F;
        let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
        let specular = (D * G * F) / (4.0 * dotNV * dotNL + 0.0001);
        Lo += (kD * tintColor / 3.14159265359 + specular) * radiance * dotNL;
    }
    
    // --- Screen Space Refraction ---
    let screenPos = i.pos.xy; 
    let screenRes = vec2f(textureDimensions(u_opaqueMap));
    var screenUv = screenPos / screenRes;
    
    // Simple refraction offset based on normal
    let refrDir = refract(-V, N, 1.0 / ior);
    
    // Distort UV
    screenUv = screenUv + refrDir.xy * thickness * 0.05;
    screenUv = clamp(screenUv, vec2f(0.001), vec2f(0.999));
    
    // Sample opaque map
    let refractedColor = sRGBToLinear(textureSample(u_opaqueMap, s, screenUv).rgb);
    
    // Apply tint (Beer's Law approximation)
    let transmittance = exp(-((vec3f(1.0) - tintColor) * thickness * 3.0));
    
    let finalRefraction = refractedColor * transmittance * transmission;
    
    // Ambient Light
    let ambient = global.ambientColor.rgb * tintColor * ao;
    
    // Energy Conservation for Refraction
    let F_refr = F_Schlick(dotNV, F0);
    let kD_refr = (vec3f(1.0) - F_refr) * (1.0 - metallic);
    
    var color = ambient + Lo + finalRefraction * kD_refr;
    
    // Exposure & Tone Mapping
    color *= global.exposure;
    color = color / (color + vec3f(1.0));
    
    // Gamma Correction
    color = linearToSRGB(color);
    
    [WGSL_FOG_CALC]
    
    return vec4f(color, 1.0);
}
