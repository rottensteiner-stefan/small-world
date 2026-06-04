/// src/core/materials/LiquidMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { ShaderPropertyType } from "../../enums/index.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";
import vertGLSL from "./shaders/Liquid.vert.glsl?raw";
import fragGLSL from "./shaders/Liquid.frag.glsl?raw";
import vertGLSL100 from "./shaders/Liquid.vert.glsl100?raw";
import fragGLSL100 from "./shaders/Liquid.frag.glsl100?raw";
import vertWGSL from "./shaders/Liquid.vert.wgsl?raw";
import fragWGSL from "./shaders/Liquid.frag.wgsl?raw";
/**
 * A highly specialized material for rendering animated liquids like lava or slime.
 */
export class LiquidMaterial extends AbstractMaterial {
    /** The color of the cooled crust or dark parts. */
    crustColor;
    /** The speed of the flow animation. */
    flowSpeed;
    /** The scale of the noise pattern. */
    noiseScale;
    /** The current time/frame for animation. */
    time = 0.0;
    /** The noise texture. */
    noiseMap;
    /** Optional displacement map. */
    displacementMap;
    /** Optional normal map. */
    normalMap;
    /** Optional specular map. */
    specularMap;
    /** Optional ambient map. */
    ambientMap;
    /** Wave frequency. */
    waveFrequency;
    /** Wave amplitude. */
    waveAmplitude;
    /**
     * Creates a new LiquidMaterial.
     * @param options The configuration options.
     * @param type The material type.
     */
    constructor(options = {}, type) {
        super(type);
        const { color = new Color(1.0, 1.0, 1.0), crustColor = new Color(0.1, 0.1, 0.1), flowSpeed = 1.0, noiseScale = 2.0, noiseMap = undefined, displacementMap = undefined, normalMap = undefined, specularMap = undefined, ambientMap = undefined, waveFrequency = 5.0, waveAmplitude = 0.15, } = options;
        this.color = color;
        this.crustColor = crustColor;
        this.flowSpeed = flowSpeed;
        this.noiseScale = noiseScale;
        this.noiseMap = noiseMap;
        this.displacementMap = displacementMap;
        this.normalMap = normalMap;
        this.specularMap = specularMap;
        this.ambientMap = ambientMap;
        this.waveFrequency = waveFrequency;
        this.waveAmplitude = waveAmplitude;
    }
    /** @inheritdoc */
    getRenderManifest() {
        if (undefined === this._renderManifest) {
            this._renderManifest = {
                shaderId: this.type,
                properties: {
                    u_color: this.color.toFloat32Array(),
                    u_specColor: this.crustColor.toFloat32Array(),
                    u_texOffset: [0, 0],
                    u_texRepeat: [1, 1],
                    u_shininess: 32.0,
                    u_isTerrain: 0.0,
                    u_metallic: 0.0,
                    u_roughness: 0.5,
                    u_extraParams: [1.0, this.time, this.flowSpeed, this.noiseScale],
                    u_liquidParams: [this.waveFrequency, this.waveAmplitude, 0, 0],
                    u_thresholds: [0, 0, 0, 0],
                },
                textures: {
                    u_diffuseMap: this.noiseMap,
                },
            };
        }
        const props = this._renderManifest.properties;
        const texs = this._renderManifest.textures;
        props["u_color"] = this.color.toFloat32Array();
        props["u_specColor"] = this.crustColor.toFloat32Array();
        const extra = props["u_extraParams"];
        extra[1] = this.time;
        extra[2] = this.flowSpeed;
        extra[3] = this.noiseScale;
        const liquid = props["u_liquidParams"];
        liquid[0] = this.waveFrequency;
        liquid[1] = this.waveAmplitude;
        texs["u_diffuseMap"] = this.noiseMap;
        if (this.displacementMap)
            texs["u_displacementMap"] = this.displacementMap;
        if (this.normalMap)
            texs["u_normalMap"] = this.normalMap;
        if (this.specularMap)
            texs["u_specularMap"] = this.specularMap;
        if (this.ambientMap)
            texs["u_ambientMap"] = this.ambientMap;
        this._renderManifest.state = {
            ...this._renderManifest.state,
            culling: this.cullMode,
            depthWrite: this.depthWrite,
            depthTest: this.depthTest,
            transparent: this.transparent,
        };
        return this._renderManifest;
    }
    /** @inheritdoc */
    getShaderDefinition() {
        return {
            id: this.type,
            sources: {
                glsl300: {
                    vs: vertGLSL,
                    fs: fragGLSL,
                },
                glsl100: {
                    vs: vertGLSL100,
                    fs: fragGLSL100,
                },
                wgsl: `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}`,
            },
            layout: {
                ...StandardWebGPULayout,
                textures: {
                    u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
                    u_displacementMap: { type: ShaderPropertyType.TEXTURE },
                    u_normalMap: { type: ShaderPropertyType.TEXTURE },
                    u_specularMap: { type: ShaderPropertyType.TEXTURE },
                    u_ambientMap: { type: ShaderPropertyType.TEXTURE },
                },
            },
        };
    }
}
//# sourceMappingURL=LiquidMaterial.js.map