/// src/core/renderers/shaders/ShaderBootstrap.ts

import { ShaderRegistry } from "./ShaderRegistry.js";
import { MaterialType, ShaderPropertyType } from "../../../enums/index.js";

/**
 * Bootstraps the ShaderRegistry with default chunks and shader definitions.
 */
export class ShaderBootstrap {
  /**
   * Initializes the registry with all standard shaders and chunks.
   */
  public static init(): void {
    const registry = ShaderRegistry.instance;

    // --- 1. REGISTER CHUNKS (GLSL 300 ES) ---
    
    registry.registerChunk("BASE_VERTEX_HEADER", `
      #version 300 es
      in vec3 a_position;
      in vec3 a_normal;
      in vec2 a_uv;

      uniform mat4 u_vp;
      uniform mat4 u_model;
      uniform vec2 u_texOffset;
      uniform vec2 u_texRepeat;

      out vec3 v_worldPos;
      out vec3 v_normal;
      out vec2 v_uv;
    `, "glsl300");

    registry.registerChunk("BASE_VERTEX_MAIN", `
      void main() {
        vec4 wp = u_model * vec4(a_position, 1.0);
        v_worldPos = wp.xyz;
        v_normal = mat3(u_model) * a_normal;
        v_uv = (a_uv * u_texRepeat) + u_texOffset;
        gl_Position = u_vp * wp;
      }
    `, "glsl300");

    registry.registerChunk("BASE_FRAGMENT_HEADER", `
      #version 300 es
      precision highp float;

      in vec3 v_worldPos;
      in vec3 v_normal;
      in vec2 v_uv;

      uniform vec4 u_color;
      uniform vec4 u_specColor;
      uniform float u_shininess;
      uniform vec3 u_viewPos;

      uniform sampler2D u_diffuseMap;

      out vec4 fragColor;
    `, "glsl300");

    registry.registerChunk("LIGHT_DEFS", `
      uniform vec3 u_ambientColor;
      uniform vec3 u_dirLightColor;
      uniform vec3 u_dirLightDir;

      uniform int u_numPointLights;
      uniform vec3 u_pointLightPos[4];
      uniform vec3 u_pointLightColor[4];

      uniform int u_numSpotLights;
      uniform vec3 u_spotLightPos[4];
      uniform vec3 u_spotLightDir[4];
      uniform vec3 u_spotLightColor[4];
      uniform vec4 u_spotLightParams[4];

      uniform int u_numAreaLights;
      uniform vec3 u_areaLightPos[4];
      uniform vec3 u_areaLightColor[4];
      uniform vec3 u_areaLightRight[4];
      uniform vec3 u_areaLightUp[4];
      uniform vec3 u_areaLightNormal[4];
      uniform vec2 u_areaLightSize[4];
    `, "glsl300");

    registry.registerChunk("LIGHT_CALC", `
      vec3 N = normalize(v_normal);
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
    `, "glsl300");

    // --- WGSL CHUNKS ---

    registry.registerChunk("WGSL_STRUCTS", `
      struct U { 
        vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, 
        dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, 
        numPL: f32, numSL: f32, numAL: f32, 
        thresholds: vec4f, isTerrain: f32, pad1: f32, pad2: f32, pad3: f32 
      }
      @group(0) @binding(0) var<uniform> u: U;
      
      struct PL { pos: vec4f, col: vec4f }
      @group(0) @binding(1) var<storage> pLights: array<PL>;
      
      struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
      @group(0) @binding(2) var<storage> sLights: array<SL>;
      
      struct AL { pos: vec4f, col: vec4f, right: vec4f, up: vec4f, normal: vec4f, size: vec4f }
      @group(0) @binding(3) var<storage> aLights: array<AL>;

      @group(1) @binding(0) var tDiff: texture_2d<f32>;
      @group(1) @binding(1) var s: sampler;
    `, "wgsl");

    registry.registerChunk("WGSL_VS", `
      struct Out { @builtin(position) p: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f }
      
      @vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Out {
        var o: Out; let worldP = u.model * vec4f(p, 1.0); o.p = u.vp * worldP; o.wp = worldP.xyz;
        o.n = (u.model * vec4f(n, 0.0)).xyz; o.uv = (uv * u.tRep) + u.tOff; return o;
      }
    `, "wgsl");

    registry.registerChunk("WGSL_LIGHT_CALC", `
      let V = normalize(u.cam.xyz - i.wp); var fL = u.amb.xyz; var spec = vec3f(0.0);
      let N = normalize(i.n); 
      let L_dir = normalize(u.dDir.xyz); let diff_dir = max(dot(N, L_dir), 0.0); fL += diff_dir * u.dCol.xyz;
      if (u.shininess > 0.0 && diff_dir > 0.0) { spec += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dCol.xyz; }
      
      for(var j=0u; j<u32(u.numPL); j++) {
        let lVec = pLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d;
        let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * pLights[j].col.xyz * atten;
        if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * pLights[j].col.xyz * atten; }
      }
      
      for(var j=0u; j<u32(u.numSL); j++) {
        let lVec = sLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d; let S = normalize(sLights[j].dir.xyz); let theta = dot(-L, S);
        if(theta > sLights[j].params.x) {
          let sEff = smoothstep(sLights[j].params.x, sLights[j].params.y, theta);
          let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * sLights[j].col.xyz * atten * sEff;
          if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * sLights[j].col.xyz * atten * sEff; }
        }
      }
    `, "wgsl");

    // --- 2. REGISTER SHADERS ---

    // BASIC SHADER (UNLIT)
    registry.register({
      id: MaterialType.BASIC,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `
            [BASE_FRAGMENT_HEADER]
            void main() {
              vec4 texColor = texture(u_diffuseMap, v_uv);
              fragColor = u_color * texColor;
            }
          `
        },
        wgsl: `
          [WGSL_STRUCTS]
          [WGSL_VS]
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(tDiff, s, i.uv);
            return u.color * texCol;
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texOffset: { type: ShaderPropertyType.VEC2 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 }
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE }
        }
      }
    });

    // PHONG SHADER (LIT)
    registry.register({
      id: MaterialType.PHONG,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `
            [BASE_FRAGMENT_HEADER]
            [LIGHT_DEFS]
            void main() {
              vec4 texColor = texture(u_diffuseMap, v_uv);
              [LIGHT_CALC]
              fragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
            }
          `
        },
        wgsl: `
          [WGSL_STRUCTS]
          [WGSL_VS]
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(tDiff, s, i.uv);
            [WGSL_LIGHT_CALC]
            return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_specColor: { type: ShaderPropertyType.COLOR },
          u_shininess: { type: ShaderPropertyType.FLOAT },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 }
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE }
        }
      }
    });

    // LAMBERT SHADER (LIT, but no specular)
    registry.register({
      id: MaterialType.LAMBERT,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `
            [BASE_FRAGMENT_HEADER]
            [LIGHT_DEFS]
            void main() {
              vec4 texColor = texture(u_diffuseMap, v_uv);
              [LIGHT_CALC]
              fragColor = vec4(finalLight * u_color.rgb * texColor.rgb, u_color.a * texColor.a);
            }
          `
        },
        wgsl: `
          [WGSL_STRUCTS]
          [WGSL_VS]
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(tDiff, s, i.uv);
            [WGSL_LIGHT_CALC]
            return vec4f(fL * u.color.rgb * texCol.rgb, u.color.a * texCol.a);
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 }
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE }
        }
      }
    });

    // SPRITE SHADER (similar to BASIC but with Alpha)
    registry.register({
      id: MaterialType.SPRITE,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `
            [BASE_FRAGMENT_HEADER]
            void main() {
              vec4 texColor = texture(u_diffuseMap, v_uv);
              fragColor = u_color * texColor;
            }
          `
        },
        wgsl: `
          [WGSL_STRUCTS]
          [WGSL_VS]
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(tDiff, s, i.uv);
            return u.color * texCol;
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR }
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE }
        }
      }
    });

    // WIREFRAME SHADER
    registry.register({
      id: MaterialType.WIREFRAME,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `
            [BASE_FRAGMENT_HEADER]
            void main() {
              fragColor = u_color;
            }
          `
        },
        wgsl: `
          [WGSL_STRUCTS]
          [WGSL_VS]
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            return u.color;
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR }
        },
        textures: {}
      }
    });

    // SKYBOX SHADER
    registry.register({
      id: MaterialType.SKYBOX,
      sources: {
        glsl300: {
          vs: `
            #version 300 es
            in vec3 a_position;
            uniform mat4 u_vp;
            uniform mat4 u_model;
            out vec3 v_uvw;
            void main() {
              v_uvw = a_position;
              gl_Position = u_vp * u_model * vec4(a_position, 1.0);
            }
          `,
          fs: `
            #version 300 es
            precision highp float;
            in vec3 v_uvw;
            uniform samplerCube u_skybox;
            out vec4 fragColor;
            void main() {
              fragColor = texture(u_skybox, v_uvw);
            }
          `
        },
        wgsl: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32, numAL: f32, thresholds: vec4f, isTerrain: f32, pad1: f32, pad2: f32, pad3: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          @group(1) @binding(0) var t: texture_cube<f32>; 
          @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) uvw: vec3f }
          @vertex fn vs(@location(0) p: vec3f) -> Out { 
            var o: Out; o.uvw = p; o.p = u.vp * u.model * vec4f(p, 1.0); return o; 
          }
          @fragment fn fs(i: Out) -> @location(0) vec4f { 
            return textureSample(t, s, i.uvw); 
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR }
        },
        textures: {
          u_skybox: { type: ShaderPropertyType.TEXTURE }
        }
      }
    });

    // TERRAIN SHADER
    registry.register({
      id: MaterialType.TERRAIN,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `
            [BASE_FRAGMENT_HEADER]
            [LIGHT_DEFS]
            uniform sampler2D u_sandMap;
            uniform sampler2D u_grassMap;
            uniform sampler2D u_rockMap;
            uniform sampler2D u_snowMap;
            uniform vec4 u_thresholds;
            uniform vec2 u_texRepeat;

            void main() {
              vec3 N = normalize(v_normal);
              vec2 uv = v_uv * u_texRepeat;
              vec4 sand = texture(u_sandMap, uv);
              vec4 grass = texture(u_grassMap, uv);
              vec4 rock = texture(u_rockMap, uv);
              vec4 snow = texture(u_snowMap, uv);

              float h = v_worldPos.y;
              float b1 = smoothstep(u_thresholds.x - u_thresholds.w, u_thresholds.x + u_thresholds.w, h);
              float b2 = smoothstep(u_thresholds.y - u_thresholds.w, u_thresholds.y + u_thresholds.w, h);
              float b3 = smoothstep(u_thresholds.z - u_thresholds.w, u_thresholds.z + u_thresholds.w, h);

              vec4 texColor = mix(sand, grass, b1);
              texColor = mix(texColor, rock, b2);
              texColor = mix(texColor, snow, b3);

              float slope = 1.0 - N.y;
              float slopeBlend = smoothstep(0.25, 0.45, slope);
              texColor = mix(texColor, rock, slopeBlend);

              [LIGHT_CALC]
              fragColor = vec4(finalLight * u_color.rgb * texColor.rgb, u_color.a * texColor.a);
            }
          `
        },
        wgsl: `
          [WGSL_STRUCTS]
          @group(1) @binding(2) var tSand: texture_2d<f32>;
          @group(1) @binding(3) var tGrass: texture_2d<f32>;
          @group(1) @binding(4) var tRock: texture_2d<f32>;
          @group(1) @binding(5) var tSnow: texture_2d<f32>;
          [WGSL_VS]
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let sand = textureSample(tSand, s, i.uv);
            let grass = textureSample(tGrass, s, i.uv);
            let rock = textureSample(tRock, s, i.uv);
            let snow = textureSample(tSnow, s, i.uv);

            let h = i.wp.y;
            let b1 = smoothstep(u.thresholds.x - u.thresholds.w, u.thresholds.x + u.thresholds.w, h);
            let b2 = smoothstep(u.thresholds.y - u.thresholds.w, u.thresholds.y + u.thresholds.w, h);
            let b3 = smoothstep(u.thresholds.z - u.thresholds.w, u.thresholds.z + u.thresholds.w, h);

            var texCol = mix(sand, grass, b1);
            texCol = mix(texCol, rock, b2);
            texCol = mix(texCol, snow, b3);

            let N = normalize(i.n); 
            let slope = 1.0 - N.y;
            let slopeBlend = smoothstep(0.25, 0.45, slope);
            texCol = mix(texCol, rock, slopeBlend);

            [WGSL_LIGHT_CALC]
            return vec4f(fL * u.color.rgb * texCol.rgb, u.color.a * texCol.a);
          }
        `
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_thresholds: { type: ShaderPropertyType.VEC4 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 }
        },
        textures: {
          u_sandMap: { type: ShaderPropertyType.TEXTURE },
          u_grassMap: { type: ShaderPropertyType.TEXTURE },
          u_rockMap: { type: ShaderPropertyType.TEXTURE },
          u_snowMap: { type: ShaderPropertyType.TEXTURE }
        }
      }
    });
  }
}
