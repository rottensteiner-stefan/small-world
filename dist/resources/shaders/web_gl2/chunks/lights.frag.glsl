precision highp int;

struct PointLight {
    vec3 pos;
    float _pad;
    vec3 color;
    float _pad2;
};

struct SpotLight {
    vec3 pos;
    float _pad;
    vec3 dir;
    float _pad2;
    vec3 color;
    float _pad3;
    vec4 params; // intensity, inner, outer, range
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

// Note: This block must match the one in headers exactly if not using separate files
// But since these are chunks, we only define the arrays here and expect the UBO to be open.
// Actually, in WebGL2 it's better to define the WHOLE UBO in one chunk or repeat it.
// Let's redefine the WHOLE GlobalUniforms here to be safe and clear.

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
    PointLight u_pointLights[4];
    SpotLight u_spotLights[4];
    AreaLight u_areaLights[4];
};

// Linear to sRGB
vec3 linearToSRGB(vec3 color) {
    return pow(color, vec3(1.0 / u_gamma));
}

// sRGB to Linear
vec3 sRGBToLinear(vec3 color) {
    return pow(color, vec3(u_gamma));
}
