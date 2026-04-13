#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_tangent;

uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;
out mat3 v_tbn;
