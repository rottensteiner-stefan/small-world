/// src/loaders/GltfLoader.ts
import { AssetManager, AbstractLoader } from "./index.js";
import { EventType, CullMode } from "../enums/index.js";
import { ModelGeometry } from "../geometry/index.js";
import { Object3D, StandardMaterial, Color, Texture } from "../core/index.js";
import { Matrix4, Vector3D } from "../math/index.js";
/**
 * Loader for glTF 2.0 assets (.gltf and .glb).
 */
export class GltfLoader extends AbstractLoader {
    constructor(options = {}) {
        super(options);
    }
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const isBinary = url.toLowerCase().endsWith(".glb");
            let gltf;
            if (isBinary) {
                gltf = await this._loadBinary(fullUrl);
            }
            else {
                gltf = await this._loadJson(fullUrl);
            }
            const rootObject = await this._parse(gltf, fullUrl);
            this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: rootObject });
            return rootObject;
        }
        catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
            throw error;
        }
    }
    async _loadJson(url) {
        const json = (await AssetManager.loadJson(url));
        const folderPath = url.substring(0, url.lastIndexOf("/") + 1);
        const bufferPromises = (json.buffers || []).map((buf) => {
            if (buf.uri?.startsWith("data:")) {
                return this._decodeBase64(buf.uri);
            }
            return AssetManager.loadBinary(folderPath + (buf.uri || ""));
        });
        const buffers = await Promise.all(bufferPromises);
        return { json, buffers };
    }
    async _loadBinary(url) {
        const arrayBuffer = await AssetManager.loadBinary(url);
        const dataView = new DataView(arrayBuffer);
        // Check Magic: "glTF"
        const magic = dataView.getUint32(0, true);
        if (magic !== 0x46546c67)
            throw new Error("Not a valid .glb file.");
        const version = dataView.getUint32(4, true);
        if (version !== 2)
            throw new Error("Only glTF 2.0 is supported.");
        // Parse Chunks
        let json = null;
        const buffers = [];
        let offset = 12;
        while (offset < arrayBuffer.byteLength) {
            const chunkLength = dataView.getUint32(offset, true);
            const chunkType = dataView.getUint32(offset + 4, true);
            offset += 8;
            if (chunkType === 0x4e4f534a) {
                // JSON
                const jsonContent = new TextDecoder().decode(new Uint8Array(arrayBuffer, offset, chunkLength));
                json = JSON.parse(jsonContent);
            }
            else if (chunkType === 0x004e4942) {
                // BIN
                buffers.push(arrayBuffer.slice(offset, offset + chunkLength));
            }
            offset += chunkLength;
        }
        if (!json)
            throw new Error("No JSON chunk found in .glb file.");
        return { json, buffers };
    }
    _decodeBase64(uri) {
        const base64 = uri.split(",")[1];
        const binaryStr = atob(base64);
        const buffer = new ArrayBuffer(binaryStr.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryStr.length; i++)
            view[i] = binaryStr.charCodeAt(i);
        return buffer;
    }
    async _parse(gltf, baseUrl) {
        const { json, buffers } = gltf;
        const folderPath = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
        // 1. Parse Materials
        const materials = await Promise.all((json.materials || []).map((m) => this._parseMaterial(m, json, folderPath, buffers)));
        // 2. Create Scene Root
        const root = new Object3D("glTF_Root");
        const sceneIdx = json.scene ?? 0;
        const scene = json.scenes ? json.scenes[sceneIdx] : null;
        if (scene && scene.nodes && json.nodes) {
            for (const nodeIdx of scene.nodes) {
                root.add(this._parseNode(json.nodes[nodeIdx], json, buffers, materials));
            }
        }
        return root;
    }
    _parseNode(node, json, buffers, materials) {
        if (!node)
            return new Object3D("EmptyNode");
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
        }
        else {
            if (node.translation)
                obj.position.set(node.translation[0], node.translation[1], node.translation[2]);
            if (node.scale)
                obj.scale.set(node.scale[0], node.scale[1], node.scale[2]);
            if (node.rotation) {
                // glTF uses quaternions [x, y, z, w]
                const q = node.rotation;
                const mat = new Matrix4();
                const x = q[0], y = q[1], z = q[2], w = q[3];
                const x2 = x + x, y2 = y + y, z2 = z + z;
                const xx = x * x2, xy = x * y2, xz = x * z2;
                const yy = y * y2, yz = y * z2, zz = z * z2;
                const wx = w * x2, wy = w * y2, wz = w * z2;
                mat.data[0] = 1 - (yy + zz);
                mat.data[4] = xy - wz;
                mat.data[8] = xz + wy;
                mat.data[1] = xy + wz;
                mat.data[5] = 1 - (xx + zz);
                mat.data[9] = yz - wx;
                mat.data[2] = xz - wy;
                mat.data[6] = yz + wx;
                mat.data[10] = 1 - (xx + yy);
                const dummyP = new Vector3D();
                const dummyS = new Vector3D(1, 1, 1);
                mat.decompose(dummyP, obj.rotation, dummyS);
            }
        }
        // Mesh
        if (node.mesh !== undefined && json.meshes && json.meshes[node.mesh]) {
            const meshDef = json.meshes[node.mesh];
            if (meshDef) {
                for (const primitive of meshDef.primitives) {
                    const child = new Object3D(node.name ? `${node.name}_mesh` : "MeshInstance");
                    const geo = this._parseGeometry(primitive, json, buffers);
                    if (geo) {
                        child.geometry = geo;
                        child.material =
                            primitive.material !== undefined && materials[primitive.material]
                                ? materials[primitive.material]
                                : new StandardMaterial();
                        obj.add(child);
                    }
                }
            }
        }
        // Children
        if (node.children && json.nodes) {
            for (const childIdx of node.children) {
                obj.add(this._parseNode(json.nodes[childIdx], json, buffers, materials));
            }
        }
        return obj;
    }
    _parseGeometry(primitive, json, buffers) {
        const attributes = primitive.attributes;
        if (!attributes || attributes["POSITION"] === undefined || !json.accessors)
            return null;
        const positions = this._getBufferData(json.accessors[attributes["POSITION"]], json, buffers);
        if (!positions)
            return null;
        const normals = attributes["NORMAL"] !== undefined
            ? this._getBufferData(json.accessors[attributes["NORMAL"]], json, buffers)
            : undefined;
        const uvs = attributes["TEXCOORD_0"] !== undefined
            ? this._getBufferData(json.accessors[attributes["TEXCOORD_0"]], json, buffers)
            : undefined;
        const indices = primitive.indices !== undefined
            ? this._getBufferData(json.accessors[primitive.indices], json, buffers)
            : undefined;
        return new ModelGeometry(positions, uvs ? uvs : new Float32Array(0), normals ? normals : new Float32Array(0), indices ? indices : new Uint16Array(0)).getGeometryData();
    }
    _getBufferData(accessor, json, buffers) {
        if (accessor === undefined || accessor.bufferView === undefined || !json.bufferViews)
            return null;
        const bufferView = json.bufferViews[accessor.bufferView];
        if (!bufferView)
            return null;
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
    _getComponentCount(type) {
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
    async _parseMaterial(m, json, folderPath, buffers) {
        const mat = new StandardMaterial();
        const pbr = m.pbrMetallicRoughness || {};
        if (pbr.baseColorFactor) {
            mat.color = new Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2], pbr.baseColorFactor[3]);
        }
        if (pbr.baseColorTexture) {
            const tex = await this._resolveTexture(pbr.baseColorTexture.index, json, folderPath, buffers);
            if (tex)
                mat.diffuseMap = tex;
        }
        if (pbr.metallicRoughnessTexture) {
            const tex = await this._resolveTexture(pbr.metallicRoughnessTexture.index, json, folderPath, buffers);
            if (tex) {
                mat.metallicMap = tex;
                mat.roughnessMap = tex;
            }
        }
        if (m.normalTexture) {
            const tex = await this._resolveTexture(m.normalTexture.index, json, folderPath, buffers);
            if (tex)
                mat.normalMap = tex;
        }
        if (m.emissiveTexture) {
            const tex = await this._resolveTexture(m.emissiveTexture.index, json, folderPath, buffers);
            if (tex)
                mat.emissiveMap = tex;
        }
        if (m.emissiveFactor) {
            mat.emissiveColor = new Color(m.emissiveFactor[0], m.emissiveFactor[1], m.emissiveFactor[2], 1.0);
        }
        mat.metallic = pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1.0;
        mat.roughness = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1.0;
        if (m.alphaMode === "BLEND") {
            mat.transparent = true;
        }
        else if (m.alphaMode === "MASK") {
            mat.transparent = true; // Typically alpha cutoffs require shader support, marking transparent as a fallback.
            mat.alphaTest = m.alphaCutoff !== undefined ? m.alphaCutoff : 0.5;
        }
        if (m.doubleSided) {
            mat.cullMode = CullMode.NONE;
        }
        return mat;
    }
    async _resolveTexture(texIdx, json, folderPath, buffers) {
        if (!json.textures || !json.images)
            return null;
        const textureDef = json.textures[texIdx];
        if (!textureDef || textureDef.source === undefined)
            return null;
        const imageDef = json.images[textureDef.source];
        if (!imageDef)
            return null;
        let url = "";
        let objectUrl = false;
        if (imageDef.uri) {
            if (imageDef.uri.startsWith("data:")) {
                url = imageDef.uri;
            }
            else {
                url = folderPath + imageDef.uri;
            }
        }
        else if (imageDef.bufferView !== undefined && json.bufferViews) {
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
        if (!url)
            return null;
        try {
            const img = await AssetManager.loadImage(url);
            return Texture.fromImage(img);
        }
        finally {
            if (objectUrl)
                URL.revokeObjectURL(url);
        }
    }
}
//# sourceMappingURL=GltfLoader.js.map