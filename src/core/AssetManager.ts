import { GeometryData } from '../interfaces/IGeometry.js';
export class AssetManager {
    private static geometries = new Map<string, GeometryData>();
    public static register(id: string, data: GeometryData): GeometryData { this.geometries.set(id, data); return data; }
    public static get(id: string) { return this.geometries.get(id); }
}
