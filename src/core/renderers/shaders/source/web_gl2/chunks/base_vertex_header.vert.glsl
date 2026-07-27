#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_tangent;

#ifdef USE_INSTANCING
in mat4 a_instanceMatrix;
#ifdef USE_TEXTURE_ARRAY
in vec4 a_instanceData;
out float v_texIndex;
#endif
#endif

struct PointLight {
    vec3 pos;
    float distance;
    vec3 color;
    float decay;
};

struct SpotLight {
    vec3 pos;
    float _pad;
    vec3 dir;
    float _pad2;
    vec3 color;
    float _pad3;
    vec4 params;
};

struct AreaLight {
    vec3 pos;
    float _pad;
    vec3 color;
    float _pad2;
    vec3 right;
    float _pad3;
    vec3 up;
    float _pad4;
    vec3 normal;
    float _pad5;
    vec2 size;
    vec2 _pad6;
};

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
    PointLight u_pointLights[4];
    SpotLight u_spotLights[4];
    AreaLight u_areaLights[4];
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
