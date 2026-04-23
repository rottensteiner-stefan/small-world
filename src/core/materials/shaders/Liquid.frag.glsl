#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_worldPos;
in vec3 v_normal;

uniform vec4 u_color;
uniform vec4 u_specColor;
uniform float u_time;
uniform float u_flowSpeed;
uniform float u_noiseScale;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_specularMap;
uniform sampler2D u_ambientMap;

out vec4 FragColor;

void main() {
    // Use world position XZ for seamless tiling across objects
    vec2 worldUV = v_worldPos.xz * 0.5; // Factor 0.5 because tile size was 2x2
    vec2 uv = worldUV * u_noiseScale;
    
    vec2 uv1 = uv + vec2(u_time * 0.05, u_time * 0.02) * u_flowSpeed;
    vec2 uv2 = uv + vec2(-u_time * 0.03, u_time * 0.04) * u_flowSpeed;
    
    float n1 = dot(texture(u_diffuseMap, uv1).rgb, vec3(0.299, 0.587, 0.114));
    float n2 = dot(texture(u_diffuseMap, uv2).rgb, vec3(0.299, 0.587, 0.114));
    float noise = (n1 + n2) * 0.5;
    
    // Ambient map for base details
    vec4 ambient = vec4(1.0);
    if (textureSize(u_ambientMap, 0).x > 1) {
        ambient = texture(u_ambientMap, v_uv);
    }
    
    // Normal map for surface detail
    vec3 normal = normalize(v_normal);
    if (textureSize(u_normalMap, 0).x > 1) {
        vec3 nMap = texture(u_normalMap, uv1).rgb * 2.0 - 1.0;
        normal = normalize(normal + nMap * 0.5);
    }
    
    // Specular map for shininess
    float spec = 0.0;
    if (textureSize(u_specularMap, 0).x > 1) {
        spec = texture(u_specularMap, uv2).r;
    }
    
    float blend = smoothstep(0.6, 0.8, noise);
    
    vec3 glow = u_color.rgb * (1.0 - smoothstep(0.0, 0.6, noise)) * 1.5;
    vec3 finalColor = mix(glow * ambient.rgb, u_specColor.rgb * ambient.rgb, blend);
    
    // Add some specular highlights
    finalColor += u_specColor.rgb * spec * 0.5;
    
    FragColor = vec4(finalColor, 1.0);
}
