#version 300 es
in vec3 a_position;
in vec2 a_uv;
in vec3 a_normal;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform float u_time;
uniform float u_flowSpeed;
out vec2 v_uv;
out vec3 v_worldPos;
void main() {
    v_uv = a_uv;
    vec3 pos = a_position;
    float displacementSpeed = u_time * u_flowSpeed * 0.5;
    pos.y += sin(pos.x * 5.0 + displacementSpeed) * cos(pos.z * 5.0 + displacementSpeed) * 0.15;
    vec4 worldPos = u_model * vec4(pos, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_vp * worldPos;
}