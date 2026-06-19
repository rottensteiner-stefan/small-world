import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType, BlendingMode } from "../../enums/index.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";
import fragGLSL from "./shaders/Standard.frag.glsl?raw";
import fragGLSL100 from "./shaders/Standard.frag.glsl100?raw";
import fragWGSL from "./shaders/Standard.frag.wgsl?raw";
import { Vector2D } from "../../math/index.js";
/**
 * A physically based rendering (PBR) material using the Metallic-Roughness workflow.
 */
export class StandardMaterial extends AbstractMaterial {
    /** Metallic factor (0 to 1). */
    metallic;
    /** Roughness factor (0 to 1). */
    roughness;
    /** Ambient occlusion factor (0 to 1). */
    ao;
    /** The diffuse texture map. */
    diffuseMap;
    /** The normal map texture. */
    normalMap;
    /** Scale factor for the normal map to control strength and flip X/Y. */
    normalScale;
    /** The metallic map texture. */
    metallicMap;
    /** The roughness map texture. */
    roughnessMap;
    /** The emissive color. */
    emissiveColor;
    /** The emissive map texture. */
    emissiveMap;
    /** The alpha mask texture map. */
    alphaMap;
    /** The environment map for reflections. */
    envMap;
    /** The intensity of the emissive glow. */
    emissiveIntensity;
    /** Alpha cutoff threshold. */
    alphaTest;
    /**
     * Creates a new StandardMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options = {}) {
        super(MaterialType.STANDARD);
        const { color = Color.WHITE, metallic = 0.0, roughness = 0.5, ao = 1.0, diffuseMap = undefined, normalMap = undefined, normalScale = new Vector2D(1, 1), metallicMap = undefined, roughnessMap = undefined, emissiveColor = new Color(0, 0, 0), emissiveMap = undefined, alphaMap = undefined, envMap = undefined, emissiveIntensity = 1.0, transparent = false, alphaTest = 0.0, } = options;
        this.color = color;
        this.metallic = metallic;
        this.roughness = roughness;
        this.ao = ao;
        this.diffuseMap = diffuseMap;
        this.normalMap = normalMap;
        this.normalScale = normalScale;
        this.metallicMap = metallicMap;
        this.roughnessMap = roughnessMap;
        this.emissiveColor = emissiveColor;
        this.emissiveMap = emissiveMap;
        this.alphaMap = alphaMap;
        this.envMap = envMap;
        this.emissiveIntensity = emissiveIntensity;
        this.transparent = transparent;
        this.alphaTest = alphaTest;
    }
    /** @inheritdoc */
    getRenderManifest() {
        if (undefined === this._renderManifest) {
            this._renderManifest = {
                shaderId: this.type,
                properties: {
                    u_color: this.color.toFloat32Array(),
                    u_specColor: new Float32Array([
                        this.emissiveColor.r,
                        this.emissiveColor.g,
                        this.emissiveColor.b,
                        this.emissiveIntensity,
                    ]),
                    u_metallic: this.metallic,
                    u_roughness: this.roughness,
                    u_extraParams: [this.ao, this.alphaTest, this.normalScale.x, this.normalScale.y], // ao, alphaTest, normalScaleX, normalScaleY
                    u_liquidParams: [0, 0, 0, 0],
                    u_thresholds: [0, 0, 0, 0],
                    u_texOffset: [0, 0],
                    u_texRepeat: [1, 1],
                    u_shininess: 32.0,
                    u_isTerrain: 0.0,
                    u_useEnvMap: this.envMap ? 1.0 : 0.0,
                },
                textures: {
                    u_diffuseMap: this.diffuseMap,
                    u_normalMap: this.normalMap,
                    u_metallicMap: this.metallicMap,
                    u_roughnessMap: this.roughnessMap,
                    u_emissiveMap: this.emissiveMap,
                    u_alphaMap: this.alphaMap,
                    u_envMap: this.envMap,
                },
            };
        }
        const props = this._renderManifest.properties;
        const texs = this._renderManifest.textures;
        props["u_color"] = this.color.toFloat32Array();
        props["u_specColor"][0] = this.emissiveColor.r;
        props["u_specColor"][1] = this.emissiveColor.g;
        props["u_specColor"][2] = this.emissiveColor.b;
        props["u_specColor"][3] = this.emissiveIntensity;
        props["u_metallic"] = this.metallic;
        props["u_roughness"] = this.roughness;
        props["u_extraParams"][0] = this.ao;
        props["u_extraParams"][1] = this.alphaTest;
        props["u_extraParams"][2] = this.normalScale.x;
        props["u_extraParams"][3] = this.normalScale.y;
        if (this.diffuseMap) {
            props["u_texOffset"][0] = this.diffuseMap.offset.x;
            props["u_texOffset"][1] = this.diffuseMap.offset.y;
            props["u_texRepeat"][0] = this.diffuseMap.repeat.x;
            props["u_texRepeat"][1] = this.diffuseMap.repeat.y;
        }
        else {
            props["u_texOffset"][0] = 0;
            props["u_texOffset"][1] = 0;
            props["u_texRepeat"][0] = 1;
            props["u_texRepeat"][1] = 1;
        }
        texs["u_diffuseMap"] = this.diffuseMap;
        texs["u_normalMap"] = this.normalMap;
        texs["u_metallicMap"] = this.metallicMap;
        texs["u_roughnessMap"] = this.roughnessMap;
        texs["u_emissiveMap"] = this.emissiveMap;
        texs["u_alphaMap"] = this.alphaMap;
        texs["u_envMap"] = this.envMap;
        props["u_useEnvMap"] = this.envMap ? 1.0 : 0.0;
        this._renderManifest.state = {
            ...this._renderManifest.state,
            culling: this.cullMode,
            transparent: this.transparent,
            blending: this.transparent ? BlendingMode.ALPHA : BlendingMode.OPAQUE,
            depthWrite: !this.transparent,
        };
        return this._renderManifest;
    }
    /** @inheritdoc */
    getShaderDefinition() {
        return {
            id: this.type,
            sources: {
                glsl300: {
                    vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
                    fs: fragGLSL,
                },
                glsl100: {
                    vs: "[BASE_VS]",
                    fs: fragGLSL100,
                },
                wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n[WGSL_VS]\n${fragWGSL}`,
            },
            layout: {
                ...StandardWebGPULayout,
                textures: {
                    u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
                    u_normalMap: { type: ShaderPropertyType.TEXTURE },
                    u_metallicMap: { type: ShaderPropertyType.TEXTURE },
                    u_roughnessMap: { type: ShaderPropertyType.TEXTURE },
                    u_emissiveMap: { type: ShaderPropertyType.TEXTURE },
                    u_alphaMap: { type: ShaderPropertyType.TEXTURE },
                },
            },
        };
    }
}
//# sourceMappingURL=StandardMaterial.js.map