export class AssetManager {
    static geometries = new Map();
    static register(id, data) { this.geometries.set(id, data); return data; }
    static get(id) { return this.geometries.get(id); }
}
//# sourceMappingURL=AssetManager.js.map