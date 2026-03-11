import { AssetManager } from "./AssetManager";
import { ModelGeometry } from "../geometry/ModelGeometry";
export class ObjLoader {
    /**
     * Lädt eine .obj Datei und wandelt sie in eine ModelGeometry um.
     */
    static async load(url) {
        const text = await AssetManager.loadText(url);
        return this.parse(text);
    }
    static parse(text) {
        // Temporäre Arrays für die Rohdaten aus der Datei
        const tempVertices = [];
        const tempUVs = [];
        const tempNormals = [];
        // Finale Arrays für unsere Geometry (entfaltet, da WebGL/WebGPU Index-Buffer
        // nur einen Index pro Vertex/UV/Normal-Kombination erlauben)
        const outVertices = [];
        const outUVs = [];
        const outNormals = [];
        const outIndices = [];
        // Hilfs-Map, um doppelte Vertices zu vermeiden (Vertex Caching)
        const vertexCache = new Map();
        let indexCounter = 0;
        const lines = text.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length === 0 || line.startsWith("#"))
                continue; // Kommentare ignorieren
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
                // Ein Face besteht meist aus 3 Eckpunkten (Dreieck) oder 4 (Quad).
                // Wir triangulieren Quads automatisch (0-1-2 und 0-2-3).
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
    /**
     * Zerlegt einen Face-Eintrag (z.B. "1/2/3") und baut den finalen Vertex zusammen.
     */
    static parseFaceVertex(faceStr, tempV, tempVT, tempVN, outV, outVT, outVN, cache, getIndex) {
        // Wenn wir diese exakte Kombination schon mal hatten, gib den gespeicherten Index zurück
        if (cache.has(faceStr)) {
            return cache.get(faceStr);
        }
        const parts = faceStr.split("/");
        // OBJ Indices starten bei 1, daher -1 für 0-basiertes Array
        const vIdx = (parseInt(parts[0]) - 1) * 3;
        outV.push(tempV[vIdx], tempV[vIdx + 1], tempV[vIdx + 2]);
        // Texturkoordinaten (optional)
        if (parts.length > 1 && parts[1] !== "") {
            const vtIdx = (parseInt(parts[1]) - 1) * 2;
            outVT.push(tempVT[vtIdx], tempVT[vtIdx + 1]);
        }
        else {
            outVT.push(0, 0); // Fallback
        }
        // Normalen (optional)
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