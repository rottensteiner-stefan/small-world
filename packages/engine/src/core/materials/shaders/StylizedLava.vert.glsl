#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_tangent;

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
    float _pad4;
    vec2 u_cameraNearFar;
};

uniform mat4 u_model;
uniform float u_time;
uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;

// u_matParam4: [waveSpeed, waveAmount, waveHeight, viscousDamping]
uniform vec4 u_matParam4;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;

void main() {
    float time = u_time;
    float waveSpeed = u_matParam4.x;
    float waveAmount = u_matParam4.y;
    float waveHeight = u_matParam4.z;

    vec4 localPos = vec4(a_position, 1.0);

    // Diagonal viscous undulation (MinionsArt X*Z wave)
    float waveOffset = sin(time * waveSpeed + (a_position.x * a_position.z * waveAmount)) * waveHeight;
    localPos.y += waveOffset;

    vec4 worldPos = u_model * localPos;
    v_worldPos = worldPos.xyz;
    gl_Position = u_vp * worldPos;

    mat3 m33 = mat3(u_model);
    vec3 worldN = m33 * a_normal;
    if (dot(a_normal, a_normal) < 0.0001 || dot(worldN, worldN) < 1e-20) {
        v_normal = vec3(0.0, 1.0, 0.0);
    } else {
        v_normal = normalize(worldN);
    }

    v_uv = (a_uv * u_texRepeat) + u_texOffset;
}
