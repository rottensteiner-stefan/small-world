export class Scene {
    objects = [];
    add(obj) {
        this.objects.push(obj);
    }
    remove(obj) {
        const index = this.objects.indexOf(obj);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }
    update() {
        for (const obj of this.objects) {
            if (obj.updateMatrixWorld) {
                obj.updateMatrixWorld(true);
            }
        }
    }
}
//# sourceMappingURL=Scene.js.map