export class Scene {
    _children = [];
    add(object) {
        this._children.push(object);
    }
    /**
     * Entfernt ein Objekt aus der Szene.
     * @param object Das zu entfernende Object3D
     */
    remove(object) {
        const index = this._children.indexOf(object);
        if (index !== -1) {
            this._children.splice(index, 1);
        }
    }
    update() {
        for (const child of this._children) {
            child.updateMatrix();
        }
    }
    get children() {
        return this._children;
    }
}
//# sourceMappingURL=Scene.js.map