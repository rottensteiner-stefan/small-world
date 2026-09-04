// Cheap 2D hash for the foam cell noise below -- not a general-purpose PRNG, just enough
// decorrelation between neighboring cells to avoid an obviously repeating pattern.
fn waterHash(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

// Worley/cellular noise: distance from `p` to the nearest jittered point among the 3x3
// neighboring grid cells. Produces the blotchy, cell-like coverage foam needs -- unlike smooth
// Perlin-style noise, its edges are naturally sharp, which reads as foam clumps rather than a
// soft gradient.
fn waterCellNoise(p: vec2<f32>) -> f32 {
    let cell = floor(p);
    let localPos = fract(p);
    var minDistSq = 1.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let neighbor = vec2<f32>(f32(x), f32(y));
            let jitter = vec2<f32>(
                waterHash(cell + neighbor),
                waterHash(cell + neighbor + vec2<f32>(17.0, 31.0))
            );
            let diff = neighbor + jitter - localPos;
            minDistSq = min(minDistSq, dot(diff, diff));
        }
    }
    return sqrt(minDistSq);
}

@fragment fn fs(i: Out) -> @location(0) vec4<f32> {
    let waterColor = sRGBToLinear(obj.color.rgb);
    let deepWaterColor = sRGBToLinear(obj.specColor.rgb);

    let edgeColor = vec3<f32>(obj.texOffset.x, obj.texOffset.y, obj.texRepeat.x);
    let edgeSoftness = max(obj.texRepeat.y, 0.001);

    let fragPosCoords = vec2<i32>(i.pos.xy);
    let bgDepth = textureLoad(u_opaqueDepthMap, fragPosCoords, 0);

    let near = global.cameraNearFar.x;
    let far = global.cameraNearFar.y;

    let ndcBg = bgDepth * 2.0 - 1.0;
    let linBgDepth = (2.0 * near * far) / (far + near - ndcBg * (far - near));

    let ndcFrag = i.pos.z * 2.0 - 1.0;
    let linFragDepth = (2.0 * near * far) / (far + near - ndcFrag * (far - near));

    let depthDiff = max(linBgDepth - linFragDepth, 0.0);

    // Screen-space refraction: distort the sample point by the wave normal's horizontal
    // components (obj.shininess is repurposed as refractionStrength, see OpenWaterMaterial.ts).
    // If the distorted sample lands in front of the water surface, fall back to the undistorted
    // texel -- otherwise that pixel would show something that's not actually underwater.
    let screenRes = vec2<f32>(textureDimensions(u_opaqueDepthMap));
    let screenUv = i.pos.xy / screenRes;
    let distortedUv = screenUv + i.n.xz * obj.shininess;
    let distortedCoords = vec2<i32>(distortedUv * screenRes);
    let distortedBgDepth = textureLoad(u_opaqueDepthMap, distortedCoords, 0);
    let ndcDistortedBg = distortedBgDepth * 2.0 - 1.0;
    let linDistortedBgDepth = (2.0 * near * far) / (far + near - ndcDistortedBg * (far - near));
    let refractionUv = select(screenUv, distortedUv, linDistortedBgDepth > linFragDepth);

    let refractedColor = sRGBToLinear(textureSample(u_opaqueMap, s, refractionUv).rgb);

    // Beer-Lambert absorption: light traveling through `depthDiff` units of water loses each
    // color channel at its own exponential rate (waterAbsorption), rather than fading linearly
    // to a single flat color -- this is what gives real water its per-channel, non-linear color
    // falloff (e.g. red disappearing long before blue in deep water). obj.isSkinned/boneOffset/
    // pad1 are skeletal-animation-only fields, meaningless here -- repurposed to carry the 3
    // absorption channels (see OpenWaterMaterial.ts).
    let waterAbsorption = vec3<f32>(obj.isSkinned, obj.boneOffset, obj.pad1);
    let transmittance = exp(-depthDiff * waterAbsorption);
    let tintedSeabed = refractedColor * waterColor;
    var baseColor = mix(deepWaterColor, tintedSeabed, transmittance);

    let edgeBlend = 1.0 - saturate(depthDiff / edgeSoftness);

    let viewDir = normalize(global.viewPos.xyz - i.wp);
    let fresnel = pow(1.0 - saturate(dot(i.n, viewDir)), 5.0);
    let skyColor = vec3<f32>(0.6, 0.8, 1.0);
    baseColor = mix(baseColor, skyColor, fresnel * 0.5);

    let lightDir = normalize(global.dirLightDir.xyz);
    let halfVector = normalize(lightDir + viewDir);
    let nDotH = saturate(dot(i.n, halfVector));
    let specular = pow(nDotH, 100.0) * 1.5;
    baseColor += global.dirLightColor.rgb * specular;

    let edgeColLinear = sRGBToLinear(edgeColor);
    var finalColor = mix(baseColor, edgeColLinear, edgeBlend);

    // Procedural foam: a Worley-noise pattern drifting in world-space XZ, masked to the same
    // shoreline/intersection band as the edge blend above (real foam only collects where the
    // water actually meets something, not across the open surface). obj.isTerrain/metallic/
    // roughness/useEnvMap/useReflectionMap/pad2 are repurposed for foamColor.rgb + foamCutoff/
    // foamNoiseScale/foamNoiseSpeed (see OpenWaterMaterial.ts).
    let foamColor = sRGBToLinear(vec3<f32>(obj.isTerrain, obj.metallic, obj.roughness));
    let foamCutoff = obj.useEnvMap;
    let foamNoiseScale = obj.useReflectionMap;
    let foamNoiseSpeed = obj.pad2;
    let foamUv = i.wp.xz * foamNoiseScale + obj.time * foamNoiseSpeed;
    let foamCell = waterCellNoise(foamUv);
    let foamPattern = 1.0 - smoothstep(foamCutoff, foamCutoff + 0.15, foamCell);

    // Splash pulse: modulates intersection foam intensity over time instead of a static band, so
    // it reads as water repeatedly slapping the object rather than a painted-on ring. Traveling
    // in wave1's rough direction (baked in as a constant here, not a uniform -- re-deriving the
    // exact vertex-shader phase would mean duplicating its wave uniforms into the fragment stage).
    let splashPhase = dot(normalize(vec2<f32>(1.0, 0.4)), i.wp.xz) * 0.8 - obj.time * 1.6;
    let splashPulse = 0.6 + 0.4 * sin(splashPhase);
    let foamMask = foamPattern * edgeBlend * splashPulse;

    // Wave-crest foam (foam on open water at steep crests, independent of any solid
    // intersection) was attempted here via a normal.y threshold, but the per-vertex analytic
    // normal of overlapping Gerstner waves carries real high-frequency curvature noise that
    // threshold picks up as a busy, cracked-looking network instead of clean crest patches --
    // not a mesh-resolution artifact (tested at 2x subdivision, identical result). Parked until
    // there's a coarser way to estimate crest steepness than the raw vertex normal.

    finalColor = mix(finalColor, foamColor, foamMask);

    // Procedural caustics: a lighter second Worley-noise layer, projected using the water
    // surface's own world position rather than the true refracted seabed position (which would
    // need reconstructing world position from depth via new invView/invProjection uniforms --
    // renderer-wide infrastructure this material alone doesn't warrant). Close enough at the
    // shallow depths caustics are visible at anyway; fades out entirely in deep water.
    let causticsUv1 = i.wp.xz * foamNoiseScale * 0.5 + obj.time * foamNoiseSpeed * 0.3;
    let causticsUv2 = i.wp.xz * foamNoiseScale * 0.35 - obj.time * foamNoiseSpeed * 0.25;
    let caustics1 = 1.0 - waterCellNoise(causticsUv1);
    let caustics2 = 1.0 - waterCellNoise(causticsUv2);
    let causticsValue = caustics1 * caustics2;
    let causticsFade = 1.0 - smoothstep(0.0, 10.0, depthDiff);
    finalColor += causticsValue * causticsFade * 0.3;

    finalColor *= global.exposure;
    finalColor = linearToSRGB(finalColor);

    return vec4<f32>(finalColor, 1.0);
}
