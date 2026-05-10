[WGSL_STRUCTS]

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) tangent: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

@vertex
fn vs(model: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    
    let time = object.u_extraParams.y;
    let flowSpeed = object.u_extraParams.z;
    let waveFrequency = object.u_liquidParams.x;
    let waveAmplitude = object.u_liquidParams.y;

    var pos = model.position;
    let world_pos_init = object.u_model * vec4<f32>(pos, 1.0);
    let displacementSpeed = time * flowSpeed * 0.5;
    
    // Wave based on world coordinates for seamless tiling
    let wave = sin(world_pos_init.x * waveFrequency + displacementSpeed) * cos(world_pos_init.z * waveFrequency + displacementSpeed) * waveAmplitude;
    pos.y += wave;

    let world_pos = object.u_model * vec4<f32>(pos, 1.0);
    out.world_pos = world_pos.xyz;
    out.normal = (object.u_model * vec4<f32>(model.normal, 0.0)).xyz;
    out.uv = model.uv;
    out.clip_position = global.u_vp * world_pos;
    return out;
}
