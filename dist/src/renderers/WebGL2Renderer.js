import { Color } from "../core/colors/Color.js";
import { LightType } from "../enums/LightType.js";
import { Mesh } from "./Mesh.js";
import { Vector3D } from "../math/Vector3D.js";
import { TextureWrap } from "../enums/TextureWrap.js";
import { TextureFilter } from "../enums/TextureFilter.js";
export class WebGL2Renderer {
    gl;
    prog;
    cache = new Map();
    texCache = new Map();
    defaultTexture;
    locs;
    pointLightLocs = [];
    spotLightLocs = [];
    async initialize(canvas) {
        this.gl = canvas.getContext("webgl2", { antialias: true });
        this.defaultTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        const vsCode = `#version 300 es
    in vec3 a_position; in vec3 a_normal; in vec2 a_uv;
    uniform mat4 u_vp; uniform mat4 u_model;
    uniform vec2 u_texOffset; uniform vec2 u_texRepeat; // <--- NEU
    out vec3 v_worldPos; out vec3 v_normal; out vec2 v_uv;
    void main() {
      vec4 wp = u_model * vec4(a_position, 1.0);
      v_worldPos = wp.xyz; v_normal = mat3(u_model) * a_normal; 
      v_uv = (a_uv * u_texRepeat) + u_texOffset; // <--- UV TRANSFORMATION
      gl_Position = u_vp * wp;
    }`;
        const fsCode = `#version 300 es
    precision highp float;
    in vec3 v_worldPos; in vec3 v_normal; in vec2 v_uv;
    uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos;
    uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir;
    uniform sampler2D u_diffuseMap;
    
    uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4];
    uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4];

    out vec4 c;

    void main() {
      vec4 texColor = texture(u_diffuseMap, v_uv);
      if (u_shininess < -0.5) { c = u_color * texColor; return; }
      
      vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0);

      // Directional
      vec3 L_dir = normalize(u_dirLightDir);
      float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;
      if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor;

      // Point Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLightPos[i] - v_worldPos;
        float dist = length(lightVec); vec3 L_pt = lightVec / dist;
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
        float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
      }

      // Spot Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numSpotLights) break;
        vec3 lightVec = u_spotLightPos[i] - v_worldPos;
        float dist = length(lightVec); vec3 L_sp = lightVec / dist;
        vec3 S_dir = normalize(u_spotLightDir[i]);
        float theta = dot(-L_sp, S_dir);
        if(theta > u_spotLightParams[i].x) {
            float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta);
            float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
            float diff_sp = max(dot(N, L_sp), 0.0);
            finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect;
            if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect;
        }
      }

      c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
    }`;
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vs, vsCode);
        this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fs, fsCode);
        this.gl.compileShader(fs);
        this.prog = this.gl.createProgram();
        this.gl.attachShader(this.prog, vs);
        this.gl.attachShader(this.prog, fs);
        this.gl.linkProgram(this.prog);
        this.locs = {
            pos: this.gl.getAttribLocation(this.prog, "a_position"), norm: this.gl.getAttribLocation(this.prog, "a_normal"), uv: this.gl.getAttribLocation(this.prog, "a_uv"),
            vp: this.gl.getUniformLocation(this.prog, "u_vp"), model: this.gl.getUniformLocation(this.prog, "u_model"),
            color: this.gl.getUniformLocation(this.prog, "u_color"), specColor: this.gl.getUniformLocation(this.prog, "u_specColor"),
            ambient: this.gl.getUniformLocation(this.prog, "u_ambientColor"), dirColor: this.gl.getUniformLocation(this.prog, "u_dirLightColor"), dirDir: this.gl.getUniformLocation(this.prog, "u_dirLightDir"),
            shininess: this.gl.getUniformLocation(this.prog, "u_shininess"), viewPos: this.gl.getUniformLocation(this.prog, "u_viewPos"),
            numPL: this.gl.getUniformLocation(this.prog, "u_numPointLights"), numSL: this.gl.getUniformLocation(this.prog, "u_numSpotLights"),
            diffuseMap: this.gl.getUniformLocation(this.prog, "u_diffuseMap"),
            texOffset: this.gl.getUniformLocation(this.prog, "u_texOffset"), // <--- NEU
            texRepeat: this.gl.getUniformLocation(this.prog, "u_texRepeat"), // <--- NEU
        };
        for (let i = 0; i < 4; i++) {
            this.pointLightLocs.push({ pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${i}]`), col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${i}]`) });
            this.spotLightLocs.push({ pos: this.gl.getUniformLocation(this.prog, `u_spotLightPos[${i}]`), dir: this.gl.getUniformLocation(this.prog, `u_spotLightDir[${i}]`), col: this.gl.getUniformLocation(this.prog, `u_spotLightColor[${i}]`), params: this.gl.getUniformLocation(this.prog, `u_spotLightParams[${i}]`) });
        }
        this.gl.enable(this.gl.DEPTH_TEST);
    }
    getWebGLTexture(tex) {
        if (!tex.isLoaded || !tex.image)
            return this.defaultTexture;
        let glTex = this.texCache.get(tex);
        if (!glTex) {
            glTex = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, glTex);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.image);
            const glFilterMag = tex.magFilter === TextureFilter.NEAREST ? this.gl.NEAREST : this.gl.LINEAR;
            const glFilterMin = tex.minFilter === TextureFilter.NEAREST ? this.gl.NEAREST : this.gl.LINEAR;
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, glFilterMag);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, glFilterMin);
            const mapWrap = (w) => w === TextureWrap.CLAMP_TO_EDGE ? this.gl.CLAMP_TO_EDGE : (w === TextureWrap.MIRRORED_REPEAT ? this.gl.MIRRORED_REPEAT : this.gl.REPEAT);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, mapWrap(tex.wrapS));
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, mapWrap(tex.wrapT));
            this.texCache.set(tex, glTex);
        }
        return glTex;
    }
    setClearColor(color) { this.gl.clearColor(color.r, color.g, color.b, color.a); }
    render(scene, vp, camPos = new Vector3D()) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.prog);
        if (this.locs.vp)
            this.gl.uniformMatrix4fv(this.locs.vp, false, vp);
        if (this.locs.viewPos)
            this.gl.uniform3f(this.locs.viewPos, camPos.x, camPos.y, camPos.z);
        let aCol = new Color(0, 0, 0), dDir = new Vector3D(0, 1, 0), dCol = new Color(0, 0, 0);
        const pLights = [], sLights = [];
        const extractLights = (node) => {
            if ("lightType" in node) {
                const light = node;
                switch (light.lightType) {
                    case LightType.AMBIENT:
                        aCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity);
                        break;
                    case LightType.DIRECTIONAL: {
                        const dLight = light;
                        dDir = dLight.direction.clone().scale(-1);
                        if (dDir.length() > 0)
                            dDir.scale(1 / dDir.length());
                        dCol = new Color(light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity);
                        break;
                    }
                    case LightType.POINT:
                        if (pLights.length < 4)
                            pLights.push(light);
                        break;
                    case LightType.SPOT:
                        if (sLights.length < 4)
                            sLights.push(light);
                        break;
                }
            }
            if (node.children)
                node.children.forEach(extractLights);
        };
        for (const obj of scene.objects)
            extractLights(obj);
        if (this.locs.ambient)
            this.gl.uniform3f(this.locs.ambient, aCol.r, aCol.g, aCol.b);
        if (this.locs.dirDir)
            this.gl.uniform3f(this.locs.dirDir, dDir.x, dDir.y, dDir.z);
        if (this.locs.dirColor)
            this.gl.uniform3f(this.locs.dirColor, dCol.r, dCol.g, dCol.b);
        if (this.locs.numPL)
            this.gl.uniform1i(this.locs.numPL, pLights.length);
        for (let i = 0; i < pLights.length; i++) {
            const pl = pLights[i];
            if (this.pointLightLocs[i].pos)
                this.gl.uniform3f(this.pointLightLocs[i].pos, pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14]);
            if (this.pointLightLocs[i].col)
                this.gl.uniform3f(this.pointLightLocs[i].col, pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity);
        }
        if (this.locs.numSL)
            this.gl.uniform1i(this.locs.numSL, sLights.length);
        for (let i = 0; i < sLights.length; i++) {
            const sl = sLights[i];
            if (this.spotLightLocs[i].pos)
                this.gl.uniform3f(this.spotLightLocs[i].pos, sl.worldMatrix.data[12], sl.worldMatrix.data[13], sl.worldMatrix.data[14]);
            const dir = sl.direction.clone();
            if (dir.length() > 0)
                dir.scale(1 / dir.length());
            if (this.spotLightLocs[i].dir)
                this.gl.uniform3f(this.spotLightLocs[i].dir, dir.x, dir.y, dir.z);
            if (this.spotLightLocs[i].col)
                this.gl.uniform3f(this.spotLightLocs[i].col, sl.color.r * sl.intensity, sl.color.g * sl.intensity, sl.color.b * sl.intensity);
            if (this.spotLightLocs[i].params)
                this.gl.uniform4f(this.spotLightLocs[i].params, Math.cos(sl.angle), Math.cos(sl.angle * (1.0 - sl.penumbra)), sl.distance, sl.decay);
        }
        for (const o of scene.objects) {
            if (o.isVisible === false || !o.material || !o.geometry)
                continue;
            let m = this.cache.get(o.geometry);
            if (!m) {
                m = new Mesh(this.gl, o.geometry);
                this.cache.set(o.geometry, m);
            }
            m.bind(this.locs.pos, this.locs.norm, this.locs.uv);
            if (this.locs.model)
                this.gl.uniformMatrix4fv(this.locs.model, false, o.worldMatrix.data);
            if (this.locs.color)
                this.gl.uniform4fv(this.locs.color, o.material.color.toArray());
            let shininess = -1.0;
            let specCol = [0, 0, 0, 0];
            let activeTex = this.defaultTexture;
            let tOffset = [0, 0]; // <--- NEU
            let tRepeat = [1, 1]; // <--- NEU
            if (o.material.type === "LambertMaterial") {
                shininess = 0.0;
            }
            else if (o.material.type === "PhongMaterial") {
                const material = o.material;
                shininess = material.shininess || 32;
                specCol = material.specularColor ? material.specularColor.toArray() : [0, 0, 0, 0];
                if (material.diffuseMap) {
                    activeTex = this.getWebGLTexture(material.diffuseMap);
                    tOffset = [material.diffuseMap.offset.x, material.diffuseMap.offset.y]; // <--- NEU
                    tRepeat = [material.diffuseMap.repeat.x, material.diffuseMap.repeat.y]; // <--- NEU
                }
            }
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, activeTex);
            if (this.locs.diffuseMap)
                this.gl.uniform1i(this.locs.diffuseMap, 0);
            // Transform an den Shader senden
            if (this.locs.texOffset)
                this.gl.uniform2fv(this.locs.texOffset, tOffset); // <--- NEU
            if (this.locs.texRepeat)
                this.gl.uniform2fv(this.locs.texRepeat, tRepeat); // <--- NEU
            if (this.locs.shininess)
                this.gl.uniform1f(this.locs.shininess, shininess);
            if (this.locs.specColor)
                this.gl.uniform4fv(this.locs.specColor, specCol);
            const drawMode = o.material.type === "WireframeMaterial" ? this.gl.LINES : this.gl.TRIANGLES;
            this.gl.drawElements(drawMode, m.count, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    setSize(w, h) {
        this.gl.canvas.width = w * devicePixelRatio;
        this.gl.canvas.height = h * devicePixelRatio;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
}
//# sourceMappingURL=WebGL2Renderer.js.map