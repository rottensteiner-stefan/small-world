/// src/loaders/ObjLoader.ts
import { AssetManager, AbstractLoader, MtlLoader } from "./index.js";
import { EventType } from "../enums/index.js";
import { ModelGeometry } from "../geometry/index.js";
import { Object3D } from "../core/index.js";
import { PhongMaterial } from "../core/index.js";
// Helper class to sort geometry parts by material
class MaterialGroup {
    name;
    outVertices = [];
    outUVs = [];
    outNormals = [];
    outIndices = [];
    vertexCache = new Map();
    indexCounter = 0;
    constructor(name) {
        this.name = name;
    }
}
export class ObjLoader extends AbstractLoader {
    /**
     * Creates a new ObjLoader.
     * @param options Optional configuration options.
     */
    constructor(options = {}) {
        super(options);
    }
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });
        try {
            const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
            });
            // Extract folder path to know where to look for the .mtl file
            const folderPath = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
            const rootObject = await this._parse(text, folderPath);
            this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: rootObject });
            return rootObject;
        }
        catch (error) {
            this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
            throw error;
        }
    }
    async _parse(text, folderPath) {
        const tempVertices = [];
        const tempUVs = [];
        const tempNormals = [];
        let materials = new Map();
        const groups = new Map();
        // Fallback group if no material is defined in the OBJ
        let currentGroup = new MaterialGroup("default");
        groups.set("default", currentGroup);
        let pos = 0;
        while (pos < text.length) {
            let nextNL = text.indexOf("\n", pos);
            if (-1 === nextNL) {
                nextNL = text.length;
            }
            const line = text.substring(pos, nextNL).trim();
            pos = nextNL + 1;
            if (0 === line.length || line.startsWith("#")) {
                continue;
            }
            const parts = line.split(/\s+/);
            if (2 > parts.length) {
                continue;
            }
            const type = parts[0];
            if ("mtllib" === type) {
                const mtlLoader = new MtlLoader({ basePath: folderPath });
                materials = await mtlLoader.load(parts[1]);
            }
            else if ("usemtl" === type) {
                const matName = parts[1];
                if (!groups.has(matName)) {
                    groups.set(matName, new MaterialGroup(matName));
                }
                currentGroup = groups.get(matName);
            }
            else if ("v" === type) {
                // Only take first 3 components, ignore vertex colors if present
                tempVertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            }
            else if ("vt" === type) {
                tempUVs.push(parseFloat(parts[1]), parseFloat(parts[2]));
            }
            else if ("vn" === type) {
                tempNormals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            }
            else if ("f" === type) {
                const v1 = this._parseFaceVertex(parts[1], tempVertices, tempUVs, tempNormals, currentGroup);
                for (let i = 2; i < parts.length - 1; i++) {
                    const v2 = this._parseFaceVertex(parts[i], tempVertices, tempUVs, tempNormals, currentGroup);
                    const v3 = this._parseFaceVertex(parts[i + 1], tempVertices, tempUVs, tempNormals, currentGroup);
                    currentGroup.outIndices.push(v1, v2, v3);
                }
            }
        }
        // Assemble the final scene object
        const root = new Object3D("ModelRoot");
        groups.forEach((group, name) => {
            // Ignore empty groups (e.g. "default" if OBJ starts directly with usemtl)
            if (0 === group.outIndices.length) {
                return;
            }
            const child = new Object3D(name);
            child.geometry = new ModelGeometry(group.outVertices, group.outUVs, group.outNormals, group.outIndices).getGeometryData();
            child.material = materials.get(name) || new PhongMaterial();
            root.add(child);
        });
        return root;
    }
    _parseFaceVertex(faceStr, tempV, tempVT, tempVN, group) {
        if (group.vertexCache.has(faceStr)) {
            return group.vertexCache.get(faceStr);
        }
        const parts = faceStr.split("/");
        // 1. Position (Mandatory)
        const vIdx = (parseInt(parts[0]) - 1) * 3;
        group.outVertices.push(tempV[vIdx], tempV[vIdx + 1], tempV[vIdx + 2]);
        // 2. UV Coordinates (Optional)
        if (parts.length > 1 && parts[1] !== "") {
            const vtIdx = (parseInt(parts[1]) - 1) * 2;
            // Safety check for bounds
            if (vtIdx >= 0 && vtIdx + 1 < tempVT.length) {
                group.outUVs.push(tempVT[vtIdx], tempVT[vtIdx + 1]);
            }
            else {
                group.outUVs.push(0, 0);
            }
        }
        else {
            group.outUVs.push(0, 0);
        }
        // 3. Normals (Optional)
        if (parts.length > 2 && parts[2] !== "") {
            const vnIdx = (parseInt(parts[2]) - 1) * 3;
            if (vnIdx >= 0 && vnIdx + 2 < tempVN.length) {
                group.outNormals.push(tempVN[vnIdx], tempVN[vnIdx + 1], tempVN[vnIdx + 2]);
            }
            else {
                // We will compute normals later if they are missing
            }
        }
        const newIndex = group.indexCounter++;
        group.vertexCache.set(faceStr, newIndex);
        return newIndex;
    }
}
//# sourceMappingURL=ObjLoader.js.map