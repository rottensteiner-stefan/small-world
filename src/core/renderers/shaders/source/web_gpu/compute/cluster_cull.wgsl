// Clustered/tiled forward+ light culling compute shader.
// See docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md for the design rationale
// (fixed-capacity-per-cluster, no atomics; point/spot lights culled as bounding spheres).
//
// Expects `structs.wgsl` (GlobalUniforms, PointLight, SpotLight, and the pLights/sLights/
// pointClusterGrid/pointClusterIndices/spotClusterGrid/spotClusterIndices bindings) to already
// be present in the assembled shader module -- this file only adds the compute entry point.
//
// Per-light approach (not a view-space AABB): light positions in pLights/sLights are WORLD
// space, so each light's own screen-space (X/Y) and radial-distance (Z) coverage range is
// computed directly via the same `global.vp` projection and `length(viewPos - lightPos)` metric
// the fragment shader uses for its own cluster lookup -- no separate view matrix needed, and no
// world/view-space mismatch to get wrong. `projScale` over-estimates screen radius slightly
// rather than under-estimating (a light can be assigned to a few extra cells, never dropped).
fn lightCellRangeX(ndcX: f32, ndcRadius: f32) -> vec2f {
    let centerPx = (ndcX * 0.5 + 0.5) * global.resolution.x;
    let radiusPx = ndcRadius * 0.5 * global.resolution.x;
    return vec2f(centerPx - radiusPx, centerPx + radiusPx) / global.tileSizePx.x;
}

fn lightCellRangeY(ndcY: f32, ndcRadius: f32) -> vec2f {
    let centerPx = (ndcY * 0.5 + 0.5) * global.resolution.y;
    let radiusPx = ndcRadius * 0.5 * global.resolution.y;
    return vec2f(centerPx - radiusPx, centerPx + radiusPx) / global.tileSizePx.y;
}

fn zSliceRange(viewDist: f32, radius: f32) -> vec2f {
    let near = global.cameraNearFar.x;
    let far = global.cameraNearFar.y;
    let numSlices = global.clusterDims.z;
    let logRatio = log(far / near);
    let dMin = clamp(viewDist - radius, near, far);
    let dMax = clamp(viewDist + radius, near, far);
    let sliceMin = floor(log(dMin / near) * numSlices / logRatio);
    let sliceMax = floor(log(dMax / near) * numSlices / logRatio);
    return clamp(vec2f(sliceMin, sliceMax), vec2f(0.0), vec2f(numSlices - 1.0));
}

// Returns (cellMinX, cellMaxX, cellMinY, cellMaxY, zMinSlice, zMaxSlice) for a light's bounding
// sphere, fully covering the grid on an axis if the light center is behind the camera or the
// camera sits inside the sphere (clip.w <= 0 makes the NDC projection meaningless).
fn lightCoverage(worldPos: vec3f, radius: f32, dims: vec3u) -> array<vec2f, 3> {
    let viewDist = max(length(worldPos - global.viewPos.xyz), 0.0001);
    let clip = global.vp * vec4f(worldPos, 1.0);

    var rangeX = vec2f(0.0, f32(dims.x) - 1.0);
    var rangeY = vec2f(0.0, f32(dims.y) - 1.0);
    if (clip.w > 0.0001 && viewDist > radius) {
        let ndc = clip.xy / clip.w;
        let ndcRadius = vec2f(radius / viewDist) * global.projScale;
        rangeX = clamp(floor(lightCellRangeX(ndc.x, ndcRadius.x)), vec2f(0.0), vec2f(f32(dims.x) - 1.0));
        rangeY = clamp(floor(lightCellRangeY(ndc.y, ndcRadius.y)), vec2f(0.0), vec2f(f32(dims.y) - 1.0));
    }

    let rangeZ = zSliceRange(viewDist, radius);
    return array<vec2f, 3>(rangeX, rangeY, rangeZ);
}

@compute @workgroup_size(4, 4, 4)
fn cullLights(@builtin(global_invocation_id) gid: vec3u) {
    let dims = vec3u(u32(global.clusterDims.x), u32(global.clusterDims.y), u32(global.clusterDims.z));
    if (gid.x >= dims.x || gid.y >= dims.y || gid.z >= dims.z) {
        return;
    }

    let cellIndex = gid.x + dims.x * (gid.y + dims.y * gid.z);
    let maxPerCluster = u32(global.clusterDims.w);
    let pointOffset = cellIndex * maxPerCluster;
    let spotOffset = cellIndex * maxPerCluster;
    let cellF = vec3f(f32(gid.x), f32(gid.y), f32(gid.z));

    var pointCount = 0u;
    let numPointLights = u32(global.numPointLights);
    for (var i = 0u; i < numPointLights; i++) {
        if (pointCount >= maxPerCluster) {
            break;
        }
        let coverage = lightCoverage(pLights[i].pos.xyz, max(pLights[i].pos.w, 0.001), dims);
        if (cellF.x >= coverage[0].x && cellF.x <= coverage[0].y &&
            cellF.y >= coverage[1].x && cellF.y <= coverage[1].y &&
            cellF.z >= coverage[2].x && cellF.z <= coverage[2].y) {
            pointClusterIndices[pointOffset + pointCount] = i;
            pointCount++;
        }
    }
    pointClusterGrid[cellIndex] = vec2u(pointOffset, pointCount);

    var spotCount = 0u;
    let numSpotLights = u32(global.numSpotLights);
    for (var i = 0u; i < numSpotLights; i++) {
        if (spotCount >= maxPerCluster) {
            break;
        }
        let coverage = lightCoverage(sLights[i].pos.xyz, max(sLights[i].params.z, 0.001), dims);
        if (cellF.x >= coverage[0].x && cellF.x <= coverage[0].y &&
            cellF.y >= coverage[1].x && cellF.y <= coverage[1].y &&
            cellF.z >= coverage[2].x && cellF.z <= coverage[2].y) {
            spotClusterIndices[spotOffset + spotCount] = i;
            spotCount++;
        }
    }
    spotClusterGrid[cellIndex] = vec2u(spotOffset, spotCount);
}
