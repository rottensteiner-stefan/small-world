import { AssetManager } from "./AssetManager.js";
import { AbstractLoader } from "./AbstractLoader.js";
import { EventType } from "../enums/index.js";
import { Object3D } from "../core/index.js";
import { Bone, Skeleton, SkinnedMesh, AnimationClip } from "../core/animation/index.js";
import { StandardMaterial } from "../core/materials/index.js";
import { PointLight, PointLightOptions } from "../core/lights/index.js";
import { Color } from "../core/colors/index.js";
import { GltfLoaderOptions } from "../interfaces/index.js";
import { Matrix4, Vector3D, Quaternion } from "../math/index.js";

interface GltfJson {
  buffers?: { uri?: string }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
  accessors?: {
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
  }[];
  meshes?: {
    name?: string;
    primitives: {
      attributes: { [key: string]: number };
      indices?: number;
      material?: number;
    }[];
  }[];
  skins?: {
    inverseBindMatrices?: number;
    skeleton?: number;
    joints: number[];
    name?: string;
  }[];
  animations?: {
    name?: string;
    channels: {
      sampler: number;
      target: {
        node?: number;
        path: "translation" | "rotation" | "scale" | "weights";
      };
    }[];
    samplers: {
      input: number;
      output: number;
      interpolation?: "LINEAR" | "STEP" | "CUBICSPLINE";
    }[];
  }[];
  nodes?: {
    name?: string;
    children?: number[];
    matrix?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: number;
    skin?: number;
    extensions?: {
      KHR_lights_punctual?: { light: number };
      SW_prefab_instance?: { source: string };
      [key: string]: unknown;
    };
  }[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
  /** Root-level `extensions` -- currently only `KHR_lights_punctual`'s light definitions
   * array, referenced by index from individual nodes' own `extensions`. */
  extensions?: {
    KHR_lights_punctual?: {
      lights: {
        type: "point" | "directional" | "spot";
        color?: number[];
        intensity?: number;
        range?: number;
        name?: string;
      }[];
    };
  };
  materials?: {
    pbrMetallicRoughness?: {
      baseColorFactor?: number[];
      baseColorTexture?: { index: number };
      metallicFactor?: number;
      roughnessFactor?: number;
      metallicRoughnessTexture?: { index: number };
    };
    normalTexture?: { index: number; scale?: number };
    occlusionTexture?: { index: number; strength?: number };
    emissiveTexture?: { index: number };
    emissiveFactor?: number[];
    alphaMode?: "OPAQUE" | "MASK" | "BLEND";
    alphaCutoff?: number;
    doubleSided?: boolean;
    extensions?: {
      KHR_materials_emissive_strength?: {
        emissiveStrength?: number;
      };
      [key: string]: unknown;
    };
  }[];
  textures?: { source?: number; sampler?: number }[];
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
}

interface GltfData {
  json: GltfJson;
  buffers: ArrayBuffer[];
}
import {
  GltfJson,
  GltfData,
  GltfBinaryParser,
  GltfMaterialParser,
  GltfAnimationParser,
  GltfGeometryParser,
  GltfSkinParser,
} from "./gltf/index.js";

/**
 * Loader for glTF 2.0 assets (.gltf and .glb).
 */
export class GltfLoader extends AbstractLoader<Object3D> {
  protected _gltfOptions: GltfLoaderOptions;

  constructor(options: GltfLoaderOptions = {}) {
    super(options);
    this._gltfOptions = options;
  }

  public override async load(url: string): Promise<Object3D> {
    const fullUrl: string = this.basePath + url;
    this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });

