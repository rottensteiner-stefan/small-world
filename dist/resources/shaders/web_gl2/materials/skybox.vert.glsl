#version 300 es
in vec3 a_position;

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
out vec3 v_uvw;
void main() {
  v_uvw = a_position;
  gl_Position = u_vp * u_model * vec4(a_position, 1.0);
}
