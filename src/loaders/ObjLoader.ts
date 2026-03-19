/// src/loaders/ObjLoader.ts

import { AssetManager, AbstractLoader, MtlLoader } from "./index.js";
import { EventType } from "../enums/index.js";
import { ModelGeometry } from "../geometry/index.js";
import { Object3D } from "../core/index.js";
import { PhongMaterial } from "../core/materials/index.js";

// Hilfsklasse, um Geometrie-Teile nach Material zu sortieren
class MaterialGroup {
  public outVertices: number[] = [];
  public outUVs: number[] = [];
  public outNormals: number[] = [];
  public outIndices: number[] = [];
  public vertexCache = new Map<string, number>();
  public indexCounter = 0;
  constructor(public name: string) {}
}

export class ObjLoader extends AbstractLoader<Object3D> {
  public async load(url: string): Promise<Object3D> {
    const fullUrl = this.basePath + url;
    this.dispatchEvent(EventType.LOADER_START, { url: fullUrl });

    try {
      const text = await AssetManager.loadText(fullUrl, (loaded, total) => {
        this.dispatchEvent(EventType.LOADER_PROGRESS, { url: fullUrl, loaded, total });
      });

      // Den Ordner-Pfad extrahieren, damit wir wissen, wo wir die .mtl Datei suchen müssen
      const folderPath = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);

      const rootObject = await this.parse(text, folderPath);

      this.dispatchEvent(EventType.LOADER_END, { url: fullUrl, data: rootObject });
      return rootObject;
    } catch (error) {
      this.dispatchEvent(EventType.LOADER_ERROR, { url: fullUrl, error });
      throw error;
    }
  }

  private async parse(text: string, folderPath: string): Promise<Object3D> {
    const tempVertices: number[] = [];
    const tempUVs: number[] = [];
    const tempNormals: number[] = [];

    let materials = new Map<string, PhongMaterial>();
    const groups = new Map<string, MaterialGroup>();

    // Fallback-Gruppe, falls im OBJ kein Material definiert ist
    let currentGroup = new MaterialGroup("default");
    groups.set("default", currentGroup);

    const lines = text.split("\n");

    for (let line of lines) {
      line = line.trim();
      if (line.length === 0 || line.startsWith("#")) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) {
        console.warn('Invalid line in OBJ file: "' + line + '"');
        continue;
      }

      const type = parts[0];

      if (type === "mtllib") {
        const mtlLoader = new MtlLoader();
        materials = await mtlLoader.load(folderPath + parts[1]);
      } else if (type === "usemtl") {
        // Wechsle die aktive Material-Gruppe für alle folgenden Faces
        const matName = parts[1];
        if (!groups.has(matName)) {
          groups.set(matName, new MaterialGroup(matName));
        }
        currentGroup = groups.get(matName)!;
      } else if (type === "v") {
        tempVertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      } else if (type === "vt") {
        tempUVs.push(parseFloat(parts[1]), parseFloat(parts[2]));
      } else if (type === "vn") {
        tempNormals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      } else if (type === "f") {
        const vertices = parts.slice(1);
        for (let i = 1; i < vertices.length - 1; i++) {
          const v1 = this.parseFaceVertex(
            vertices[0],
            tempVertices,
            tempUVs,
            tempNormals,
            currentGroup,
          );
          const v2 = this.parseFaceVertex(
            vertices[i],
            tempVertices,
            tempUVs,
            tempNormals,
            currentGroup,
          );
          const v3 = this.parseFaceVertex(
            vertices[i + 1],
            tempVertices,
            tempUVs,
            tempNormals,
            currentGroup,
          );
          currentGroup.outIndices.push(v1, v2, v3);
        }
      }
    }

    // Baue das finale Szenen-Objekt zusammen
    const root = new Object3D("ModelRoot");

    groups.forEach((group, name) => {
      // Leere Gruppen (z.B. das "default", wenn das OBJ direkt mit usemtl startet) ignorieren
      if (group.outIndices.length === 0) return;

      const child = new Object3D(name);
      child.geometry = new ModelGeometry(
        group.outVertices,
        group.outUVs,
        group.outNormals,
        group.outIndices,
      ).getGeometryData();
      child.material = materials.get(name) || new PhongMaterial();

      root.add(child);
    });

    return root;
  }

  private parseFaceVertex(
    faceStr: string,
    tempV: number[],
    tempVT: number[],
    tempVN: number[],
    group: MaterialGroup,
  ): number {
    if (group.vertexCache.has(faceStr)) return group.vertexCache.get(faceStr)!;

    const parts = faceStr.split("/");
    const vIdx = (parseInt(parts[0]) - 1) * 3;
    group.outVertices.push(tempV[vIdx], tempV[vIdx + 1], tempV[vIdx + 2]);

    if (parts.length > 1 && parts[1] !== "") {
      const vtIdx = (parseInt(parts[1]) - 1) * 2;
      group.outUVs.push(tempVT[vtIdx], tempVT[vtIdx + 1]);
    } else {
      group.outUVs.push(0, 0);
    }

    if (parts.length > 2) {
      const vnIdx = (parseInt(parts[2]) - 1) * 3;
      group.outNormals.push(tempVN[vnIdx], tempVN[vnIdx + 1], tempVN[vnIdx + 2]);
    }

    const newIndex = group.indexCounter++;
    group.vertexCache.set(faceStr, newIndex);
    return newIndex;
  }
}
