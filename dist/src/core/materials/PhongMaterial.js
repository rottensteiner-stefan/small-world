/// src/core/materials/PhongMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";
import fragGLSL from "./shaders/Phong.frag.glsl?raw";
import fragGLSL100 from "./shaders/Phong.frag.glsl100?raw";
import fragWGSL from "./shaders/Phong.frag.wgsl?raw";
/**
 * Material that implements the Phong reflection model.
 */
export class PhongMaterial extends AbstractMaterial {
    /** The specular reflection color. */
    specularColor;
    /** The shininess factor. */
    shininess;
    /** The diffuse texture map. */
    diffuseMap;
    /** The normal map texture. */
    normalMap;
    /** The specular map texture. */
    specularMap;
    /**
     * Creates a new PhongMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options = {}) {
        super(MaterialType.PHONG);
        const { color = Color.WHITE, specularColor = Color.WHITE, shininess = 32.0, diffuseMap = undefined, normalMap = undefined, specularMap = undefined, } = options;
        this.color = color;
        this.specularColor = specularColor;
        this.shininess = shininess;
        this.diffuseMap = diffuseMap;
        this.normalMap = normalMap;
        this.specularMap = specularMap;
    }
    /** @inheritdoc */
    getRenderManifest() {
        if (undefined === this._renderManifest) {
            this._renderManifest = {
                shaderId: this.type,
                properties: {
                    u_color: this.color.toFloat32Array(),
                    u_specColor: this.specularColor.toFloat32Array(),
                    u_texOffset: [0, 0],
                    u_texRepeat: [1, 1],
                    u_shininess: this.shininess,
                    u_isTerrain: 0.0,
                    u_metallic: 0.0,
                    u_roughness: 0.5,
                    u_extraParams: [1.0, 0, 0, 0],
                    u_liquidParams: [0, 0, 0, 0],
                    u_thresholds: [0, 0, 0, 0],
                },
                textures: {
                    u_diffuseMap: this.diffuseMap,
                    u_normalMap: this.normalMap,
                    u_specularMap: this.specularMap,
                },
            };
        }
        const props = this._renderManifest.properties;
        const texs = this._renderManifest.textures;
        props["u_color"] = this.color.toFloat32Array();
        props["u_specColor"] = this.specularColor.toFloat32Array();
        props["u_shininess"] = this.shininess;
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
        texs["u_specularMap"] = this.specularMap;
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
                    u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
                    u_normalMap: { type: ShaderPropertyType.TEXTURE },
                    u_specularMap: { type: ShaderPropertyType.TEXTURE },
                },
            },
        };
    }
}
//# sourceMappingURL=PhongMaterial.js.map