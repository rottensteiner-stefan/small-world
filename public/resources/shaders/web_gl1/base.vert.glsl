attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;

uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec2 u_texOffset;
uniform vec2 u_texRepeat;

varying vec3 v_worldPos;
varying vec3 v_normal;
varying vec2 v_uv;

mat3 extractMat3(mat4 m) {
    return mat3(m[0].xyz, m[1].xyz, m[2].xyz);
}

void main() {
    vec4 wp = u_model * vec4(a_position, 1.0);
    v_worldPos = wp.xyz;
    v_normal = extractMat3(u_model) * a_normal;
    v_uv = (a_uv * u_texRepeat) + u_texOffset;
    gl_Position = u_vp * wp;
}