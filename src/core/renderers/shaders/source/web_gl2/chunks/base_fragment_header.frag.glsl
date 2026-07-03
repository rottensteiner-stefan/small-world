#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DShadow;

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

// Global IBL Maps
uniform samplerCube u_irradianceMap;
uniform samplerCube u_prefilterMap;
uniform sampler2D u_brdfLUT;
uniform float u_envIntensity;

// Shadow Mapping
in vec4 v_spotLightSpacePos[4];
uniform sampler2DShadow u_spotShadowMap[4];
uniform vec4 u_spotShadowInfo[4]; // x=bias, y=normalBias, z=castShadow, w=pad

// Cascaded Shadow Maps
uniform sampler2DShadow u_dirShadowMap;
uniform mat4 u_cascadeMatrices[4];
uniform vec4 u_cascadeSplits;
uniform vec4 u_dirShadowInfo; // x=bias, y=normalBias, z=castShadow, w=numCascades

out vec4 fragColor;
