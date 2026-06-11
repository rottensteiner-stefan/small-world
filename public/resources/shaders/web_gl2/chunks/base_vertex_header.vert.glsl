#version 300 es
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
    float _pad4[3]; 
    vec4 _lightData[44];
};

uniform mat4 u_model;
uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;

// Shadow Mapping
uniform mat4 u_spotShadowMatrix[4];

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;
out mat3 v_tbn;
out vec4 v_spotLightSpacePos[4];
