/// src/renderers/shaders/WireframeWGSL.ts
export const WireframeWGSL = `
struct U { vp: mat4x4<f32>, model: mat4x4<f32>, color: vec4<f32> };
@group(0) @binding(0) var<uniform> u: U;
@vertex fn vs_main(@location(0) p: vec3<f32>) -> @builtin(position) vec4<f32> { return u.vp * u.model * vec4<f32>(p, 1.0); }
@fragment fn fs_main() -> @location(0) vec4<f32> { return u.color; }
`;
