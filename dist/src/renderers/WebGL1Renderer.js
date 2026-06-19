/// src/renderers/WebGL1Renderer.ts
import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import { PostProcessPassGL } from "./post/index.js";
import { Color, ShaderRegistry, DeviceCaps, DeviceLimit, } from "../core/index.js";
import { MaterialType, RendererType, TextureFilter, CullMode, BlendingMode, } from "../enums/index.js";
import { Mesh } from "./Mesh.js";
import { Vector3D } from "../math/index.js";
/**
 * WebGL 1.0 implementation of the renderer.
 */
export class WebGL1Renderer extends AbstractWebGLRenderer {
    /** @inheritdoc */
    type = RendererType.WEB_GL1;
    _stateCullFaceEnabled = null;
    _stateCullFaceMode = -1;
    _stateBlendEnabled = null;
    _stateBlendSrc = -1;
    _stateBlendDst = -1;
    _stateDepthMask = null;
    _stateDepthTest = null;
    /** Satisfies Renderer interface */
    get webglContext() {
        return this.gl;
    }
    _programs = new Map();
    _cache = new Map();
    _texCache = new Map();
    _texCubeCache = new Map();
    _scratchTransparentMap = new Map();
    _samplerUnits = {
        u_diffuseMap: 0,
        u_normalMap: 1,
        u_specularMap: 2,
        u_metallicMap: 3,
        u_roughnessMap: 4,
        u_emissiveMap: 5,
        u_alphaMap: 6,
        u_opaqueMap: 7,
        u_envMap: 7,
    };
    _opaqueTexture;
    _opaqueTextureWrapper;
    _hdrFbo = undefined;
    _hdrTexture = undefined;
    _hdrRenderBuffer = undefined;
    _postPassGL = undefined;
    _scratchModelMatrix = new Float32Array(16);
    /** @inheritdoc */
    async initialize(canvas, attributes, config) {
        const gl = canvas.getContext("webgl", attributes) || canvas.getContext("experimental-webgl", attributes);
        if (!gl)
            throw new Error("[WebGL1Renderer] WebGL1 context could not be initialized.");
        this.gl = gl;
        if (config?.quality) {
            this._quality = { ...this._quality, ...config.quality };
        }
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        this.initDefaultTextures();
        this.gl.enable(this.gl.DEPTH_TEST);
    }
    _getProgram(shaderId) {
        let cache = this._programs.get(shaderId);
        if (!cache) {
            const def = ShaderRegistry.instance.get(shaderId);
            if (!def || !def.sources.glsl100) {
                throw new Error(`[WebGL1Renderer] Shader definition for ${shaderId} not found or missing GLSL 100 source.`);
            }
            const vs = ShaderRegistry.instance.assemble(def.sources.glsl100.vs, "glsl100");
            const fs = ShaderRegistry.instance.assemble(def.sources.glsl100.fs, "glsl100");
            const prog = this.createShaderProgram(vs, fs);
            const uniforms = new Map();
            const attributes = new Map();
            ["a_position", "a_normal", "a_uv", "a_tangent"].forEach((name) => {
                attributes.set(name, this.gl.getAttribLocation(prog, name));
            });
            Object.keys(def.layout.uniforms).forEach((name) => {
                const loc = this.gl.getUniformLocation(prog, name);
                if (null === loc &&
                    name !== "u_thresholds" &&
                    name !== "u_liquidParams" &&
                    shaderId !== MaterialType.DEPTH) {
                    console.warn(`[WebGL1Renderer] Uniform '${name}' defined in material layout but not found in shader '${shaderId}'. It might be unused or optimized away.`);
                }
                uniforms.set(name, loc ?? undefined);
            });
            [
                "u_vp",
                "u_model",
                "u_viewPos",
                "u_ambientColor",
                "u_dirLightColor",
                "u_dirLightDir",
                "u_numPointLights",
                "u_numSpotLights",
                "u_numAreaLights",
                "u_color",
                "u_specColor",
                "u_shininess",
                "u_thresholds",
                "u_time",
                "u_flowSpeed",
                "u_noiseScale",
                "u_diffuseMap",
                "u_normalMap",
                "u_specularMap",
                "u_skybox",
                "u_sandMap",
                "u_grassMap",
                "u_rockMap",
                "u_snowMap",
                "u_texOffset",
                "u_texRepeat",
                "u_opaqueMap",
                "u_fogMode",
                "u_fogColor",
                "u_fogDensity",
                "u_fogNear",
                "u_fogFar",
                "u_fogHeight",
                "u_fogHeightFalloff",
            ].forEach((name) => {
                if (!uniforms.has(name)) {
                    uniforms.set(name, this.gl.getUniformLocation(prog, name) ?? undefined);
                }
            });
            const pointLightLocs = [];
            const spotLightLocs = [];
            const areaLightLocs = [];
            for (let i = 0; i < 4; i++) {
                pointLightLocs.push({
                    pos: this.gl.getUniformLocation(prog, `u_pointLightPos[${i}]`) ?? undefined,
                    col: this.gl.getUniformLocation(prog, `u_pointLightColor[${i}]`) ?? undefined,
                    distance: this.gl.getUniformLocation(prog, `u_pointLightDistance[${i}]`) ?? undefined,
                    decay: this.gl.getUniformLocation(prog, `u_pointLightDecay[${i}]`) ?? undefined,
                });
                spotLightLocs.push({
                    pos: this.gl.getUniformLocation(prog, `u_spotLightPos[${i}]`) ?? undefined,
                    dir: this.gl.getUniformLocation(prog, `u_spotLightDir[${i}]`) ?? undefined,
                    col: this.gl.getUniformLocation(prog, `u_spotLightColor[${i}]`) ?? undefined,
                    params: this.gl.getUniformLocation(prog, `u_spotLightParams[${i}]`) ?? undefined,
                });
                areaLightLocs.push({
                    pos: this.gl.getUniformLocation(prog, `u_areaLightPos[${i}]`) ?? undefined,
                    col: this.gl.getUniformLocation(prog, `u_areaLightColor[${i}]`) ?? undefined,
                    right: this.gl.getUniformLocation(prog, `u_areaLightRight[${i}]`) ?? undefined,
                    up: this.gl.getUniformLocation(prog, `u_areaLightUp[${i}]`) ?? undefined,
                    normal: this.gl.getUniformLocation(prog, `u_areaLightNormal[${i}]`) ?? undefined,
                    size: this.gl.getUniformLocation(prog, `u_areaLightSize[${i}]`) ?? undefined,
                });
            }
            cache = { prog, uniforms, attributes, pointLightLocs, spotLightLocs, areaLightLocs };
            this._programs.set(shaderId, cache);
        }
        return cache;
    }
    _getWebGLTexture(tex) {
        if (!tex.isLoaded || !tex.image)
            return this.defaultTexture;
        let glTex = this._texCache.get(tex);
        if (!glTex) {
            glTex = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, glTex);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.image);
            const useMipmaps = this._quality.mipmapping && tex.generateMipmaps;
            if (useMipmaps)
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, TextureFilter.NEAREST === tex.magFilter ? this.gl.NEAREST : this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, useMipmaps ? this.gl.LINEAR_MIPMAP_LINEAR : this.gl.LINEAR);
            this._texCache.set(tex, glTex);
        }
        return glTex;
    }
    _getWebGLCubeTexture(tex) {
        if (!tex.isLoaded || tex.images.length !== 6)
            return this.defaultCubeTexture;
        let glTex = this._texCubeCache.get(tex);
        if (!glTex) {
            glTex = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, glTex);
            for (let i = 0; i < 6; i++) {
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.images[i]);
            }
            this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this._texCubeCache.set(tex, glTex);
        }
        return glTex;
    }
    /** @inheritdoc */
    render(scene, vp, camPos = Vector3D.ZERO, vMat) {
        this._resetStateCache();
        const extractedLights = this.extractLights(scene);
        if (this.postProcessing.enabled && this._hdrFbo) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._hdrFbo);
        }
        else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        const renderList = scene.getVisibleObjectsSorted(vp, camPos);
        // --- PASS 1: Skybox ---
        const skyboxShaderMap = renderList.opaque.get(MaterialType.SKYBOX);
        if (skyboxShaderMap) {
            this.gl.depthMask(false);
            for (const [topology, materialGroups] of skyboxShaderMap.entries()) {
                this._renderGroup(MaterialType.SKYBOX, materialGroups, vp, camPos, {
                    aCol: Color.BLACK,
                    aIntensity: 0,
                    dCol: Color.BLACK,
                    dIntensity: 0,
                    dDir: Vector3D.ZERO,
                    pLights: [],
                    sLights: [],
                    aLights: [],
                }, vMat, topology, scene.fog);
            }
            this.gl.depthMask(true);
            renderList.opaque.delete(MaterialType.SKYBOX);
        }
        // --- PASS 2: Opaque Objects ---
        for (const [shaderId, topologyMap] of renderList.opaque.entries()) {
            for (const [topology, materialGroups] of topologyMap.entries()) {
                this._renderGroup(shaderId, materialGroups, vp, camPos, extractedLights, vMat, topology, scene.fog);
            }
        }
        if (renderList.transparent.length > 0) {
            // Create/Update Opaque Texture
            if (!this._opaqueTexture) {
                const tex = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this._opaqueTexture = tex;
                // Create a dummy Texture wrapper to serve as the key in _texCache
                const dummyTex = { isLoaded: true };
                this._opaqueTextureWrapper = dummyTex;
                // Directly inject into the cache so _getWebGLTexture uses it
                this._texCache.set(dummyTex, tex);
            }
            else {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this._opaqueTexture);
            }
            // Copy current framebuffer to texture
            this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 0, 0, this.gl.canvas.width, this.gl.canvas.height, 0);
            // --- PASS 3: Transparent Objects ---
            for (const obj of renderList.transparent) {
                const manifest = obj.material.getRenderManifest();
                if (obj.material && obj.material.type === MaterialType.GLASS) {
                    manifest.textures["u_opaqueMap"] = this._opaqueTextureWrapper;
                }
                const shaderId = manifest.shaderId;
                const topology = manifest.state?.topology ||
                    obj.geometry?.topology ||
                    (obj.geometry?.indices?.length === 2 ? "line-list" : "triangle-list");
                this._scratchTransparentMap.clear();
                this._scratchTransparentMap.set(obj.material.uuid, [obj]);
                this._renderGroup(shaderId, this._scratchTransparentMap, vp, camPos, extractedLights, vMat, topology, scene.fog);
            }
        }
        // --- PASS 4: Post-Process Blit (HDR -> Canvas) ---
        if (this.postProcessing.enabled && this._hdrTexture && this._postPassGL) {
            this._postPassGL.execute(this.gl, this._hdrTexture, this.postProcessing);
        }
    }
    _renderGroup(shaderId, materialGroups, vp, camPos, lights, vMat, topology = "triangle-list", fog) {
        const cache = this._getProgram(shaderId);
        this.gl.useProgram(cache.prog);
        const u = cache.uniforms;
        // --- Bind Global Uniforms (Once per shader) ---
        const uVp = u.get("u_vp");
        if (uVp)
            this.gl.uniformMatrix4fv(uVp, false, vp);
        const uViewPos = u.get("u_viewPos");
        if (uViewPos)
            this.gl.uniform3f(uViewPos, camPos.x, camPos.y, camPos.z);
        const uAmbientColor = u.get("u_ambientColor");
        if (uAmbientColor)
            this.gl.uniform3f(uAmbientColor, lights.aCol.r * lights.aIntensity, lights.aCol.g * lights.aIntensity, lights.aCol.b * lights.aIntensity);
        const uDirLightColor = u.get("u_dirLightColor");
        if (uDirLightColor)
            this.gl.uniform3f(uDirLightColor, lights.dCol.r * lights.dIntensity, lights.dCol.g * lights.dIntensity, lights.dCol.b * lights.dIntensity);
        const uDirLightDir = u.get("u_dirLightDir");
        if (uDirLightDir)
            this.gl.uniform3f(uDirLightDir, lights.dDir.x, lights.dDir.y, lights.dDir.z);
        // --- Bind Lights ---
        const uNumPointLights = u.get("u_numPointLights");
        if (uNumPointLights)
            this.gl.uniform1i(uNumPointLights, lights.pLights.length);
        for (let i = 0; i < lights.pLights.length; i++) {
            const pl = lights.pLights[i];
            const loc = cache.pointLightLocs[i];
            if (loc?.pos)
                this.gl.uniform3f(loc.pos, pl.worldMatrix.data[12], pl.worldMatrix.data[13], pl.worldMatrix.data[14]);
            if (loc?.col)
                this.gl.uniform3f(loc.col, pl.color.r * pl.intensity, pl.color.g * pl.intensity, pl.color.b * pl.intensity);
            if (loc?.distance)
                this.gl.uniform1f(loc.distance, pl.distance);
            if (loc?.decay)
                this.gl.uniform1f(loc.decay, pl.decay);
        }
        for (const [_, objects] of materialGroups.entries()) {
            const firstObj = objects[0];
            const mat = firstObj.material;
            const manifest = mat.getRenderManifest();
            const texs = manifest.textures;
            // --- Fog Uniforms ---
            if (fog) {
                const modeLoc = u.get("u_fogMode");
                if (modeLoc)
                    this.gl.uniform1i(modeLoc, fog.mode);
                const colLoc = u.get("u_fogColor");
                if (colLoc)
                    this.gl.uniform3f(colLoc, fog.color.r, fog.color.g, fog.color.b);
                const densLoc = u.get("u_fogDensity");
                if (densLoc)
                    this.gl.uniform1f(densLoc, fog.density);
                const nearLoc = u.get("u_fogNear");
                if (nearLoc)
                    this.gl.uniform1f(nearLoc, fog.near);
                const farLoc = u.get("u_fogFar");
                if (farLoc)
                    this.gl.uniform1f(farLoc, fog.far);
                const heightLoc = u.get("u_fogHeight");
                if (heightLoc)
                    this.gl.uniform1f(heightLoc, fog.height);
                const hFalloffLoc = u.get("u_fogHeightFalloff");
                if (hFalloffLoc)
                    this.gl.uniform1f(hFalloffLoc, fog.heightFalloff);
            }
            else {
                const modeLoc = u.get("u_fogMode");
                if (modeLoc)
                    this.gl.uniform1i(modeLoc, 0); // NONE
            }
            // --- 1. Bind Material States ---
            const state = manifest.state;
            const enableCull = !(state && CullMode.NONE === state.culling);
            if (this._stateCullFaceEnabled !== enableCull) {
                if (enableCull)
                    this.gl.enable(this.gl.CULL_FACE);
                else
                    this.gl.disable(this.gl.CULL_FACE);
                this._stateCullFaceEnabled = enableCull;
            }
            if (enableCull) {
                const cullMode = state && CullMode.FRONT === state.culling ? this.gl.FRONT : this.gl.BACK;
                if (this._stateCullFaceMode !== cullMode) {
                    this.gl.cullFace(cullMode);
                    this._stateCullFaceMode = cullMode;
                }
            }
            const enableBlend = !!state?.transparent;
            if (this._stateBlendEnabled !== enableBlend) {
                if (enableBlend)
                    this.gl.enable(this.gl.BLEND);
                else
                    this.gl.disable(this.gl.BLEND);
                this._stateBlendEnabled = enableBlend;
            }
            let depthMask = !enableBlend;
            if (state?.depthWrite === false)
                depthMask = false;
            if (this._stateDepthMask !== depthMask) {
                this.gl.depthMask(depthMask);
                this._stateDepthMask = depthMask;
            }
            if (enableBlend) {
                let src = this.gl.SRC_ALPHA;
                let dst = this.gl.ONE_MINUS_SRC_ALPHA;
                if (state.blending === BlendingMode.ADDITIVE) {
                    src = this.gl.ONE;
                    dst = this.gl.ONE;
                }
                else if (state.blending === BlendingMode.PREMULTIPLIED_ALPHA) {
                    src = this.gl.ONE;
                }
                if (this._stateBlendSrc !== src || this._stateBlendDst !== dst) {
                    this.gl.blendFunc(src, dst);
                    this._stateBlendSrc = src;
                    this._stateBlendDst = dst;
                }
            }
            const enableDepthTest = state?.depthTest !== false;
            if (this._stateDepthTest !== enableDepthTest) {
                if (enableDepthTest)
                    this.gl.enable(this.gl.DEPTH_TEST);
                else
                    this.gl.disable(this.gl.DEPTH_TEST);
                this._stateDepthTest = enableDepthTest;
            }
            // --- 2. Bind Generic Material Properties (Uniforms) ---
            for (const name in manifest.properties) {
                const value = manifest.properties[name];
                const loc = u.get(name);
                if (!loc)
                    continue;
                if (typeof value === "number") {
                    this.gl.uniform1f(loc, value);
                }
                else if (ArrayBuffer.isView(value)) {
                    const v = value;
                    if (v.length === 4)
                        this.gl.uniform4fv(loc, v);
                    else if (v.length === 3)
                        this.gl.uniform3fv(loc, v);
                    else if (v.length === 2)
                        this.gl.uniform2fv(loc, v);
                    else if (v.length === 16)
                        this.gl.uniformMatrix4fv(loc, false, v);
                }
            }
            // --- 3. Bind Textures ---
            if (shaderId === MaterialType.SKYBOX) {
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, null); // Unbind 2D to prevent conflict
                const skyTex = texs["u_skybox"];
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, skyTex ? this._getWebGLCubeTexture(skyTex) : this.defaultCubeTexture);
                const uSkybox = u.get("u_skybox");
                if (uSkybox)
                    this.gl.uniform1i(uSkybox, 0);
            }
            else {
                for (const uniformName in this._samplerUnits) {
                    const unit = this._samplerUnits[uniformName];
                    const loc = u.get(uniformName);
                    if (loc) {
                        const maxUnits = DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS);
                        if (unit >= maxUnits) {
                            console.warn(`[WebGL1Renderer] Exceeded MAX_TEXTURE_IMAGE_UNITS (${maxUnits}). Cannot bind material texture ${uniformName} to unit ${unit}.`);
                        }
                        else {
                            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
                            if (uniformName === "u_envMap") {
                                this.gl.bindTexture(this.gl.TEXTURE_2D, null);
                                const ct = texs[uniformName];
                                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, ct ? this._getWebGLCubeTexture(ct) : this.defaultCubeTexture);
                            }
                            else {
                                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
                                const t = texs[uniformName];
                                this.gl.bindTexture(this.gl.TEXTURE_2D, t
                                    ? this._getWebGLTexture(t)
                                    : uniformName === "u_normalMap"
                                        ? this.defaultNormalMap
                                        : this.defaultTexture);
                            }
                            this.gl.uniform1i(loc, unit);
                        }
                    }
                }
            }
            // --- Render each object ---
            for (const o of objects) {
                if (!o.geometry)
                    continue;
                this._scratchModelMatrix.set(o.worldMatrix.data);
                if (state?.isSprite && vMat) {
                    const sx = Math.sqrt(this._scratchModelMatrix[0] ** 2 +
                        this._scratchModelMatrix[1] ** 2 +
                        this._scratchModelMatrix[2] ** 2);
                    const sy = Math.sqrt(this._scratchModelMatrix[4] ** 2 +
                        this._scratchModelMatrix[5] ** 2 +
                        this._scratchModelMatrix[6] ** 2);
                    const sz = Math.sqrt(this._scratchModelMatrix[8] ** 2 +
                        this._scratchModelMatrix[9] ** 2 +
                        this._scratchModelMatrix[10] ** 2);
                    this._scratchModelMatrix[0] = vMat[0] * sx;
                    this._scratchModelMatrix[1] = vMat[4] * sx;
                    this._scratchModelMatrix[2] = vMat[8] * sx;
                    this._scratchModelMatrix[4] = vMat[1] * sy;
                    this._scratchModelMatrix[5] = vMat[5] * sy;
                    this._scratchModelMatrix[6] = vMat[9] * sy;
                    this._scratchModelMatrix[8] = vMat[2] * sz;
                    this._scratchModelMatrix[9] = vMat[6] * sz;
                    this._scratchModelMatrix[10] = vMat[10] * sz;
                }
                const uModel = u.get("u_model");
                if (uModel)
                    this.gl.uniformMatrix4fv(uModel, false, this._scratchModelMatrix);
                let mesh = this._cache.get(o.geometry);
                if (!mesh) {
                    mesh = new Mesh(this.gl, o.geometry);
                    this._cache.set(o.geometry, mesh);
                }
                mesh.bind(cache.attributes.get("a_position"), cache.attributes.get("a_normal"), cache.attributes.get("a_uv"), cache.attributes.get("a_tangent"));
                mesh.draw(topology === "line-list" ? this.gl.LINES : this.gl.TRIANGLES);
            }
        }
    }
    /** @inheritdoc */
    setSize(width, height) {
        super.setSize(width, height);
        if (this.postProcessing.enabled) {
            if (!this._hdrFbo) {
                this._hdrFbo = this.gl.createFramebuffer();
                this._hdrTexture = this.gl.createTexture();
                this._hdrRenderBuffer = this.gl.createRenderbuffer();
            }
            const w = this.gl.canvas.width;
            const h = this.gl.canvas.height;
            // In WebGL1, floating point textures require extensions.
            // OES_texture_half_float allows HALF_FLOAT_OES.
            // OES_texture_float allows FLOAT.
            // WebGL1 framebuffers may not support rendering to float textures without WEBGL_color_buffer_float / EXT_color_buffer_half_float
            const extHalf = this.gl.getExtension("OES_texture_half_float");
            const extColorHalf = this.gl.getExtension("EXT_color_buffer_half_float");
            const useHalfFloat = extHalf && extColorHalf;
            const type = useHalfFloat ? extHalf.HALF_FLOAT_OES : this.gl.UNSIGNED_BYTE;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._hdrFbo);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this._hdrTexture ?? null);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, w, h, 0, this.gl.RGBA, type, null);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this._hdrTexture ?? null, 0);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this._hdrRenderBuffer ?? null);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_STENCIL, w, h);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, this._hdrRenderBuffer ?? null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this._postPassGL ??= new PostProcessPassGL(this.gl, false);
        }
        else if (this._hdrFbo) {
            this._postPassGL?.destroy(this.gl);
            this.gl.deleteFramebuffer(this._hdrFbo);
            this.gl.deleteTexture(this._hdrTexture);
            this.gl.deleteRenderbuffer(this._hdrRenderBuffer);
            this._hdrFbo = undefined;
            this._hdrTexture = undefined;
            this._hdrRenderBuffer = undefined;
            this._postPassGL = undefined;
        }
    }
    _resetStateCache() {
        this._stateCullFaceEnabled = null;
        this._stateCullFaceMode = -1;
        this._stateBlendEnabled = null;
        this._stateBlendSrc = -1;
        this._stateBlendDst = -1;
        this._stateDepthMask = null;
        this._stateDepthTest = null;
    }
}
//# sourceMappingURL=WebGL1Renderer.js.map