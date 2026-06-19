/// src/core/lights/DirectionalLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { LightType } from "../../enums/index.js";
import { Vector3D } from "../../math/Vector3D.js";
import { Camera } from "../Camera.js";
import { OrthographicProjection } from "../../math/index.js";
import { ProjectionType } from "../../enums/index.js";
import { MathPool } from "../../math/MathPool.js";
/**
 * Directional light that emits light in a specific direction.
 */
export class DirectionalLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.DIRECTIONAL;
    /** The direction of the light. */
    direction;
    /** Number of shadow cascades. */
    numCascades;
    /** Ratio between uniform and logarithmic split. */
    cascadeSplitLambda;
    /** The shadow cameras for each cascade. */
    cascadeCameras = [];
    /** The far depth split distances for each cascade. */
    cascadeSplits = [];
    // Pre-allocated objects to avoid GC pressure during frustum calculations
    _corners = Array.from({ length: 8 }, () => new Vector3D());
    _center = new Vector3D();
    _forward = new Vector3D();
    _right = new Vector3D();
    _up = new Vector3D();
    _nearCenter = new Vector3D();
    _farCenter = new Vector3D();
    _lightPos = new Vector3D();
    _lightUp = new Vector3D();
    /**
     * Creates a new DirectionalLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { direction = new Vector3D(0, -1, 0).normalize(), name = "DirectionalLight", numCascades = 4, cascadeSplitLambda = 0.5, } = options;
        super({ ...options, name });
        this.direction = direction;
        this.numCascades = numCascades;
        this.cascadeSplitLambda = cascadeSplitLambda;
        // Initialize cascade cameras
        for (let i = 0; i < this.numCascades; i++) {
            const ortho = new OrthographicProjection({
                left: -10,
                right: 10,
                bottom: -10,
                top: 10,
                near: 0.1,
                far: 500,
            });
            const cam = new Camera(ortho);
            this.cascadeCameras.push(cam);
            this.cascadeSplits.push(0);
        }
    }
    /**
     * Updates the shadow cascades based on the main camera's frustum.
     * @param cam The main camera interface data.
     */
    updateCascades(cam) {
        if (!this.castShadow || this.numCascades <= 0)
            return;
        if (!cam.projection || cam.projection.type !== ProjectionType.PERSPECTIVE) {
            return;
        }
        const proj = cam.projection;
        const near = proj.near;
        // Limit shadow distance to something reasonable (e.g. 150) so we don't waste shadow resolution on far background
        const shadowMaxDistance = Math.min(proj.far, 150.0);
        const ratio = shadowMaxDistance / near;
        // 1. Calculate cascade split distances (Practical Split Scheme)
        for (let i = 0; i < this.numCascades; i++) {
            const p = (i + 1) / this.numCascades;
            const log = near * Math.pow(ratio, p);
            const uniform = near + (shadowMaxDistance - near) * p;
            this.cascadeSplits[i] =
                log * this.cascadeSplitLambda + uniform * (1.0 - this.cascadeSplitLambda);
        }
        // Determine light up vector to build light view matrix
        this._lightUp.set(0, 1, 0);
        if (Math.abs(this.direction.dot(this._lightUp)) > 0.999) {
            this._lightUp.set(0, 0, 1);
        }
        let cascadeNear = near;
        for (let i = 0; i < this.numCascades; i++) {
            const cascadeFar = this.cascadeSplits[i];
            // 2. Compute bounding boxes for each cascade
            this._updateFrustumCorners(cam, proj, cascadeNear, cascadeFar);
            // Center of this sub-frustum slice
            this._center.set(0, 0, 0);
            for (const c of this._corners) {
                this._center.add(c);
            }
            this._center.scale(1 / 8);
            // Position light camera at the center, pulled backwards along the light direction
            this._lightPos.copyFrom(this._center);
            this._lightPos.x -= this.direction.x * 200; // Pull back 200 units to catch casters behind the camera
            this._lightPos.y -= this.direction.y * 200;
            this._lightPos.z -= this.direction.z * 200;
            const cascadeCam = this.cascadeCameras[i];
            cascadeCam.position.copyFrom(this._lightPos);
            cascadeCam.target.copyFrom(this._center);
            cascadeCam.up.copyFrom(this._lightUp);
            cascadeCam.updateViewMatrix();
            // Transform corners into the light's view space
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            for (const c of this._corners) {
                cascadeCam.viewMatrix4.transformVector(c); // Transform world -> light view space
                if (c.x < minX)
                    minX = c.x;
                if (c.x > maxX)
                    maxX = c.x;
                if (c.y < minY)
                    minY = c.y;
                if (c.y > maxY)
                    maxY = c.y;
                if (c.z < minZ)
                    minZ = c.z;
                if (c.z > maxZ)
                    maxZ = c.z;
            }
            // Update the orthographic projection bounds
            // Add padding to prevent tight clipping
            const padding = 2.0;
            const ortho = cascadeCam.projection;
            ortho.left = minX - padding;
            ortho.right = maxX + padding;
            ortho.bottom = minY - padding;
            ortho.top = maxY + padding;
            // small-world uses right-handed system (looking down -Z)
            // minZ is the most negative (farthest), maxZ is the least negative (nearest)
            ortho.near = -maxZ - 200;
            ortho.far = -minZ + 200;
            ortho.update();
            cascadeCam.updateProjectionMatrix();
            cascadeNear = cascadeFar;
        }
    }
    _updateFrustumCorners(cam, proj, nearDist, farDist) {
        const fov = proj.fov;
        const aspect = proj.aspect;
        const nearHeight = 2 * Math.tan(fov / 2) * nearDist;
        const nearWidth = nearHeight * aspect;
        const farHeight = 2 * Math.tan(fov / 2) * farDist;
        const farWidth = farHeight * aspect;
        // Camera axes
        this._forward.copyFrom(cam.target).sub(cam.position).normalize();
        this._right.copyFrom(this._forward).cross(cam.up).normalize();
        this._up.copyFrom(this._right).cross(this._forward).normalize();
        const tempVec = MathPool.acquireVector();
        tempVec.set(this._forward.x * nearDist, this._forward.y * nearDist, this._forward.z * nearDist);
        this._nearCenter.copyFrom(cam.position).add(tempVec);
        tempVec.set(this._forward.x * farDist, this._forward.y * farDist, this._forward.z * farDist);
        this._farCenter.copyFrom(cam.position).add(tempVec);
        // Near Plane Corners
        this._setCorner(this._corners[0], this._nearCenter, nearHeight, nearWidth, 1, -1);
        this._setCorner(this._corners[1], this._nearCenter, nearHeight, nearWidth, 1, 1);
        this._setCorner(this._corners[2], this._nearCenter, nearHeight, nearWidth, -1, -1);
        this._setCorner(this._corners[3], this._nearCenter, nearHeight, nearWidth, -1, 1);
        // Far Plane Corners
        this._setCorner(this._corners[4], this._farCenter, farHeight, farWidth, 1, -1);
        this._setCorner(this._corners[5], this._farCenter, farHeight, farWidth, 1, 1);
        this._setCorner(this._corners[6], this._farCenter, farHeight, farWidth, -1, -1);
        this._setCorner(this._corners[7], this._farCenter, farHeight, farWidth, -1, 1);
        MathPool.releaseVector(tempVec);
    }
    _setCorner(out, center, h, w, yDir, xDir) {
        out.copyFrom(center);
        const tempVec = MathPool.acquireVector();
        tempVec.set(this._up.x * (h / 2) * yDir, this._up.y * (h / 2) * yDir, this._up.z * (h / 2) * yDir);
        out.add(tempVec);
        tempVec.set(this._right.x * (w / 2) * xDir, this._right.y * (w / 2) * xDir, this._right.z * (w / 2) * xDir);
        out.add(tempVec);
        MathPool.releaseVector(tempVec);
    }
    /** @inheritdoc */
    applyTo(data) {
        data.dDir.set(this.direction.x, this.direction.y, this.direction.z);
        // Invert direction for lighting calculations
        data.dDir.scale(-1).normalize();
        data.dCol.copyFrom(this.color);
        data.dIntensity = this.intensity;
        data.dLight = this;
    }
}
//# sourceMappingURL=DirectionalLight.js.map