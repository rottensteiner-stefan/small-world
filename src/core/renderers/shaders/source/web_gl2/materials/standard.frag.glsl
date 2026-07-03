[BASE_FRAGMENT_HEADER]
[LIGHT_DEFS]
[PBR_MATH]

uniform float u_metallic;
uniform float u_roughness;
uniform float u_ao;

void main() {
    // Convert sampled albedo to linear space
    vec4 texColor = texture(u_diffuseMap, v_uv);
    vec3 albedo = sRGBToLinear(texColor.rgb) * sRGBToLinear(u_color.rgb);
    
    float metallic = u_metallic;
    float roughness = clamp(u_roughness, 0.05, 1.0); // Avoid divide by zero
    float ao = u_ao;

    [LIGHT_CALC_PBR]
}
