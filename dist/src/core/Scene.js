export class Scene {
    children = [];
    add(o) { this.children.push(o); }
    update() { for (const c of this.children)
        c.updateMatrix(); }
}
//# sourceMappingURL=Scene.js.map