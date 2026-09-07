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

// Muted thin-film interference (soap-film/oil-on-water colour shift): a restrained, mostly
// desaturated sheen rather than a full saturated rainbow.
fn thinFilm(cosTheta: f32, thickness: f32, strength: f32) -> vec3f {
    let opd = thickness * 4.0 * cosTheta;
    let r = 0.5 + 0.5 * sin(opd * 8.0);
    let g = 0.5 + 0.5 * sin(opd * 8.5 + 1.0);
    let b = 0.5 + 0.5 * sin(opd * 9.0 + 2.0);
    let rawIridescence = vec3f(r, g, b);
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
    let radialFactor = clamp(distFromCenter / max(radius, 0.001), 0.0, 1.0);
    let baseColor = mix(coreColor, edgeColor, smoothstep(0.1, 0.95, radialFactor) * rimDarkening);

    // Subtle thin-film shimmer
    let swirl = noise(i.wp.xz * 4.0 + time * 0.02);
    let thickness = 0.5 + swirl * 0.5;
    let iridescence = thinFilm(NdotV, thickness, iridescenceStrength);
    let fresnel = pow(1.0 - NdotV, 4.0);
    let colorWithSheen = mix(baseColor, iridescence, fresnel * iridescenceStrength);

    // 4. Localised warm glow pooling near the drip point under the barrel
    let glowDist = distance(i.uv, highlightPoint);
    let glow = highlightIntensity * exp(-(glowDist * glowDist) / (highlightRadius * highlightRadius));

    let tint = sRGBToLinear(obj.specColor.rgb);
    let litOilColor = colorWithSheen * fL + spec * tint + tint * glow;

    // 5. Outer Ink Outline blending (stylized comic / Noir outline outside the liquid body)
    let inkOutlineColor = sRGBToLinear(vec3f(0.008, 0.006, 0.005));
    let finalRgbLinear = mix(inkOutlineColor, litOilColor, innerOilMask);

    var litColor = finalRgbLinear * global.exposure;
    litColor = linearToSRGB(litColor);

    // Composite alpha: full viscous opacity for oil body, outlineAlpha for the outer contour
    let finalAlpha = mix(outerAlphaMask * outlineAlpha, innerOilMask * obj.color.a, innerOilMask);

    return vec4f(litColor, finalAlpha);
}
