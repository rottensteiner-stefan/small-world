      vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor;
      vec3 specular = vec3(0.0);

      // Directional Light
      vec3 L_dir = normalize(-u_dirLightDir);
      float diff_dir = max(dot(N, L_dir), 0.0);
      
      float dirShadow = 1.0;
      if (u_dirShadowInfo.z > 0.5 && u_dirShadowInfo.w > 0.0) {
          float depth = length(u_viewPos - v_worldPos);
          int cascadeIndex = int(u_dirShadowInfo.w) - 1;
          for (int i = 0; i < 4; i++) {
              if (i >= int(u_dirShadowInfo.w)) break;
              if (depth < u_cascadeSplits[i]) {
                  cascadeIndex = i;
                  break;
              }
          }
          
          // Normal-offset bias: push the sample point along the surface normal (scaled by
          // NdotL, so grazing angles -- where acne is worst -- get the biggest offset and
          // surfaces facing the light head-on get almost none) instead of only biasing depth.
          vec3 dirShadowSamplePos = v_worldPos + N * u_dirShadowInfo.y * (1.0 - diff_dir);
          vec4 lightSpacePos = u_cascadeMatrices[cascadeIndex] * vec4(dirShadowSamplePos, 1.0);
          vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
          projCoords = projCoords * 0.5 + 0.5;
          
          if (projCoords.z <= 1.0 && projCoords.x >= 0.0 && projCoords.x <= 1.0 && projCoords.y >= 0.0 && projCoords.y <= 1.0) {
              float cols = ceil(sqrt(u_dirShadowInfo.w));
              float col = mod(float(cascadeIndex), cols);
              float row = floor(float(cascadeIndex) / cols);
              
              vec2 atlasUV = (projCoords.xy + vec2(col, row)) / cols;
              float bias = u_dirShadowInfo.x;
              float currentDepth = projCoords.z;
              
              dirShadow = 0.0;
              vec2 texelSize = 1.0 / vec2(textureSize(u_dirShadowMap, 0));
              for(int x = -1; x <= 1; ++x) {
                  for(int y = -1; y <= 1; ++y) {
                      dirShadow += texture(u_dirShadowMap, vec3(atlasUV + vec2(x, y) * texelSize, currentDepth - bias));
                  }
              }
              dirShadow /= 9.0;
          }
      }

      finalLight += diff_dir * u_dirLightColor * dirShadow;
      if (u_shininess > 0.0 && diff_dir > 0.0) {
        specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor * dirShadow;
      }

      // Point Lights
      for(int i = 0; i < 16; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLights[i].pos - v_worldPos;
        float dist = length(lightVec);
        
        // Compute attenuation
        float lightDistance = max(u_pointLights[i].distance, 0.001);
        float decay = u_pointLights[i].decay;
        
        // PBR physically based attenuation: 1 / (distance^2)
        // With smooth cutoff at max distance
        float distanceFalloff = 1.0 / max(dist * dist, 0.01);
        
        // Windowing function to zero out light at max distance (Unreal Engine 4 style)
        float distRatio = dist / lightDistance;
        float distRatio4 = distRatio * distRatio * distRatio * distRatio;
        float window = clamp(1.0 - distRatio4, 0.0, 1.0);
        float cutoff = window * window;
        
        // If decay is 0, we don't fall off physically, we just do linear/constant
        float attenuation = (decay > 0.0) ? (distanceFalloff * cutoff) : clamp(1.0 - dist / lightDistance, 0.0, 1.0);
        
        if (attenuation > 0.0) {
            vec3 L_pt = lightVec / dist;
            float diff_pt = max(dot(N, L_pt), 0.0);
            finalLight += diff_pt * u_pointLights[i].color * attenuation;
            if (u_shininess > 0.0 && diff_pt > 0.0) {
                specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLights[i].color * attenuation;
            }
        }
      }

      // Spot Lights
      for(int i = 0; i < 16; i++) {
        if (i >= u_numSpotLights) break;
        vec3 lightVec = u_spotLights[i].pos - v_worldPos;
        float dist = length(lightVec);
        vec3 L_sp = lightVec / dist;
        vec3 S_dir = normalize(u_spotLights[i].dir);
        float theta = dot(-L_sp, S_dir);
        if(theta > u_spotLights[i].params.x) {
            float spotEffect = smoothstep(u_spotLights[i].params.x, u_spotLights[i].params.y, theta);
            float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
            float diff_sp = max(dot(N, L_sp), 0.0);
            
            // Shadow Calculation
            float shadow = 1.0;
            if (u_spotShadowInfo[i].z > 0.5) {
                vec3 projCoords = v_spotLightSpacePos[i].xyz / v_spotLightSpacePos[i].w;
                projCoords = projCoords * 0.5 + 0.5;
                if (projCoords.x >= 0.0 && projCoords.x <= 1.0 && projCoords.y >= 0.0 && projCoords.y <= 1.0 && projCoords.z <= 1.0) {
                    float bias = u_spotShadowInfo[i].x;
                    float currentDepth = projCoords.z;
                    shadow = 0.0;
                    vec2 texelSize;
                    if (i == 0) texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[0], 0));
                    else if (i == 1) texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[1], 0));
                    else if (i == 2) texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[2], 0));
                    else texelSize = 1.0 / vec2(textureSize(u_spotShadowMap[3], 0));
                    
                    for(int x = -1; x <= 1; ++x) {
                        for(int y = -1; y <= 1; ++y) {
                            vec3 tCoord = vec3(projCoords.xy + vec2(x, y) * texelSize, currentDepth - bias);
                            if (i == 0) shadow += texture(u_spotShadowMap[0], tCoord);
                            else if (i == 1) shadow += texture(u_spotShadowMap[1], tCoord);
                            else if (i == 2) shadow += texture(u_spotShadowMap[2], tCoord);
                            else shadow += texture(u_spotShadowMap[3], tCoord);
                        }
                    }
                    shadow /= 9.0;
                }
            }

            finalLight += diff_sp * u_spotLights[i].color * attenuation * spotEffect * shadow;
            if (u_shininess > 0.0 && diff_sp > 0.0) {
                specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLights[i].color * attenuation * spotEffect * shadow;
            }
        }
      }

      // Area Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numAreaLights) break;

        vec3 L_center = u_areaLights[i].pos;
        vec3 L_normal = normalize(u_areaLights[i].normal);
        vec3 dirFromLight = v_worldPos - L_center;

        if(dot(dirFromLight, L_normal) < 0.0) continue;

        vec3 L_right = normalize(u_areaLights[i].right);
        vec3 L_up = normalize(u_areaLights[i].up);
        vec2 size = u_areaLights[i].size;

        float projX = clamp(dot(dirFromLight, L_right), -size.x, size.x);
        float projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);

        vec3 closestPoint = L_center + L_right * projX + L_up * projY;

        vec3 lightVec = closestPoint - v_worldPos;
        float dist = length(lightVec);
        vec3 L_al = lightVec / (dist + 0.0001);

        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
        float diff_al = max(dot(N, L_al), 0.0);

        finalLight += diff_al * u_areaLights[i].color * attenuation;
        if (u_shininess > 0.0 && diff_al > 0.0) {
            specular += pow(max(dot(V, reflect(-L_al, N)), 0.0), u_shininess) * u_areaLights[i].color * attenuation;
        }
      }
