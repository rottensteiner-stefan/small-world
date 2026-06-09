[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]
[PBR_MATH]

uniform float u_metallic;
uniform float u_roughness;
uniform float u_ao;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_metallicMap;
uniform sampler2D u_roughnessMap;

void main() {
    // Convert sampled albedo to linear space
    vec4 texColor = texture(u_diffuseMap, v_uv);
    vec3 albedo = sRGBToLinear(texColor.rgb) * sRGBToLinear(u_color.rgb);
    
    float metallic = u_metallic * texture(u_metallicMap, v_uv).r;
    float roughness = clamp(u_roughness * texture(u_roughnessMap, v_uv).r, 0.05, 1.0); // Avoid divide by zero
    float ao = u_ao;

    [LIGHT_CALC_PBR]
}