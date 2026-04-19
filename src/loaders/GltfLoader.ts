/// src/loaders/GltfLoader.ts

import { AssetManager, AbstractLoader } from "./index.js";
import { EventType } from "../enums/index.js";
import { ModelGeometry } from "../geometry/index.js";
import { Object3D, StandardMaterial, Color, Texture } from "../core/index.js";
import { LoaderOptions } from "../interfaces/index.js";
import { Matrix4, Vector3D } from "../math/index.js";

interface GltfData {
  json: any;
  buffers: ArrayBuffer[];
}

/**
 * Loader for glTF 2.0 assets (.gltf and .glb).
 */
export class GltfLoader extends AbstractLoader<Object3D> {
  constructor(options: LoaderOptions = {}) {
    super(options);
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
    const json = await AssetManager.loadJson(url);
    const folderPath = url.substring(0, url.lastIndexOf("/") + 1);
    
    const bufferPromises = (json.buffers || []).map((buf: any) => {
      if (buf.uri.startsWith("data:")) {
        return this._decodeBase64(buf.uri);
      }
      return AssetManager.loadBinary(folderPath + buf.uri);
    });

    const buffers = await Promise.all(bufferPromises);
    return { json, buffers };
  }

  private async _loadBinary(url: string): Promise<GltfData> {
    const arrayBuffer = await AssetManager.loadBinary(url);
    const dataView = new DataView(arrayBuffer);

    // Check Magic: "glTF"
    const magic = dataView.getUint32(0, true);
    if (magic !== 0x46546C67) throw new Error("Not a valid .glb file.");

    const version = dataView.getUint32(4, true);
    if (version !== 2) throw new Error("Only glTF 2.0 is supported.");

    // Parse Chunks
    let json: any = null;
    const buffers: ArrayBuffer[] = [];
    let offset = 12;

    while (offset < arrayBuffer.byteLength) {
      const chunkLength = dataView.getUint32(offset, true);
      const chunkType = dataView.getUint32(offset + 4, true);
      offset += 8;

      if (chunkType === 0x4E4F534A) { // JSON
        const jsonContent = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset, chunkLength));
        json = JSON.parse(jsonContent);
      } else if (chunkType === 0x004E4942) { // BIN
        buffers.push(arrayBuffer.slice(offset, offset + chunkLength));
      }
      offset += chunkLength;
    }

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

  private async _parse(gltf: GltfData, baseUrl: string): Promise<Object3D> {
    const { json, buffers } = gltf;
    const folderPath = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
    
    // 1. Parse Materials
    const materials = await Promise.all((json.materials || []).map((m: any) => this._parseMaterial(m, json, folderPath)));

    // 2. Create Scene Root
    const root = new Object3D("glTF_Root");
    const scene = json.scenes[json.scene || 0];
    
    for (const nodeIdx of scene.nodes) {
        root.add(this._parseNode(json.nodes[nodeIdx], json, buffers, materials));
    }

    return root;
  }

  private _parseNode(node: any, json: any, buffers: ArrayBuffer[], materials: any[]): Object3D {
    const obj = new Object3D(node.name || "Node");

    // Transforms
    if (node.matrix) {
        const mat = new Matrix4();
        mat.data.set(node.matrix);
        // Decompose into position, rotation, scale to keep Object3D state consistent
        const pos = new Vector3D();
        const rot = new Vector3D();
        const sca = new Vector3D(1, 1, 1);
        mat.decompose(pos, rot, sca);
        obj.position.copyFrom(pos);
        obj.rotation.copyFrom(rot);
        obj.scale.copyFrom(sca);
    } else {
        if (node.translation) obj.position.set(node.translation[0], node.translation[1], node.translation[2]);
        if (node.scale) obj.scale.set(node.scale[0], node.scale[1], node.scale[2]);
        if (node.rotation) {
            // glTF uses quaternions [x, y, z, w]
            // For now, we can only correctly decompose if we build a temp matrix
            // This is a simplified approach to handle glTF quaternions
            const q = node.rotation;
            const mat = new Matrix4();
            const x = q[0], y = q[1], z = q[2], w = q[3];
            const x2 = x + x, y2 = y + y, z2 = z + z;
            const xx = x * x2, xy = x * y2, xz = x * z2;
            const yy = y * y2, yz = y * z2, zz = z * z2;
            const wx = w * x2, wy = w * y2, wz = w * z2;

            mat.data[0] = 1 - (yy + zz); mat.data[4] = xy - wz; mat.data[8] = xz + wy;
            mat.data[1] = xy + wz; mat.data[5] = 1 - (xx + zz); mat.data[9] = yz - wx;
            mat.data[2] = xz - wy; mat.data[6] = yz + wx; mat.data[10] = 1 - (xx + yy);
            
            const dummyP = new Vector3D();
            const dummyS = new Vector3D(1, 1, 1);
            mat.decompose(dummyP, obj.rotation, dummyS);
        }
    }

    // Mesh
    if (node.mesh !== undefined) {
        const meshDef = json.meshes[node.mesh];
        for (const primitive of meshDef.primitives) {
            const child = new Object3D(node.name ? `${node.name}_mesh` : "MeshInstance");
            child.geometry = this._parseGeometry(primitive, json, buffers);
            child.material = primitive.material !== undefined ? materials[primitive.material] : new StandardMaterial();
            obj.add(child);
        }
    }

    // Children
    if (node.children) {
        for (const childIdx of node.children) {
            obj.add(this._parseNode(json.nodes[childIdx], json, buffers, materials));
        }
    }

    return obj;
  }

  private _parseGeometry(primitive: any, json: any, buffers: ArrayBuffer[]): any {
    const attributes = primitive.attributes;
    
    const positions = this._getBufferData(json.accessors[attributes.POSITION], json, buffers);
    const normals = attributes.NORMAL !== undefined ? this._getBufferData(json.accessors[attributes.NORMAL], json, buffers) : undefined;
    const uvs = attributes.TEXCOORD_0 !== undefined ? this._getBufferData(json.accessors[attributes.TEXCOORD_0], json, buffers) : undefined;
    const indices = primitive.indices !== undefined ? this._getBufferData(json.accessors[primitive.indices], json, buffers) : undefined;

    return new ModelGeometry(
        Array.from(positions as Float32Array),
        uvs ? Array.from(uvs as Float32Array) : [],
        normals ? Array.from(normals as Float32Array) : [],
        indices ? Array.from(indices as Uint16Array | Uint32Array) : []
    ).getGeometryData();
  }

  private _getBufferData(accessorIdx: any, json: any, buffers: ArrayBuffer[]): TypedArray {
    const accessor = json.accessors[accessorIdx];
    const bufferView = json.bufferViews[accessor.bufferView];
    const buffer = buffers[bufferView.buffer];
    
    if (!buffer) {
        return new Float32Array(0);
    }

    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    
    switch (accessor.componentType) {
        case 5121: return new Uint8Array(buffer, byteOffset, accessor.count * this._getComponentCount(accessor.type));
        case 5123: return new Uint16Array(buffer, byteOffset, accessor.count * this._getComponentCount(accessor.type));
        case 5125: return new Uint32Array(buffer, byteOffset, accessor.count * this._getComponentCount(accessor.type));
        case 5126: return new Float32Array(buffer, byteOffset, accessor.count * this._getComponentCount(accessor.type));
        default: return new Float32Array(0);
    }
  }

  private _getComponentCount(type: string): number {
    switch (type) {
        case "SCALAR": return 1;
        case "VEC2": return 2;
        case "VEC3": return 3;
        case "VEC4": return 4;
        case "MAT4": return 16;
        default: return 1;
    }
  }

  private async _parseMaterial(m: any, json: any, folderPath: string): Promise<StandardMaterial> {
    const mat = new StandardMaterial();
    const pbr = m.pbrMetallicRoughness || {};

    if (pbr.baseColorFactor) {
        mat.color = new Color(pbr.baseColorFactor[0] * 255, pbr.baseColorFactor[1] * 255, pbr.baseColorFactor[2] * 255, pbr.baseColorFactor[3]);
    }

    if (pbr.baseColorTexture) {
        const texIdx = pbr.baseColorTexture.index;
        const textureDef = json.textures[texIdx];
        const imageDef = json.images[textureDef.source];
        const texUrl = folderPath + imageDef.uri;
        mat.diffuseMap = Texture.fromImage(await AssetManager.loadImage(texUrl));
    }

    mat.metallic = pbr.metallicFactor !== undefined ? pbr.metallicFactor : 0.0;
    mat.roughness = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 0.5;

    return mat;
  }
}

type TypedArray = Uint8Array | Uint16Array | Uint32Array | Float32Array;
