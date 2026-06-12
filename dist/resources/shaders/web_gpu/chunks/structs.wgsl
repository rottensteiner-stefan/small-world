// WGSL Global and Object structures

struct GlobalUniforms {
    vp: mat4x4f,
    viewPos: vec4f,
    ambientColor: vec4f,
    dirLightColor: vec4f,
    dirLightDir: vec4f,
    numPointLights: f32,
    numSpotLights: f32,
    numAreaLights: f32,
    gamma: f32,
    exposure: f32,
    fogMode: f32,
    fogDensity: f32,
    fogNear: f32,
    fogFar: f32,
    fogHeight: f32,
    fogHeightFalloff: f32,
    _pad: f32,
    fogColor: vec4f
}

struct ObjectUniforms {
    model: mat4x4f,
    color: vec4f,
    specColor: vec4f, 
    texOffset: vec2f,
    texRepeat: vec2f,
    shininess: f32,
    isTerrain: f32,
    metallic: f32,
    roughness: f32,
    extraParams: vec4f, // [ao, time, flowSpeed, noiseScale]
    liquidParams: vec4f, // [waveFreq, waveAmp, 0, 0]
    thresholds: vec4f   // [sandToGrass, grassToRock, rockToSnow, softness]
}

struct Out {
    @builtin(position) pos: vec4f,
    @location(0) wp: vec3f,
    @location(1) n: vec3f,
    @location(2) uv: vec2f,
    @location(3) t: vec3f,
    @location(4) b: vec3f
}

struct PointLight {
    pos: vec4f,
    col: vec4f
}

struct SpotLight {
    pos: vec4f,
    dir: vec4f,
    col: vec4f,
    params: vec4f 
}

struct AreaLight {
    pos: vec4f,
    col: vec4f,
    right: vec4f,
    up: vec4f,
    normal: vec4f,
    size: vec4f
}

@group(0) @binding(0) var<uniform> global: GlobalUniforms;
@group(0) @binding(1) var<storage> pLights: array<PointLight>;
@group(0) @binding(2) var<storage> sLights: array<SpotLight>;
@group(0) @binding(3) var<storage> aLights: array<AreaLight>;

@group(1) @binding(0) var<uniform> obj: ObjectUniforms;
@group(1) @binding(1) var s: sampler;
@group(1) @binding(2) var u_diffuseMap: texture_2d<f32>;
@group(1) @binding(3) var u_normalMap: texture_2d<f32>;
@group(1) @binding(4) var u_specularMap: texture_2d<f32>;
@group(1) @binding(5) var u_sandMap: texture_2d<f32>;
@group(1) @binding(6) var u_grassMap: texture_2d<f32>;
@group(1) @binding(7) var u_rockMap: texture_2d<f32>;
@group(1) @binding(8) var u_snowMap: texture_2d<f32>;
@group(1) @binding(9) var u_metallicMap: texture_2d<f32>;
@group(1) @binding(10) var u_roughnessMap: texture_2d<f32>;
@group(1) @binding(11) var u_skybox: texture_cube<f32>;
@group(1) @binding(12) var u_emissiveMap: texture_2d<f32>;
