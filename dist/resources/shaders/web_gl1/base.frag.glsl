precision highp float;

varying vec3 v_worldPos;
varying vec3 v_normal;
varying vec2 v_uv;

uniform vec4 u_color;
uniform vec4 u_specColor;
uniform float u_shininess;
uniform vec3 u_viewPos;

uniform sampler2D u_diffuseMap;
