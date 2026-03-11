import { AssetManager } from "./AssetManager.js";
import { ModelGeometry } from "../geometry/ModelGeometry.js";
import { Loader } from "./Loader.js";
import { EventType } from "../enums/EventType.js";
export class ObjLoader extends Loader {
    async load(url) {
        const fullUrl = this.basePath + url;
        this.dispatchEvent(EventType.LOAD_START, { url: fullUrl });
        try {
            // AssetManager mit Event-Weiterleitung aufrufen
            const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
                this.dispatchEvent(EventType.PROGRESS, { url: fullUrl, loaded, total });
            });
            const geometry = this.parse(text);
            this.dispatchEvent(EventType.LOAD_END, { url: fullUrl, data: geometry });
            return geometry;
        }
        catch (error) {
            this.dispatchEvent(EventType.ERROR, { url: fullUrl, error });
            throw error;
        }
    }
    // Wichtig: 'static' wurde hier entfernt, da es nun zur Instanz gehört
    parse(text) {
        const tempVertices = [];
        const tempUVs = [];
        const tempNormals = [];
        const outVertices = [];
        const outUVs = [];
        const outNormals = [];
        const outIndices = [];
        const vertexCache = new Map();
        let indexCounter = 0;
        const lines = text.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length === 0 || line.startsWith("#"))
                continue;
            const parts = line.split(/\s+/);
            const type = parts[0];
            if (type === "v") {
                tempVertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            }
            else if (type === "vt") {
                tempUVs.push(parseFloat(parts[1]), parseFloat(parts[2]));
            }
            else if (type === "vn") {
                tempNormals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            }
            else if (type === "f") {
                const vertices = parts.slice(1);
                for (let i = 1; i < vertices.length - 1; i++) {
                    const v1 = this.parseFaceVertex(vertices[0], tempVertices, tempUVs, tempNormals, outVertices, outUVs, outNormals, vertexCache, () => indexCounter++);
                    const v2 = this.parseFaceVertex(vertices[i], tempVertices, tempUVs, tempNormals, outVertices, outUVs, outNormals, vertexCache, () => indexCounter++);
                    const v3 = this.parseFaceVertex(vertices[i + 1], tempVertices, tempUVs, tempNormals, outVertices, outUVs, outNormals, vertexCache, () => indexCounter++);
                    outIndices.push(v1, v2, v3);
                }
            }
        }
        return new ModelGeometry(outVertices, outUVs, outNormals, outIndices);
    }
    // Wichtig: Auch hier 'static' entfernt
    parseFaceVertex(faceStr, tempV, tempVT, tempVN, outV, outVT, outVN, cache, getIndex) {
        if (cache.has(faceStr))
            return cache.get(faceStr);
        const parts = faceStr.split("/");
        const vIdx = (parseInt(parts[0]) - 1) * 3;
        outV.push(tempV[vIdx], tempV[vIdx + 1], tempV[vIdx + 2]);
        if (parts.length > 1 && parts[1] !== "") {
            const vtIdx = (parseInt(parts[1]) - 1) * 2;
            outVT.push(tempVT[vtIdx], tempVT[vtIdx + 1]);
        }
        else {
            outVT.push(0, 0);
        }
        if (parts.length > 2) {
            const vnIdx = (parseInt(parts[2]) - 1) * 3;
            outVN.push(tempVN[vnIdx], tempVN[vnIdx + 1], tempVN[vnIdx + 2]);
        }
        const newIndex = getIndex();
        cache.set(faceStr, newIndex);
        return newIndex;
    }
}
//# sourceMappingURL=ObjLoader.js.map