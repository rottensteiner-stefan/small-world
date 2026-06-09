// WGSL PBR Lighting calculation (Logic only)

let V = normalize(global.viewPos.xyz - i.wp);
let TBN = mat3x3f(normalize(i.t), normalize(i.b), normalize(i.n));
let N = normalize(TBN * (textureSample(u_normalMap, s, i.uv).rgb * 2.0 - 1.0));
let dotNV = max(dot(N, V), 0.0001);

var F0 = vec3f(0.04);
F0 = mix(F0, albedo, metallic);

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
    Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
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
    Lo += (kD * albedo / 3.14159265359 + specular) * radiance * dotNL;
}

let ambient = global.ambientColor.rgb * albedo * ao;
var color = ambient + Lo;

// Emissive
let emissive = sRGBToLinear(textureSample(u_emissiveMap, s, i.uv).rgb) * sRGBToLinear(obj.specColor.rgb) * obj.specColor.a;
color += emissive;

// Exposure
color *= global.exposure;

// Tone Mapping
color = color / (color + vec3f(1.0));

// Gamma Correction
color = linearToSRGB(color);
