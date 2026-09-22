@vertex fn vs(
    @location(0) pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f,
    @location(4) joints: vec4f,
    @location(5) weights: vec4f
) -> Out {
    var o: Out;
    
    var localPos = vec4f(pos, 1.0);
    var localNormal = normal;
    var localTangent = tangent;
    
    if (obj.isSkinned > 0.5) {
        let bOffset = u32(obj.boneOffset);
        let b0 = boneMatrices[bOffset + u32(joints.x)];
        let b1 = boneMatrices[bOffset + u32(joints.y)];
        let b2 = boneMatrices[bOffset + u32(joints.z)];
        let b3 = boneMatrices[bOffset + u32(joints.w)];
        
        let skinMat = weights.x * b0 + weights.y * b1 + weights.z * b2 + weights.w * b3;
        localPos = skinMat * vec4f(pos, 1.0);
        let skinMat3 = mat3x3f(skinMat[0].xyz, skinMat[1].xyz, skinMat[2].xyz);
        localNormal = skinMat3 * normal;
        localTangent = skinMat3 * tangent;
    }
    
    let worldPos = obj.model * localPos;
    o.wp = worldPos.xyz;
    o.pos = view.vp * worldPos;
    o.uv = uv * obj.texRepeat + obj.texOffset;
    o.original_uv = uv;
    
    // Improved Normal Matrix (handling scaling correctly)
    let m33 = mat3x3f(obj.model[0].xyz, obj.model[1].xyz, obj.model[2].xyz);
    
    // Normalize normals after transformation to world space with robust fallbacks
    let worldN = m33 * localNormal;
    if (length(worldN) > 0.0001) {
        o.n = normalize(worldN);
    } else {
        o.n = vec3f(0.0, 1.0, 0.0);
    }
    
    let worldT = m33 * localTangent;
    if (length(worldT) > 0.0001) {
        o.t = normalize(worldT);
    } else {
        let up = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(o.n.y) > 0.999);
        o.t = normalize(cross(up, o.n));
    }
    
    let worldB = cross(o.n, o.t);
    if (length(worldB) > 0.0001) {
        o.b = normalize(worldB);
    } else {
        let up = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(o.n.y) > 0.999);
        o.b = normalize(cross(o.n, up));
    }
    
    return o;
}
