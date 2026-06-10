[BASE_FRAGMENT_HEADER]

void main() {
    // Alpha test for cutout objects
    float alpha = texture(u_diffuseMap, v_uv).a;
    if (alpha < u_extraParams.y) {
        discard;
    }
    
    // Depth is automatically written to gl_FragDepth by the hardware.
    // We just output a dummy color.
    fragColor = vec4(1.0); 
}
