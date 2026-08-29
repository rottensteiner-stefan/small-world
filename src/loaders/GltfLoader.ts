import { AssetManager } from "./AssetManager.js";
import { AbstractLoader } from "./AbstractLoader.js";
import { EventType, CullMode } from "../enums/index.js";
import { ModelGeometry } from "../geometry/index.js";
import { Object3D } from "../core/index.js";
import {
  Bone,
  Skeleton,
  SkinnedMesh,
  AnimationClip,
  KeyframeTrack,
  TrackType,
  InterpolationType,
} from "../core/animation/index.js";
import { StandardMaterial } from "../core/materials/index.js";
import { Color } from "../core/colors/index.js";
import { Texture } from "../core/textures/index.js";
import { GltfLoaderOptions, GeometryDataInterface } from "../interfaces/index.js";
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
  }[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
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

  private _decodeBase64(uri: string): ArrayBuffer {
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
      (json.materials || []).map((m) => this._parseMaterial(m, json, folderPath, buffers)),
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

    // 3. Create node objects (Bone if joint, otherwise Object3D)
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
        const obj = jointNodeIndices.has(i) ? new Bone(name) : new Object3D(name);
        this._applyNodeTransforms(obj, nodeDef);
        nodeObjects[i] = obj;
      }
    }

    // 4. Parse Skeletons
    const skeletons: Skeleton[] = [];
    if (json.skins && json.accessors) {
      for (let i = 0; i < json.skins.length; i++) {
        const skinDef = json.skins[i];
        if (!skinDef) continue;
        const bones: Bone[] = skinDef.joints.map((jIdx) => nodeObjects[jIdx] as Bone);
        let boneInverses: Matrix4[] | undefined = undefined;

        if (skinDef.inverseBindMatrices !== undefined) {
          const invData = this._getBufferData(
            json.accessors[skinDef.inverseBindMatrices],
            json,
            buffers,
          ) as Float32Array | null;
          if (invData) {
            boneInverses = [];
            for (let b = 0; b < bones.length; b++) {
              const m = new Matrix4();
              m.data.set(invData.subarray(b * 16, (b + 1) * 16));
              boneInverses.push(m);
              if (bones[b]) {
                bones[b]!.inverseBindMatrix.data.set(m.data);
              }
            }
          }
        }
        skeletons[i] = new Skeleton(bones, boneInverses);
      }
    }

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
              const geo = this._parseGeometry(primitive, json, buffers);
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
      root.animations = this._parseAnimations(json, buffers, nodeObjects);
    }

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

  private _parseAnimations(
    json: GltfJson,
    buffers: ArrayBuffer[],
    nodeObjects: Object3D[],
  ): AnimationClip[] {
    if (!json.animations || !json.accessors) return [];
    const clips: AnimationClip[] = [];

    for (let a = 0; a < json.animations.length; a++) {
      const animDef = json.animations[a];
      if (!animDef) continue;
      const tracks: KeyframeTrack[] = [];

      for (const channel of animDef.channels) {
        if (channel.target.node === undefined) continue;
        const targetObj = nodeObjects[channel.target.node];
        if (!targetObj) continue;

        const sampler = animDef.samplers[channel.sampler];
        if (!sampler) continue;

        const timeData = this._getBufferData(
          json.accessors[sampler.input],
          json,
          buffers,
        ) as Float32Array | null;
        const valueData = this._getBufferData(
          json.accessors[sampler.output],
          json,
          buffers,
        ) as Float32Array | null;

        if (timeData && valueData) {
          const propPath = channel.target.path;
          if (propPath === "translation" || propPath === "rotation" || propPath === "scale") {
            const track = new KeyframeTrack(
              targetObj.name,
              propPath as TrackType,
              timeData,
              valueData,
              (sampler.interpolation as InterpolationType) || "LINEAR",
            );
            tracks.push(track);
          }
        }
      }

      const clip = new AnimationClip(animDef.name || `Animation_${a}`, -1, tracks);
      clips.push(clip);
    }

    return clips;
  }

  private _parseGeometry(
    primitive: NonNullable<NonNullable<GltfJson["meshes"]>[number]["primitives"]>[number],
    json: GltfJson,
    buffers: ArrayBuffer[],
  ): GeometryDataInterface | null {
    const attributes = primitive.attributes;
    if (!attributes || attributes["POSITION"] === undefined || !json.accessors) return null;

    const positions = this._getBufferData(json.accessors[attributes["POSITION"]], json, buffers);
    if (!positions) return null;

    const normals =
      attributes["NORMAL"] !== undefined
        ? this._getBufferData(json.accessors[attributes["NORMAL"]], json, buffers)
        : undefined;
    const uvs =
      attributes["TEXCOORD_0"] !== undefined
        ? this._getBufferData(json.accessors[attributes["TEXCOORD_0"]], json, buffers)
        : undefined;
    const indices =
      primitive.indices !== undefined
        ? this._getBufferData(json.accessors[primitive.indices], json, buffers)
        : undefined;
    const joints =
      attributes["JOINTS_0"] !== undefined
        ? this._getBufferData(json.accessors[attributes["JOINTS_0"]], json, buffers)
        : undefined;
    const weights =
      attributes["WEIGHTS_0"] !== undefined
        ? this._getBufferData(json.accessors[attributes["WEIGHTS_0"]], json, buffers)
        : undefined;

    return new ModelGeometry(
      positions as Float32Array,
      uvs ? (uvs as Float32Array) : new Float32Array(0),
      normals ? (normals as Float32Array) : new Float32Array(0),
      indices ? (indices as Uint16Array | Uint32Array) : new Uint16Array(0),
      joints || weights
        ? {
            joints: joints ? (joints as Float32Array | Uint16Array) : undefined,
            weights: weights ? (weights as Float32Array) : undefined,
          }
        : undefined,
    ).getGeometryData();
  }

  private _getBufferData(
    accessor: NonNullable<GltfJson["accessors"]>[number] | undefined,
    json: GltfJson,
    buffers: ArrayBuffer[],
  ): TypedArray | null {
    if (accessor === undefined || accessor.bufferView === undefined || !json.bufferViews)
      return null;
    const bufferView = json.bufferViews[accessor.bufferView];
    if (!bufferView) return null;
    const buffer = buffers[bufferView.buffer];

    if (!buffer) {
      return null;
    }

    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const count = accessor.count * this._getComponentCount(accessor.type);

    switch (accessor.componentType) {
      case 5121:
        return new Uint8Array(buffer, byteOffset, count);
      case 5123:
        return new Uint16Array(buffer, byteOffset, count);
      case 5125:
        return new Uint32Array(buffer, byteOffset, count);
      case 5126:
        return new Float32Array(buffer, byteOffset, count);
      default:
        return null;
    }
  }

  private _getComponentCount(type: string): number {
    switch (type) {
      case "SCALAR":
        return 1;
      case "VEC2":
        return 2;
      case "VEC3":
        return 3;
      case "VEC4":
        return 4;
      case "MAT4":
        return 16;
      default:
        return 1;
    }
  }

  private async _parseMaterial(
    m: NonNullable<GltfJson["materials"]>[number],
    json: GltfJson,
    folderPath: string,
    buffers: ArrayBuffer[],
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
      const tex = await this._resolveTexture(pbr.baseColorTexture.index, json, folderPath, buffers);
      if (tex) mat.diffuseMap = tex;
    }

    if (pbr.metallicRoughnessTexture) {
      const tex = await this._resolveTexture(
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
      const tex = await this._resolveTexture(m.normalTexture.index, json, folderPath, buffers);
      if (tex) mat.normalMap = tex;
    }

    if (m.occlusionTexture) {
      const tex = await this._resolveTexture(m.occlusionTexture.index, json, folderPath, buffers);
      if (tex) {
        mat.aoMap = tex;
        if (m.occlusionTexture.strength !== undefined) {
          mat.ao = m.occlusionTexture.strength;
        }
      }
    }

    if (m.emissiveTexture) {
      const tex = await this._resolveTexture(m.emissiveTexture.index, json, folderPath, buffers);
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

    const defaultMetallic =
      this._gltfOptions.defaultMetallic !== undefined ? this._gltfOptions.defaultMetallic : 1.0;
    const defaultRoughness =
      this._gltfOptions.defaultRoughness !== undefined ? this._gltfOptions.defaultRoughness : 1.0;

    let metallic = pbr.metallicFactor !== undefined ? pbr.metallicFactor : defaultMetallic;
    let roughness = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : defaultRoughness;

    if (this._gltfOptions.clampMetallic !== undefined) {
      if (Array.isArray(this._gltfOptions.clampMetallic)) {
        metallic = Math.min(
          Math.max(metallic, this._gltfOptions.clampMetallic[0]),
          this._gltfOptions.clampMetallic[1],
        );
      } else {
        metallic = Math.min(metallic, this._gltfOptions.clampMetallic);
      }
    }

    if (this._gltfOptions.clampRoughness !== undefined) {
      if (Array.isArray(this._gltfOptions.clampRoughness)) {
        roughness = Math.min(
          Math.max(roughness, this._gltfOptions.clampRoughness[0]),
          this._gltfOptions.clampRoughness[1],
        );
      } else {
        roughness = Math.min(roughness, this._gltfOptions.clampRoughness);
      }
    }

    mat.metallic = metallic;
    mat.roughness = roughness;

    if (m.alphaMode === "BLEND") {
      mat.transparent = true;
    } else if (m.alphaMode === "MASK") {
      mat.transparent = true; // Typically alpha cutoffs require shader support, marking transparent as a fallback.
      mat.alphaTest = m.alphaCutoff !== undefined ? m.alphaCutoff : 0.5;
    }

    if (m.doubleSided) {
      mat.cullMode = CullMode.NONE;
    }

    return mat;
  }

  private async _resolveTexture(
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

type TypedArray = Uint8Array | Uint16Array | Uint32Array | Float32Array;
