export class ConfigLoader {
    static async load(p) {
        const r = await fetch(p);
        return r.json();
    }
}
//# sourceMappingURL=ConfigLoader.js.map