fn hash(p: vec2f) -> f32 {
    let q = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
    return fract(sin(q.x) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let a = hash(i + vec2f(0.0, 0.0));
    let b = hash(i + vec2f(1.0, 0.0));
    let c = hash(i + vec2f(0.0, 1.0));
    let d = hash(i + vec2f(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Physically-motivated thin-film interference (KHR_materials_iridescence style): a simplified
// two-beam approximation -- real Fresnel reflectance at both interfaces (air->film, film->base)
// and a per-wavelength phase difference from the optical path length, combined via the classic
// thin-film interference formula I = R1 + R2 + 2*sqrt(R1*R2)*cos(phase). Not the full Belcour &
// Barla (2017) spectral/Airy-sum model the glTF extension itself uses, but a genuine physical
// calculation per RGB wavelength instead of arbitrary phase-shifted sines. iridescenceIor=1.3
// matches the extension's default; baseF0 reuses the Phase 2 oil/water Fresnel value (envF0 in
// this file) as the film->base reflectance. Muted via `strength` towards desaturated, same
// restrained-sheen intent as before. See .agents/notes/oil-shader-roadmap.md Abschnitt 6.3 and
// https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_iridescence
fn thinFilm(cosTheta1: f32, thicknessNorm: f32, strength: f32) -> vec3f {
    let iridescenceIor = 1.3;
    let filmF0 = 0.0169; // ((1.3-1)/(1.3+1))^2 -- air->film Fresnel at normal incidence
    let baseF0 = 0.0204; // oil/water Fresnel (IOR 1.333) -- film->base reflectance
    let thicknessMinNm = 100.0;
    let thicknessMaxNm = 400.0;

    let sinTheta1Sq = 1.0 - cosTheta1 * cosTheta1;
    let sinTheta2Sq = sinTheta1Sq / (iridescenceIor * iridescenceIor); // Snell's law
    let cosTheta2 = sqrt(max(1.0 - sinTheta2Sq, 0.0));

    let r1 = filmF0 + (1.0 - filmF0) * pow(1.0 - cosTheta1, 5.0);
    let r2 = baseF0 + (1.0 - baseF0) * pow(1.0 - cosTheta2, 5.0);
    let crossTerm = 2.0 * sqrt(max(r1 * r2, 0.0));

    let thicknessNm = mix(thicknessMinNm, thicknessMaxNm, clamp(thicknessNorm, 0.0, 1.0));
    let opd = 2.0 * iridescenceIor * thicknessNm * cosTheta2;

    let wavelengthsNm = vec3f(650.0, 550.0, 450.0); // approximate R, G, B visible-light peaks
    let phase = (6.28318530718 / wavelengthsNm) * opd;
    let rawIridescence = clamp(vec3f(r1 + r2) + crossTerm * cos(phase), vec3f(0.0), vec3f(1.0));

    let luminance = dot(rawIridescence, vec3f(0.299, 0.587, 0.114));
    return mix(vec3f(luminance), rawIridescence, strength);
}

@fragment fn fs(i: Out) -> @location(0) vec4f {
    let time = obj.extraParams.x;
    let iridescenceStrength = obj.extraParams.y;
    let highlightPoint = obj.extraParams.zw;
    let highlightRadius = max(obj.liquidParams.x, 0.001);
    let highlightIntensity = obj.liquidParams.y;
    let splatterBaseRadius = obj.liquidParams.z;
    let splatterNoiseAmp = obj.liquidParams.w;

    let outlineWidth = max(obj.thresholds.x, 0.0);
    let outlineAlpha = select(0.85, obj.thresholds.y, obj.thresholds.y > 0.0);
    let meniscusStrength = select(0.65, obj.thresholds.z, obj.thresholds.z > 0.0);
    let rimDarkening = select(0.95, obj.thresholds.w, obj.thresholds.w > 0.0);
    // obj.isTerrain is otherwise unused by this material -- repurposed to carry floorVisibility
    // (see OilSlickMaterial.ts).
    let floorVisibility = clamp(obj.isTerrain, 0.0, 1.0);

    // 1. Organic splatter mask & 2-stage ink outline (inner oil pool + outer graphic novel contour)
    let localUV = i.uv - vec2f(0.5);
    let distFromCenter = length(localUV);
    let angle = atan2(localUV.y, localUV.x);
    let noiseCoord = vec2f(cos(angle), sin(angle)) * 3.0;
    let edgeNoise = noise(noiseCoord);
    let radius = splatterBaseRadius + edgeNoise * splatterNoiseAmp;
    let outerRadius = radius + outlineWidth;

    // Discard outside the outermost ink contour
    let outerAlphaMask = smoothstep(outerRadius + 0.01, outerRadius - 0.01, distFromCenter);
    if (outerAlphaMask < 0.05) {
        discard;
    }

    // Inner oil body mask: 1.0 inside oil pool, 0.0 in the outer outline ring
    let innerOilMask = smoothstep(radius + 0.01, radius - 0.01, distFromCenter);

    // 2. Synthetic meniscus normal perturbation (procedural edge curvature catching specular light)
    var localNormal = normalize(i.n);
    let edgeDist = radius - distFromCenter;
    let meniscusBand = max(splatterBaseRadius * 0.35, 0.02);
    if (edgeDist > -0.02 && edgeDist < meniscusBand) {
        let edgeFactor = 1.0 - clamp(edgeDist / meniscusBand, 0.0, 1.0);
        let outwardDir = select(vec2f(0.0), normalize(localUV), distFromCenter > 0.0001);
        localNormal.x += outwardDir.x * edgeFactor * meniscusStrength;
        localNormal.z += outwardDir.y * edgeFactor * meniscusStrength;
        localNormal = normalize(localNormal);
    }

    // Evaluate lighting using perturbed normal in a scoped block
    var final_fL = vec3f(0.0);
    var final_spec = vec3f(0.0);
    {
        var i_perturbed = i;
        i_perturbed.n = localNormal;
        let i = i_perturbed;
        [WGSL_LIGHTING]
        final_fL = fL;
        final_spec = spec;
    }
    let fL = final_fL;
    let spec = final_spec;

    let viewDir = normalize(global.viewPos.xyz - i.wp);
    let nDir = localNormal;
    let NdotV = max(dot(nDir, viewDir), 0.0);

    // 3. Base colour gradient: warm amber-brown core -> deep noir tar-black edge
    let coreColor = sRGBToLinear(obj.color.rgb);
    let edgeColor = sRGBToLinear(vec3f(0.012, 0.009, 0.007)); // Noir deep tar black

    // Grounded rim: sample the real floor colour beneath the puddle (captured just before this
    // transparent pass, see WebGPURenderer's u_opaqueMap fallback) and tint it dark by the oil,
    // so the thin rim reads as translucent film over actual pavement instead of a flat ring.
    let groundScreenRes = vec2f(textureDimensions(u_opaqueMap));
    let groundScreenUv = i.pos.xy / groundScreenRes;
    let groundColor = sRGBToLinear(textureSample(u_opaqueMap, s, groundScreenUv).rgb);
    // Tint by edgeColor's hue only (normalized to its brightest channel), not its raw magnitude --
    // see OilSlick.frag.glsl's identical fix for why multiplying by edgeColor directly crushes
    // the real floor brightness to near-zero.
    let edgeHue = edgeColor / max(max(edgeColor.r, max(edgeColor.g, edgeColor.b)), 0.0001);
    let groundTinted = groundColor * mix(vec3f(1.0), edgeHue, 0.7);

    let radialFactor = clamp(distFromCenter / max(radius, 0.001), 0.0, 1.0);
    let baseColor = mix(coreColor, edgeColor, smoothstep(0.1, 0.95, radialFactor) * rimDarkening);

    // Subtle thin-film shimmer: two independently-scrolling noise layers (opposite directions/
    // speeds, per oil.md's Godot reference) combined into the thickness variation, giving the
    // shimmer a wandering "wave" structure instead of a single static-frequency drift. Colour-only
    // -- deliberately no normal/geometry perturbation, see class doc ("thick, settled pool that
    // never moves"); see .agents/notes/oil-shader-roadmap.md Phase 3.
    let waveUvA = i.wp.xz * 4.0 + time * vec2f(0.02, 0.015);
    let waveUvB = i.wp.xz * 5.5 - time * vec2f(0.015, 0.025);
    let swirl = noise(waveUvA) * 0.5 + noise(waveUvB) * 0.5;
    let thickness = 0.5 + swirl * 0.5;
    let iridescence = thinFilm(NdotV, thickness, iridescenceStrength);
    let fresnel = pow(1.0 - NdotV, 4.0);
    let colorWithSheen = mix(baseColor, iridescence, fresnel * iridescenceStrength);

    // 4. Localised warm glow pooling near the drip point under the barrel
    let glowDist = distance(i.uv, highlightPoint);
    let glow = highlightIntensity * exp(-(glowDist * glowDist) / (highlightRadius * highlightRadius));

    let tint = sRGBToLinear(obj.specColor.rgb);

    // Analytic environment reflection: no real cubemap probe in this scene, so the "reflected
    // surroundings" are approximated as a constant, dim ambient tone weighted by Schlick Fresnel.
    // F0 = 0.0204 is the Khronos KHR_materials_ior value for IOR=1.333 (oil/water), see
    // .agents/notes/oil-shader-roadmap.md Phase 2. obj.pad1-3/obj.reflectivity are reserved
    // StandardWebGPULayout filler fields, otherwise unused by this material -- repurposed here
    // the same way obj.isTerrain carries floorVisibility above.
    let envF0 = 0.0204;
    let envFresnel = envF0 + (1.0 - envF0) * pow(1.0 - NdotV, 5.0);
    let envReflection = sRGBToLinear(vec3f(obj.pad1, obj.pad2, obj.pad3)) * envFresnel * obj.reflectivity;

    var litOilColor = colorWithSheen * fL + spec * tint + tint * glow + envReflection;

    // Grounded rim overlay: blend in the real floor colour AFTER lighting -- see OilSlick.frag.glsl's
    // identical fix for why folding it into baseColor and re-lighting it double-darkens the rim.
    let rimBlend = smoothstep(0.1, 0.95, radialFactor) * floorVisibility;
    litOilColor = mix(litOilColor, groundTinted, rimBlend);

    // 5. Outer Ink Outline blending (stylized comic / Noir outline outside the liquid body)
    let inkOutlineColor = sRGBToLinear(vec3f(0.008, 0.006, 0.005));
    let finalRgbLinear = mix(inkOutlineColor, litOilColor, innerOilMask);

    var litColor = finalRgbLinear * global.exposure;
    litColor = linearToSRGB(litColor);

    // Composite alpha: full viscous opacity for oil body, outlineAlpha for the outer contour
    let finalAlpha = mix(outerAlphaMask * outlineAlpha, innerOilMask * obj.color.a, innerOilMask);

    return vec4f(litColor, finalAlpha);
}
