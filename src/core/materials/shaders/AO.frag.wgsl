@group(0) @binding(0) var depthMap: texture_depth_2d;

struct AOUniforms {
    near: f32,
    far: f32,
    projScaleX: f32,
    projScaleY: f32,
    radius: f32,
    intensity: f32,
    pad0: f32,
    pad1: f32,
}
@group(0) @binding(1) var<uniform> u: AOUniforms;

// See AO.frag.glsl for the full algorithm rationale -- same simplified HBAO approach, adapted
// to WGSL's texel-fetch-only depth read (no sampler needed for a plain `texture_depth_2d`).
fn linearizeDepth(d: f32) -> f32 {
    let z = d * 2.0 - 1.0;
    return (2.0 * u.near * u.far) / (u.far + u.near - z * (u.far - u.near));
}

fn reconstructViewPos(uv: vec2f, linearZ: f32) -> vec3f {
    let ndc = uv * 2.0 - 1.0;
    return vec3f(ndc.x * linearZ / u.projScaleX, ndc.y * linearZ / u.projScaleY, -linearZ);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let dims = vec2i(textureDimensions(depthMap));
    let maxCoord = dims - vec2i(1, 1);
    let centerCoord = clamp(vec2i(uv * vec2f(dims)), vec2i(0, 0), maxCoord);

    let depth = textureLoad(depthMap, centerCoord, 0);
    if (depth >= 1.0) {
        return vec4f(1.0, 0.0, 0.0, 1.0);
    }

    let linearZ = linearizeDepth(depth);
    let viewPos = reconstructViewPos(uv, linearZ);

    let texelSize = vec2f(1.0) / vec2f(dims);
    let dPosDx = reconstructViewPos(uv + vec2f(texelSize.x, 0.0), linearZ) - viewPos;
    let dPosDy = reconstructViewPos(uv + vec2f(0.0, texelSize.y), linearZ) - viewPos;
    var normal = normalize(cross(dPosDx, dPosDy));
    if (normal.z > 0.0) {
        normal = -normal;
    }

    let dirs = array<vec2f, 6>(
        vec2f(1.0, 0.0), vec2f(0.5, 0.866025), vec2f(-0.5, 0.866025),
        vec2f(-1.0, 0.0), vec2f(-0.5, -0.866025), vec2f(0.5, -0.866025),
    );

    var occlusion = 0.0;
    for (var d = 0; d < 6; d++) {
        var maxHorizonSin = 0.0;
        for (var s = 1; s <= 4; s++) {
            let sampleCoord = centerCoord + vec2i(dirs[d] * f32(s) * 4.0);
            if (sampleCoord.x < 0 || sampleCoord.x > maxCoord.x || sampleCoord.y < 0 || sampleCoord.y > maxCoord.y) {
                continue;
            }

            let sDepth = textureLoad(depthMap, sampleCoord, 0);
            if (sDepth >= 1.0) {
                continue;
            }

            let sUv = (vec2f(sampleCoord) + vec2f(0.5)) / vec2f(dims);
            let sLinearZ = linearizeDepth(sDepth);
            let sViewPos = reconstructViewPos(sUv, sLinearZ);

            let toSample = sViewPos - viewPos;
            let dist = length(toSample);
            if (dist > u.radius || dist < 0.0001) {
                continue;
            }

            let horizonSin = dot(toSample / dist, normal);
            maxHorizonSin = max(maxHorizonSin, horizonSin);
        }
        occlusion += clamp(maxHorizonSin, 0.0, 1.0);
    }
    occlusion /= 6.0;

    let ao = clamp(1.0 - occlusion * u.intensity, 0.0, 1.0);
    return vec4f(ao, 0.0, 0.0, 1.0);
}
