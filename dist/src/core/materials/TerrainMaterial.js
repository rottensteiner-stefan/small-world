import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../colors/Color.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";
import fragGLSL from "./shaders/Terrain.frag.glsl?raw";
import fragGLSL100 from "./shaders/Terrain.frag.glsl100?raw";
import fragWGSL from "./shaders/Terrain.frag.wgsl?raw";
/**
 * Material specifically for terrain rendering with splatmapping.
 */
export class TerrainMaterial extends AbstractMaterial {
    /** The shininess factor. */
    shininess;
    /** Sand biome texture map. */
    sandMap;
    /** Grass biome texture map. */
    grassMap;
    /** Rock biome texture map. */
    rockMap;
    /** Snow biome texture map. */
    snowMap;
    /** Texture repetition factors. */
    texRepeat;
    /** Thresholds for biome transitions: [SandToGrass, GrassToRock, RockToSnow, TransitionSoftness]. */
    thresholds;
    /**
     * Creates a new TerrainMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options = {}) {
        super(MaterialType.TERRAIN);
        const { color = Color.WHITE, shininess = 10, sandMap = undefined, grassMap = undefined, rockMap = undefined, snowMap = undefined, texRepeat = [20.0, 20.0], thresholds = [2.0, 15.0, 25.0, 2.0], } = options;
        this.color = color;
        this.shininess = shininess;
        this.sandMap = sandMap;
        this.grassMap = grassMap;
        this.rockMap = rockMap;
        this.snowMap = snowMap;
        this.texRepeat = texRepeat;
        this.thresholds = thresholds;
    }
    /** @inheritdoc */
    getRenderManifest() {
        if (undefined === this._renderManifest) {
            this._renderManifest = {
                shaderId: this.type,
                properties: {
                    u_color: this.color.toFloat32Array(),
                    u_specColor: new Float32Array([1, 1, 1, 1]),
                    u_texOffset: [0, 0],
                    u_texRepeat: this.texRepeat,
                    u_shininess: this.shininess,
                    u_isTerrain: 1.0,
                    u_metallic: 0.0,
                    u_roughness: 0.5,
                    u_extraParams: [1.0, 0, 1.0, 1.0], // ao, time, flow, noise
                    u_liquidParams: [0, 0, 0, 0],
                    u_thresholds: this.thresholds,
                },
                textures: {
                    u_sandMap: this.sandMap,
                    u_grassMap: this.grassMap,
                    u_rockMap: this.rockMap,
                    u_snowMap: this.snowMap,
                },
            };
        }
        const props = this._renderManifest.properties;
        const texs = this._renderManifest.textures;
        props["u_color"] = this.color.toFloat32Array();
        props["u_shininess"] = this.shininess;
        props["u_texRepeat"] = this.texRepeat;
        props["u_thresholds"] = new Float32Array(this.thresholds);
        texs["u_sandMap"] = this.sandMap;
        texs["u_grassMap"] = this.grassMap;
        texs["u_rockMap"] = this.rockMap;
        texs["u_snowMap"] = this.snowMap;
        this._renderManifest.state = {
            ...this._renderManifest.state,
            culling: this.cullMode,
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
                    u_sandMap: { type: ShaderPropertyType.TEXTURE },
                    u_grassMap: { type: ShaderPropertyType.TEXTURE },
                    u_rockMap: { type: ShaderPropertyType.TEXTURE },
                    u_snowMap: { type: ShaderPropertyType.TEXTURE },
                },
            },
        };
    }
}
//# sourceMappingURL=TerrainMaterial.js.map