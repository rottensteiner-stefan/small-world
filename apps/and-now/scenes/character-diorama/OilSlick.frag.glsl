[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]

// Free vec4 slots on StandardWebGPULayout, not covered by BASE_FRAGMENT_HEADER:
// u_liquidParams: [highlightRadius, highlightIntensity, splatterBaseRadius, splatterNoiseAmp]
// u_thresholds:   [outlineWidth, outlineAlpha, meniscusStrength, rimDarkening]
uniform vec4 u_liquidParams;
uniform vec4 u_thresholds;
uniform float u_isTerrain; // repurposed: floorVisibility (see OilSlickMaterial.ts)
// u_pad1-3/u_reflectivity repurposed: analytic environment reflection tint + strength (no real
// cubemap in this scene -- see .agents/notes/oil-shader-roadmap.md Phase 2).
uniform float u_pad1;
uniform float u_pad2;
uniform float u_pad3;
uniform float u_reflectivity;
// Live-captured opaque colour buffer (see LiquidWaveMaterial/OpenWaterMaterial, which pioneered
// this pattern) -- gives the puddle's thin rim a real view of the actual floor beneath it.
uniform sampler2D u_opaqueMap;

// Pseudo-random hash + value noise, used for both the puddle's fixed organic edge shape and the
// slow thin-film thickness variation across its surface.
float hash(vec2 p) {
    vec2 q = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(q.x) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
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
vec3 thinFilm(float cosTheta1, float thicknessNorm, float strength) {
    const float iridescenceIor = 1.3;
    const float filmF0 = 0.0169; // ((1.3-1)/(1.3+1))^2 -- air->film Fresnel at normal incidence
    const float baseF0 = 0.0204; // oil/water Fresnel (IOR 1.333) -- film->base reflectance
    const float thicknessMinNm = 100.0;
    const float thicknessMaxNm = 400.0;

    float sinTheta1Sq = 1.0 - cosTheta1 * cosTheta1;
    float sinTheta2Sq = sinTheta1Sq / (iridescenceIor * iridescenceIor); // Snell's law
    float cosTheta2 = sqrt(max(1.0 - sinTheta2Sq, 0.0));

    float r1 = filmF0 + (1.0 - filmF0) * pow(1.0 - cosTheta1, 5.0);
    float r2 = baseF0 + (1.0 - baseF0) * pow(1.0 - cosTheta2, 5.0);
    float crossTerm = 2.0 * sqrt(max(r1 * r2, 0.0));

    float thicknessNm = mix(thicknessMinNm, thicknessMaxNm, clamp(thicknessNorm, 0.0, 1.0));
    float opd = 2.0 * iridescenceIor * thicknessNm * cosTheta2;

    vec3 wavelengthsNm = vec3(650.0, 550.0, 450.0); // approximate R, G, B visible-light peaks
    vec3 phase = (6.28318530718 / wavelengthsNm) * opd;
    vec3 rawIridescence = clamp(vec3(r1 + r2) + crossTerm * cos(phase), 0.0, 1.0);

    float luminance = dot(rawIridescence, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), rawIridescence, strength);
}

