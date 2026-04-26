/// src/renderers/shaders/FluidRenderingWGSL.ts

export const FluidRenderingWGSL = `
struct GlobalUniforms {
  viewProjection: mat4x4<f32>,
  cameraPosition: vec4<f32>,
  invProjection: mat4x4<f32>,
  projection: mat4x4<f32>,
};

struct ObjectUniforms {
  modelMatrix: mat4x4<f32>,
  color: vec4<f32>,
  particleSize: f32,
};

@group(0) @binding(0) var<uniform> global: GlobalUniforms;
@group(1) @binding(0) var<uniform> obj: ObjectUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) viewPos: vec3<f32>,
};

// --- 1. Depth Pass Shader ---
@vertex
fn vs_depth(@location(0) pos: vec4<f32>) -> VertexOutput {
    var out: VertexOutput;
    let viewPos = global.viewProjection * obj.modelMatrix * vec4<f32>(pos.xyz, 1.0);
    out.position = viewPos;
    // Simple point to sphere logic would happen here or via point size
    return out;
}

// --- 2. Final Composite Shader ---
@group(0) @binding(1) var depthTex: texture_2d<f32>;
@group(0) @binding(2) var thicknessTex: texture_2d<f32>;
@group(0) @binding(3) var samplerBase: sampler;

struct FullscreenVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> FullscreenVertexOutput {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    var out: FullscreenVertexOutput;
    out.uv = pos[vertexIndex] * 0.5 + 0.5;
    out.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    return out;
}

@fragment
fn fs_main(in: FullscreenVertexOutput) -> @location(0) vec4<f32> {
    let depth = textureSample(depthTex, samplerBase, in.uv).r;
    if (depth >= 1.0) { discard; }

    let thickness = textureSample(thicknessTex, samplerBase, in.uv).r;
    
    // Calculate Normal from Depth Delta
    let texelSize = 1.0 / vec2<f32>(1280.0, 720.0); // Should be uniform
    let d1 = textureSample(depthTex, samplerBase, in.uv + vec2<f32>(texelSize.x, 0.0)).r;
    let d2 = textureSample(depthTex, samplerBase, in.uv + vec2<f32>(0.0, texelSize.y)).r;
    
    let normal = normalize(vec3<f32>(depth - d1, depth - d2, 0.01));

    // Simple Water Shading
    let viewDir = vec3<f32>(0.0, 0.0, 1.0);
    let fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
    
    let waterColor = mix(obj.color.xyz, vec3<f32>(1.0), fresnel * 0.5);
    return vec4<f32>(waterColor, min(thickness * 2.0, 0.8));
}
`;
