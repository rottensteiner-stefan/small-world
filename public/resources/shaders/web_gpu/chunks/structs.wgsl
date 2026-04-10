struct U { 
  vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, 
  dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, 
  numPL: f32, numSL: f32, numAL: f32, 
  thresholds: vec4f, isTerrain: f32, pad1: f32, pad2: f32, pad3: f32 
}
@group(0) @binding(0) var<uniform> u: U;

struct PL { pos: vec4f, col: vec4f }
@group(0) @binding(1) var<storage> pLights: array<PL>;

struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
@group(0) @binding(2) var<storage> sLights: array<SL>;

struct AL { pos: vec4f, col: vec4f, right: vec4f, up: vec4f, normal: vec4f, size: vec4f }
@group(0) @binding(3) var<storage> aLights: array<AL>;

@group(1) @binding(0) var tDiff: texture_2d<f32>;
@group(1) @binding(1) var s: sampler;