    try {
      const isBinary = url.toLowerCase().endsWith(".glb");
      let gltf: GltfData;

      if (isBinary) {
        gltf = await this._loadBinary(fullUrl);
      } else {
        gltf = await this._loadJson(fullUrl);
      }

      const rootObject: Object3D = await this._parse(gltf, fullUrl);

      this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: rootObject });
      return rootObject;
    } catch (error: unknown) {
      this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
      throw error;
    }
  }

  private async _loadJson(url: string): Promise<GltfData> {
    const json = (await AssetManager.loadJson(url)) as GltfJson;
    const folderPath = GltfLoader.getFolderPath(url);

    const bufferPromises = (json.buffers || []).map((buf) => {
      if (buf.uri?.startsWith("data:")) {
        return this._decodeBase64(buf.uri);
      }
      return AssetManager.loadBinary(folderPath + (buf.uri || ""));
    });

    const buffers = await Promise.all(bufferPromises);
    return { json, buffers };
  }

  private async _loadBinary(url: string): Promise<GltfData> {
    const arrayBuffer = await AssetManager.loadBinary(url);
    const dataView = new DataView(arrayBuffer);

    // Check Magic: "glTF"
    const magic = dataView.getUint32(0, true);
    if (magic !== 0x46546c67) throw new Error("Not a valid .glb file.");

    const version = dataView.getUint32(4, true);
    if (version !== 2) throw new Error("Only glTF 2.0 is supported.");

    // Parse Chunks
    let json: GltfJson | null = null;
    const buffers: ArrayBuffer[] = [];
    let offset = 12;

    while (offset < arrayBuffer.byteLength) {
      const chunkLength = dataView.getUint32(offset, true);
      const chunkType = dataView.getUint32(offset + 4, true);
      offset += 8;

      if (chunkType === 0x4e4f534a) {
        // JSON
        const jsonContent = new TextDecoder().decode(
          new Uint8Array(arrayBuffer, offset, chunkLength),
        );
        json = JSON.parse(jsonContent) as GltfJson;
      } else if (chunkType === 0x004e4942) {
        // BIN
        buffers.push(arrayBuffer.slice(offset, offset + chunkLength));
      }
      offset += chunkLength;
    }

    if (!json) throw new Error("No JSON chunk found in .glb file.");

    return { json, buffers };
  }

  /** Decodes a `data:...;base64,...` URI into raw bytes -- public/static so callers that parse a
   * glTF JSON document themselves (`ProjectBinding`, rather than `load()`/`_loadJson()`) can
   * decode its embedded buffers before handing the document to `_parse()`. */
  public static decodeDataUri(uri: string): ArrayBuffer {
    const base64 = uri.split(",")[1]!;
    const binaryStr = atob(base64);
    const buffer = new ArrayBuffer(binaryStr.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binaryStr.length; i++) view[i] = binaryStr.charCodeAt(i);
    return buffer;
  }

  /**
   * Loads standalone animation clips from a .glb or .gltf file.
   */
  public async loadAnimations(url: string): Promise<AnimationClip[]> {
    const fullUrl: string = this.basePath + url;
    const isBinary = url.toLowerCase().endsWith(".glb");
    const gltf = isBinary ? await this._loadBinary(fullUrl) : await this._loadJson(fullUrl);
    const root = await this._parse(gltf, fullUrl);
    return root.animations;
  }

  private async _parse(gltf: GltfData, baseUrl: string): Promise<Object3D> {
    const { json, buffers } = gltf;
    const folderPath = GltfLoader.getFolderPath(baseUrl);

    // 1. Parse Materials
    const materials = await Promise.all(
      (json.materials || []).map((m) =>
        GltfMaterialParser.parseMaterial(m, json, folderPath, buffers, this._gltfOptions),
      ),
    );

    // 2. Identify all joint nodes in skins
    const jointNodeIndices = new Set<number>();
    if (json.skins) {
      for (const skin of json.skins) {
        for (const jointIdx of skin.joints) {
          jointNodeIndices.add(jointIdx);
        }
      }
    }

    // 2.5 Identify KHR_lights_punctual point-light nodes
    const pointLightDefs = new Map<
      number,
      { color?: number[]; intensity?: number; range?: number }
    >();
    const punctualLights = json.extensions?.KHR_lights_punctual?.lights;
    if (punctualLights && json.nodes) {
      for (let i = 0; i < json.nodes.length; i++) {
        const lightIdx = json.nodes[i]?.extensions?.KHR_lights_punctual?.light;
        if (lightIdx === undefined) continue;
        const def = punctualLights[lightIdx];
        if (def && "point" === def.type) {
          pointLightDefs.set(i, def);
        }
      }
    }

    // 3. Create node objects (Bone if joint, PointLight if a punctual point light, otherwise Object3D)
    const nodeObjects: Object3D[] = [];
    if (json.nodes) {
      for (let i = 0; i < json.nodes.length; i++) {
        const nodeDef = json.nodes[i];
        if (!nodeDef) continue;
        const rawName = nodeDef.name || `Node_${i}`;
        let name = rawName;
        if (this._gltfOptions.normalizeMixamoRig) {
          name = name.replace(/^mixamorig\d*:/, "mixamorig:");
        }
        if (this._gltfOptions.nodeNameTransform) {
          name = this._gltfOptions.nodeNameTransform(name);
        }
        const lightDef = pointLightDefs.get(i);
        let obj: Object3D;
        if (jointNodeIndices.has(i)) {
          obj = new Bone(name);
        } else if (lightDef) {
          const lightOptions: PointLightOptions = { name };
          if (lightDef.color) {
            lightOptions.color = new Color(
              lightDef.color[0]!,
              lightDef.color[1]!,
              lightDef.color[2]!,
            );
          }
          if (undefined !== lightDef.intensity) lightOptions.intensity = lightDef.intensity;
          if (undefined !== lightDef.range) lightOptions.distance = lightDef.range;
          obj = new PointLight(lightOptions);
        } else {
          obj = new Object3D(name);
        }
        this._applyNodeTransforms(obj, nodeDef);
        const prefabSource = nodeDef.extensions?.SW_prefab_instance?.source;
        if (prefabSource) obj.prefabSource = prefabSource;
        this._gltfOptions.onNodeParsed?.(obj, nodeDef as unknown as Record<string, unknown>);
        nodeObjects[i] = obj;
      }
    }

    // 4. Parse Skeletons
    const skeletons: Skeleton[] = GltfSkinParser.parseSkeletons(json, buffers, nodeObjects);

    // 5. Build Hierarchy and attach Meshes
    if (json.nodes) {
      for (let i = 0; i < json.nodes.length; i++) {
        const nodeDef = json.nodes[i];
        const obj = nodeObjects[i];
        if (!nodeDef || !obj) continue;

        // Attach child nodes
        if (nodeDef.children) {
          for (const childIdx of nodeDef.children) {
            const childObj = nodeObjects[childIdx];
            if (childObj) {
              obj.add(childObj);
            }
          }
        }

        // Attach meshes
        if (nodeDef.mesh !== undefined && json.meshes && json.meshes[nodeDef.mesh]) {
          const meshDef = json.meshes[nodeDef.mesh];
          if (meshDef) {
            for (const primitive of meshDef.primitives) {
              const geo = GltfGeometryParser.parseGeometry(primitive, json, buffers);
              if (geo) {
                const isSkinned =
                  nodeDef.skin !== undefined && skeletons[nodeDef.skin] !== undefined;
                const meshObj = isSkinned
                  ? new SkinnedMesh(nodeDef.name ? `${nodeDef.name}_mesh` : "SkinnedMesh")
                  : new Object3D(nodeDef.name ? `${nodeDef.name}_mesh` : "MeshInstance");

                meshObj.geometry = geo;
                meshObj.material =
                  primitive.material !== undefined && materials[primitive.material]
                    ? materials[primitive.material]!
                    : new StandardMaterial();

                if (isSkinned) {
                  (meshObj as SkinnedMesh).bind(skeletons[nodeDef.skin!]!);
                }
                obj.add(meshObj);
              }
            }
          }
        }
      }
    }

    // 6. Create Scene Root
    const root = new Object3D("glTF_Root");
    const sceneIdx = json.scene ?? 0;
    const scene = json.scenes ? json.scenes[sceneIdx] : null;

    if (scene && scene.nodes) {
      for (const nodeIdx of scene.nodes) {
        const nodeObj = nodeObjects[nodeIdx];
        if (nodeObj) {
          root.add(nodeObj);
        }
      }
    } else if (json.nodes) {
      for (const obj of nodeObjects) {
        if (obj && !obj.parent) {
          root.add(obj);
        }
      }
    }

    // 7. Parse Animations
    if (json.animations && json.accessors) {
      root.animations = GltfAnimationParser.parseAnimations(json, buffers, nodeObjects);
    }

    this._gltfOptions.onParsed?.(root);

    return root;
  }

  private _applyNodeTransforms(obj: Object3D, node: NonNullable<GltfJson["nodes"]>[number]): void {
    if (node.matrix) {
      const mat = new Matrix4();
      mat.data.set(node.matrix);
      const pos = new Vector3D();
      const rot = new Vector3D();
      const sca = new Vector3D(1, 1, 1);
      mat.decompose(pos, rot, sca);
      obj.position.copyFrom(pos);
      obj.rotation.copyFrom(rot);
      obj.scale.copyFrom(sca);
    } else {
      if (node.translation) {
        obj.position.set(node.translation[0]!, node.translation[1]!, node.translation[2]!);
      }
      if (node.scale) {
        obj.scale.set(node.scale[0]!, node.scale[1]!, node.scale[2]!);
      }
      if (node.rotation) {
        const q = node.rotation;
        obj.quaternion = (obj.quaternion || new Quaternion()).set(q[0]!, q[1]!, q[2]!, q[3]!);
      }
    }
  }

  protected async _parseMaterial(
    m: NonNullable<GltfJson["materials"]>[number],
    json: GltfJson,
    folderPath: string,
    buffers: ArrayBuffer[],
  ): Promise<StandardMaterial> {
    return GltfMaterialParser.parseMaterial(m, json, folderPath, buffers, this._gltfOptions);
  }
}
