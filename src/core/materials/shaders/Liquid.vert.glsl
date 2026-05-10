#version 300 es
in vec3 a_position;
in vec2 a_uv;
in vec3 a_normal;

layout(std140) uniform GlobalUniforms {
    mat4 u_vp;
    vec3 u_viewPos;
    int _pad0;
    vec3 u_ambientColor;
    int _pad1;
    vec3 u_dirLightColor;
    int _pad2;
    vec3 u_dirLightDir;
    int _pad3;
    int u_numPointLights;
    int u_numSpotLights;
    int u_numAreaLights;
    float u_gamma;
    float u_exposure;
    float _pad4[3]; 
    // We don't necessarily need the light structs here if we don't use them, 
    // but the block SIZE and LAYOUT must match.
    // However, it's safer to include them or at least the equivalent padding.
    vec4 _lightData[44]; // Total size matching the lights part of the UBO
};

uniform mat4 u_model;
uniform vec4 u_extraParams; // [intensity, time, flowSpeed, noiseScale]
uniform vec4 u_liquidParams; // [waveFreq, waveAmp, 0, 0]

out vec2 v_uv;
out vec3 v_worldPos;
out vec3 v_normal;

void main() {
    v_uv = a_uv;
    vec3 pos = a_position;
    
    float time = u_extraParams.y;
    float flowSpeed = u_extraParams.z;
    float waveFrequency = u_liquidParams.x;
    float waveAmplitude = u_liquidParams.y;

    vec4 worldPos = u_model * vec4(pos, 1.0);
    float displacementSpeed = time * flowSpeed * 0.5;
    
    // Wave based on world coordinates for seamless tiling
    float wave = sin(worldPos.x * waveFrequency + displacementSpeed) * cos(worldPos.z * waveFrequency + displacementSpeed) * waveAmplitude;
    pos.y += wave;

    // Re-calculate worldPos with displacement
    worldPos = u_model * vec4(pos, 1.0);
    v_worldPos = worldPos.xyz;
    v_normal = (u_model * vec4(a_normal, 0.0)).xyz;
    gl_Position = u_vp * worldPos;
}
