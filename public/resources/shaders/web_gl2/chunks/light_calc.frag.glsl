      vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor;
      vec3 specular = vec3(0.0);

      // Directional Light
      vec3 L_dir = normalize(u_dirLightDir);
      float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;
      if (u_shininess > 0.0 && diff_dir > 0.0) {
        specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor;
      }

      // Point Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLightPos[i] - v_worldPos;
        float dist = length(lightVec);
        vec3 L_pt = lightVec / dist;
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
        float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_pt > 0.0) {
            specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
        }
      }

      // Spot Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numSpotLights) break;
        vec3 lightVec = u_spotLightPos[i] - v_worldPos;
        float dist = length(lightVec);
        vec3 L_sp = lightVec / dist;
        vec3 S_dir = normalize(u_spotLightDir[i]);
        float theta = dot(-L_sp, S_dir);
        if(theta > u_spotLightParams[i].x) {
            float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta);
            float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
            float diff_sp = max(dot(N, L_sp), 0.0);
            finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect;
            if (u_shininess > 0.0 && diff_sp > 0.0) {
                specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect;
            }
        }
      }

      // Area Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numAreaLights) break;

        vec3 L_center = u_areaLightPos[i];
        vec3 L_normal = normalize(u_areaLightNormal[i]);
        vec3 dirFromLight = v_worldPos - L_center;

        if(dot(dirFromLight, L_normal) < 0.0) continue;

        vec3 L_right = normalize(u_areaLightRight[i]);
        vec3 L_up = normalize(u_areaLightUp[i]);
        vec2 size = u_areaLightSize[i];

        float projX = clamp(dot(dirFromLight, L_right), -size.x, size.x);
        float projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);

        vec3 closestPoint = L_center + L_right * projX + L_up * projY;

        vec3 lightVec = closestPoint - v_worldPos;
        float dist = length(lightVec);
        vec3 L_al = lightVec / (dist + 0.0001);

        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
        float diff_al = max(dot(N, L_al), 0.0);

        finalLight += diff_al * u_areaLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_al > 0.0) {
            specular += pow(max(dot(V, reflect(-L_al, N)), 0.0), u_shininess) * u_areaLightColor[i] * attenuation;
        }
      }