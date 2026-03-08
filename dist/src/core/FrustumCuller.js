import { Frustum } from "../math/Frustum.js";
export class FrustumCuller {
    static frustum = new Frustum();
    static cull(scene, vpMatrix) {
        this.frustum.setFromMatrix(vpMatrix);
        let visibleCount = 0;
        const checkNode = (obj) => {
            if (obj.frustumCulled && obj.bounds) {
                obj.isVisible = this.frustum.intersectsVolume(obj.bounds);
            }
            else {
                obj.isVisible = true;
            }
            if (obj.isVisible)
                visibleCount++;
            for (const child of obj.children) {
                checkNode(child);
            }
        };
        for (const obj of scene.objects) {
            checkNode(obj);
        }
        return visibleCount;
    }
}
//# sourceMappingURL=FrustumCuller.js.map