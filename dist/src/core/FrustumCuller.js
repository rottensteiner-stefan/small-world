/// src/core/FrustumCuller.ts
import { Frustum } from "../math/Frustum.js";
/**
 * Handles frustum culling for objects in a scene.
 */
export class FrustumCuller {
    static _frustum = new Frustum();
    /** The octree nodes that were intersected during the last cull operation. */
    static lastIntersectedNodes = new Set();
    /** The number of visible objects during the last cull operation. */
    static lastVisibleCount = 0;
    /**
     * Culls objects in the scene that are outside the camera frustum.
     */
    static cull(scene, vpMatrix) {
        this._frustum.setFromMatrix(vpMatrix);
        this.lastIntersectedNodes.clear();
        // Reset culling state for all objects
        for (let i = 0; i < scene.objects.length; i++) {
            this._resetCulling(scene.objects[i]);
        }
        if (scene.staticOctree || scene.dynamicOctree) {
            if (scene.staticOctree) {
                const visibleStatic = scene.staticOctree.query(this._frustum, this.lastIntersectedNodes);
                for (let i = 0; i < visibleStatic.length; i++) {
                    const obj = visibleStatic[i];
                    if (obj.isVisible)
                        obj.inFrustum = true;
                }
            }
            if (scene.dynamicOctree) {
                const visibleDynamic = scene.dynamicOctree.query(this._frustum, this.lastIntersectedNodes);
                for (let i = 0; i < visibleDynamic.length; i++) {
                    const obj = visibleDynamic[i];
                    if (obj.isVisible)
                        obj.inFrustum = true;
                }
            }
            let count = 0;
            for (let i = 0; i < scene.objects.length; i++) {
                count += this._countVisible(scene.objects[i]);
            }
            FrustumCuller.lastVisibleCount = count;
            return count;
        }
        // Fallback without octrees
        let visibleCount = 0;
        for (let i = 0; i < scene.objects.length; i++) {
            visibleCount += this._checkNode(scene.objects[i]);
        }
        FrustumCuller.lastVisibleCount = visibleCount;
        return visibleCount;
    }
    static _resetCulling(obj) {
        obj.inFrustum = !(obj.frustumCulled && obj.bounds);
        for (let i = 0; i < obj.children.length; i++) {
            this._resetCulling(obj.children[i]);
        }
    }
    static _countVisible(obj) {
        let count = obj.isVisible && obj.inFrustum ? 1 : 0;
        for (let i = 0; i < obj.children.length; i++) {
            count += this._countVisible(obj.children[i]);
        }
        return count;
    }
    static _checkNode(obj) {
        if (obj.isVisible && obj.frustumCulled && obj.bounds) {
            obj.inFrustum = this._frustum.intersectsVolume(obj.bounds);
        }
        else {
            obj.inFrustum = true;
        }
        let count = obj.isVisible && obj.inFrustum ? 1 : 0;
        for (let i = 0; i < obj.children.length; i++) {
            count += this._checkNode(obj.children[i]);
        }
        return count;
    }
}
//# sourceMappingURL=FrustumCuller.js.map