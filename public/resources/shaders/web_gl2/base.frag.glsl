#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;

uniform vec4 u_color;
uniform vec4 u_specColor;
uniform float u_shininess;
uniform vec3 u_viewPos;

uniform sampler2D u_diffuseMap;

out vec4 c;
