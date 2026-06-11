#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;
in mat3 v_tbn;

uniform vec4 u_color;
uniform vec4 u_specColor;
uniform float u_shininess;
uniform vec4 u_extraParams;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_specularMap;

// Shadow Mapping
in vec4 v_spotLightSpacePos[4];
uniform sampler2DShadow u_spotShadowMap[4];
uniform vec4 u_spotShadowInfo[4]; // x=bias, y=normalBias, z=castShadow, w=pad

out vec4 fragColor;
