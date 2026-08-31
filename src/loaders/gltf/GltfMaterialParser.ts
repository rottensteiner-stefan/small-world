import { GltfJson } from "./types.js";
import { StandardMaterial } from "../../core/materials/index.js";
import { Color } from "../../core/colors/index.js";
import { Texture } from "../../core/textures/index.js";
import { AssetManager } from "../AssetManager.js";
import { CullMode } from "../../enums/index.js";
import { GltfLoaderOptions } from "../../interfaces/index.js";

/**
 * Parser for glTF PBR materials and textures.
 */
export class GltfMaterialParser {
  /**
   * Applies a clampMetallic/clampRoughness constraint to a PBR factor.
   */
  public static applyClamp(value: number, clamp: number | [number, number] | undefined): number {
    if (undefined === clamp) return value;
    if (Array.isArray(clamp)) return Math.min(Math.max(value, clamp[0]), clamp[1]);
    return Math.min(value, clamp);
  }

  /**
   * Resolves a glTF material definition into a Small World StandardMaterial.
   */
  public static async parseMaterial(
    m: NonNullable<GltfJson["materials"]>[number],
    json: GltfJson,
    folderPath: string,
    buffers: ArrayBuffer[],
    options: GltfLoaderOptions = {},
  ): Promise<StandardMaterial> {
    const mat = new StandardMaterial();
    const pbr = m.pbrMetallicRoughness || {};

    if (pbr.baseColorFactor) {
      mat.color = new Color(
        pbr.baseColorFactor[0]!,
        pbr.baseColorFactor[1]!,
        pbr.baseColorFactor[2]!,
        pbr.baseColorFactor[3]!,
      );
    }

    if (pbr.baseColorTexture) {
      const tex = await this.resolveTexture(pbr.baseColorTexture.index, json, folderPath, buffers);
      if (tex) mat.diffuseMap = tex;
    }

    if (pbr.metallicRoughnessTexture) {
      const tex = await this.resolveTexture(
        pbr.metallicRoughnessTexture.index,
        json,
        folderPath,
        buffers,
      );
      if (tex) {
        mat.metallicMap = tex;
        mat.roughnessMap = tex;
      }
    }

    if (m.normalTexture) {
      const tex = await this.resolveTexture(m.normalTexture.index, json, folderPath, buffers);
      if (tex) mat.normalMap = tex;
    }

    if (m.occlusionTexture) {
      const tex = await this.resolveTexture(m.occlusionTexture.index, json, folderPath, buffers);
      if (tex) {
        mat.aoMap = tex;
        if (m.occlusionTexture.strength !== undefined) {
          mat.ao = m.occlusionTexture.strength;
        }
      }
    }

    if (m.emissiveTexture) {
      const tex = await this.resolveTexture(m.emissiveTexture.index, json, folderPath, buffers);
      if (tex) mat.emissiveMap = tex;
    }

    if (m.emissiveFactor) {
      mat.emissiveColor = new Color(
        m.emissiveFactor[0]!,
        m.emissiveFactor[1]!,
        m.emissiveFactor[2]!,
        1.0,
      );
    }

    if (m.extensions?.KHR_materials_emissive_strength?.emissiveStrength !== undefined) {
      mat.emissiveIntensity = m.extensions.KHR_materials_emissive_strength.emissiveStrength;
    }

    const defaultMetallic = options.defaultMetallic !== undefined ? options.defaultMetallic : 1.0;
    const defaultRoughness =
      options.defaultRoughness !== undefined ? options.defaultRoughness : 1.0;

    let metallic = pbr.metallicFactor !== undefined ? pbr.metallicFactor : defaultMetallic;
    let roughness = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : defaultRoughness;

    metallic = this.applyClamp(metallic, options.clampMetallic);
    roughness = this.applyClamp(roughness, options.clampRoughness);

    mat.metallic = metallic;
    mat.roughness = roughness;

    if (m.alphaMode === "BLEND") {
      mat.transparent = true;
    } else if (m.alphaMode === "MASK") {
      mat.transparent = true;
      mat.alphaTest = m.alphaCutoff !== undefined ? m.alphaCutoff : 0.5;
    }

    if (m.doubleSided) {
      mat.cullMode = CullMode.NONE;
    }

    options.onMaterialParsed?.(mat, m as unknown as Record<string, unknown>);

    return mat;
  }

  /**
   * Resolves a texture index to a Small World Texture instance.
   */
  public static async resolveTexture(
    texIdx: number,
    json: GltfJson,
    folderPath: string,
    buffers: ArrayBuffer[],
  ): Promise<Texture | null> {
    if (!json.textures || !json.images) return null;
    const textureDef = json.textures[texIdx];
    if (!textureDef || textureDef.source === undefined) return null;

    const imageDef = json.images[textureDef.source];
    if (!imageDef) return null;

    let url = "";
    let objectUrl = false;

    if (imageDef.uri) {
      if (imageDef.uri.startsWith("data:")) {
        url = imageDef.uri;
      } else {
        url = folderPath + imageDef.uri;
      }
    } else if (imageDef.bufferView !== undefined && json.bufferViews) {
      const bv = json.bufferViews[imageDef.bufferView];
      if (bv) {
        const buffer = buffers[bv.buffer];
        if (buffer) {
          const byteOffset = bv.byteOffset || 0;
          const chunk = buffer.slice(byteOffset, byteOffset + bv.byteLength);
          const blob = new Blob([chunk], { type: imageDef.mimeType || "image/jpeg" });
          url = URL.createObjectURL(blob);
          objectUrl = true;
        }
      }
    }

    if (!url) return null;

    try {
      const img = await AssetManager.loadImage(url);
      return Texture.fromImage(img);
    } finally {
      if (objectUrl) URL.revokeObjectURL(url);
    }
  }
}
