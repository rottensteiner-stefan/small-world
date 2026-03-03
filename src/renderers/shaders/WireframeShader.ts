export const WireframeVS_300 = `#version 300 es
in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;
void main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }`;

export const WireframeFS_300 = `#version 300 es
precision highp float; uniform vec4 u_color; out vec4 c;
void main() { c = u_color; }`;

export const WireframeVS_100 = `
attribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;
void main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }`;

export const WireframeFS_100 = `
precision highp float; uniform vec4 u_color;
void main() { gl_FragColor = u_color; }`;