void main() {
    float time = u_extraParams.x;
    float iridescenceStrength = u_extraParams.y;
    vec2 highlightPoint = u_extraParams.zw;
    float highlightRadius = max(u_liquidParams.x, 0.001);
    float highlightIntensity = u_liquidParams.y;
    float splatterBaseRadius = u_liquidParams.z;
    float splatterNoiseAmp = u_liquidParams.w;

    float outlineWidth = max(u_thresholds.x, 0.0);
    float outlineAlpha = u_thresholds.y > 0.0 ? u_thresholds.y : 0.85;
    float meniscusStrength = u_thresholds.z > 0.0 ? u_thresholds.z : 0.65;
    float rimDarkening = u_thresholds.w > 0.0 ? u_thresholds.w : 0.95;
    float floorVisibility = clamp(u_isTerrain, 0.0, 1.0);

    // 1. Organic splatter mask & 2-stage ink outline (inner oil pool + outer graphic novel contour)
    vec2 localUV = v_uv - vec2(0.5);
    float distFromCenter = length(localUV);
    float angle = atan(localUV.y, localUV.x);
    vec2 noiseCoord = vec2(cos(angle), sin(angle)) * 3.0;
    float edgeNoise = noise(noiseCoord);
    float radius = splatterBaseRadius + edgeNoise * splatterNoiseAmp;
    float outerRadius = radius + outlineWidth;

    // Discard outside the outermost ink contour
    float outerAlphaMask = smoothstep(outerRadius + 0.01, outerRadius - 0.01, distFromCenter);
    if (outerAlphaMask < 0.05) {
        discard;
    }

    // Inner oil body mask: 1.0 inside oil pool, 0.0 in the outer outline ring
    float innerOilMask = smoothstep(radius + 0.01, radius - 0.01, distFromCenter);

    // 2. Synthetic meniscus normal perturbation (procedural edge curvature catching specular light)
    vec3 N = normalize(v_normal);
    float edgeDist = radius - distFromCenter;
    float meniscusBand = max(splatterBaseRadius * 0.35, 0.02);
    if (edgeDist > -0.02 && edgeDist < meniscusBand) {
        float edgeFactor = 1.0 - clamp(edgeDist / meniscusBand, 0.0, 1.0);
        vec2 outwardDir = distFromCenter > 0.0001 ? normalize(localUV) : vec2(0.0);
        // Perturb normal outwards along the puddle plane (v_normal is up in tangent/world)
        N.xz += outwardDir * edgeFactor * meniscusStrength;
        N = normalize(N);
    }

    [LIGHT_CALC]

    vec3 viewDir = normalize(u_viewPos - v_worldPos);
    float NdotV = max(dot(N, viewDir), 0.0);

    // 3. Base colour gradient: warm amber-brown core -> deep noir tar-black edge
    vec3 coreColor = sRGBToLinear(u_color.rgb);
    vec3 edgeColor = sRGBToLinear(vec3(0.012, 0.009, 0.007)); // Noir deep tar black

    // Grounded rim: sample the real floor colour beneath the puddle (captured just before this
    // transparent pass, see WebGL2Renderer.copyToOpaqueTexture) and tint it dark by the oil, so
    // the thin rim reads as translucent film over actual pavement instead of a flat painted ring.
    vec2 screenUv = gl_FragCoord.xy / vec2(textureSize(u_opaqueMap, 0));
    vec3 groundColor = sRGBToLinear(texture(u_opaqueMap, screenUv).rgb);
    // Tint by edgeColor's hue only (normalized to its brightest channel), not its raw magnitude --
    // edgeColor itself is a near-black tar constant, so multiplying by it directly would crush the
    // real floor brightness to near-zero regardless of floorVisibility (caught via live pixel-diff
    // verification, see .agents/notes/oil-shader-roadmap.md Phase 1).
    vec3 edgeHue = edgeColor / max(max(edgeColor.r, max(edgeColor.g, edgeColor.b)), 0.0001);
    vec3 groundTinted = groundColor * mix(vec3(1.0), edgeHue, 0.7);

    float radialFactor = clamp(distFromCenter / max(radius, 0.001), 0.0, 1.0);
    vec3 baseColor = mix(coreColor, edgeColor, smoothstep(0.1, 0.95, radialFactor) * rimDarkening);

    // Subtle thin-film shimmer: two independently-scrolling noise layers (opposite directions/
    // speeds, per oil.md's Godot reference) combined into the thickness variation, giving the
    // shimmer a wandering "wave" structure instead of a single static-frequency drift. Colour-only
    // -- deliberately no normal/geometry perturbation, see class doc ("thick, settled pool that
    // never moves"); see .agents/notes/oil-shader-roadmap.md Phase 3.
    vec2 waveUvA = v_worldPos.xz * 4.0 + time * vec2(0.02, 0.015);
    vec2 waveUvB = v_worldPos.xz * 5.5 - time * vec2(0.015, 0.025);
    float swirl = noise(waveUvA) * 0.5 + noise(waveUvB) * 0.5;
    float thickness = 0.5 + swirl * 0.5;
    vec3 iridescence = thinFilm(NdotV, thickness, iridescenceStrength);
    float fresnel = pow(1.0 - NdotV, 4.0);
    vec3 colorWithSheen = mix(baseColor, iridescence, fresnel * iridescenceStrength);

    // 4. Localised warm glow pooling near the drip point under the barrel
    float glowDist = distance(v_uv, highlightPoint);
    float glow = highlightIntensity * exp(-(glowDist * glowDist) / (highlightRadius * highlightRadius));

    vec3 tint = sRGBToLinear(u_specColor.rgb);

    // Analytic environment reflection: no real cubemap probe in this scene, so the "reflected
    // surroundings" are approximated as a constant, dim ambient tone weighted by Schlick Fresnel.
    // F0 = 0.0204 is the Khronos KHR_materials_ior value for IOR=1.333 (oil/water), see
    // .agents/notes/oil-shader-roadmap.md Phase 2.
    const float envF0 = 0.0204;
    float envFresnel = envF0 + (1.0 - envF0) * pow(1.0 - NdotV, 5.0);
    vec3 envReflection = sRGBToLinear(vec3(u_pad1, u_pad2, u_pad3)) * envFresnel * u_reflectivity;

    vec3 litOilColor = colorWithSheen * finalLight + specular * tint + tint * glow + envReflection;

    // Grounded rim overlay: blend in the real floor colour AFTER lighting, not before -- the
    // captured u_opaqueMap sample is already fully shaded by the main opaque pass (it's the floor's
    // final on-screen colour), so folding it into baseColor above and then multiplying by this
    // material's own finalLight double-darkened it to near-invisibility in dim scene lighting (a
    // real bug caught via live pixel-diff verification, see .agents/notes/oil-shader-roadmap.md
    // Phase 1). A thin oil film simply darkens/tints what's beneath it; it doesn't need its own
    // re-lit floor.
    float rimBlend = smoothstep(0.1, 0.95, radialFactor) * floorVisibility;
    litOilColor = mix(litOilColor, groundTinted, rimBlend);

    // 5. Outer Ink Outline blending (stylized comic / Noir outline outside the liquid body)
    vec3 inkOutlineColor = sRGBToLinear(vec3(0.008, 0.006, 0.005));
    vec3 finalRgb = mix(inkOutlineColor, litOilColor, innerOilMask);

    finalRgb *= u_exposure;
    finalRgb = linearToSRGB(finalRgb);

    // Composite alpha: full viscous opacity for oil body, outlineAlpha for the outer contour
    float finalAlpha = mix(outerAlphaMask * outlineAlpha, innerOilMask * u_color.a, innerOilMask);

    fragColor = vec4(finalRgb, finalAlpha);
}
