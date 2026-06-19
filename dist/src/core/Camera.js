/// src/core/Camera.ts
import { MathPool } from "../math/index.js";
import { CameraEffectFactory, CameraStrategyFactory } from "./cameras/index.js";
import { CameraStrategyType } from "../enums/index.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
/**
 * Standard implementation of the CameraInterfaceData.
 */
export class Camera {
    /** @inheritdoc */
    position = new Vector3D(0, 10, 20);
    /** @inheritdoc */
    target = new Vector3D(0, 0, 0);
    /** @inheritdoc */
    up = new Vector3D(0, 1, 0);
    /** @inheritdoc */
    theta = 0;
    /** @inheritdoc */
    phi = 0;
    /** @inheritdoc */
    pendingDx = 0;
    /** @inheritdoc */
    pendingDy = 0;
    /** @inheritdoc */
    behaviors = [];
    _projection;
    _aspect = 1;
    _strategy;
    _effects = [];
    _viewMatrix = new Matrix4();
    _viewProjMatrix = new Matrix4();
    /**
     * Creates a new Camera.
     * @param projection The projection to use.
     */
    constructor(projection) {
        this.projection = projection;
        this.setStrategy(CameraStrategyType.MANUAL);
    }
    /** @inheritdoc */
    get projection() {
        return this._projection;
    }
    /** @inheritdoc */
    set projection(value) {
        this._projection = value;
        this._projection.setAspect(this._aspect);
    }
    /** @inheritdoc */
    get viewProjectionMatrix() {
        return this._viewProjMatrix.data;
    }
    /** @inheritdoc */
    get viewProjectionMatrix4() {
        return this._viewProjMatrix;
    }
    /** @inheritdoc */
    get viewMatrix() {
        return this._viewMatrix.data;
    }
    /** @inheritdoc */
    get viewMatrix4() {
        return this._viewMatrix;
    }
    /** @inheritdoc */
    get aspect() {
        return this._aspect;
    }
    /** @inheritdoc */
    set aspect(value) {
        this._aspect = value;
        this.projection.setAspect(value);
    }
    /** @inheritdoc */
    zoom(delta) {
        // 1. Try to let the strategy handle the zoom (e.g. radius adjustment)
        if (this._strategy.zoom?.(this, delta)) {
            return;
        }
        // 2. Delegate to projection (e.g. FOV or bounds scaling)
        this.projection.zoom(delta);
    }
    /** @inheritdoc */
    updateProjectionMatrix() {
        this.projection.update();
    }
    /** @inheritdoc */
    updateViewMatrix() {
        const finalPos = MathPool.acquireVector().copyFrom(this.position);
        const finalTarget = MathPool.acquireVector().copyFrom(this.target);
        for (const effect of this._effects) {
            finalPos.add(effect.offset);
            finalTarget.add(effect.targetOffset);
        }
        Matrix4.lookAt(finalPos, finalTarget, this.up, this._viewMatrix);
        Matrix4.multiply(this.projection.getMatrix(), this._viewMatrix, this._viewProjMatrix);
        MathPool.releaseVector(finalPos);
        MathPool.releaseVector(finalTarget);
    }
    /** @inheritdoc */
    screenToWorld(screenX, screenY) {
        const invVP = MathPool.acquireMatrix();
        if (false === this._viewProjMatrix.invert(invVP)) {
            MathPool.releaseMatrix(invVP);
            return new Vector3D().copyFrom(this.target);
        }
        // Points in NDC space
        const pNear = MathPool.acquireVector().set(screenX, screenY, -1);
        const pFar = MathPool.acquireVector().set(screenX, screenY, 1);
        // Transform to world space
        invVP.transformVector(pNear);
        invVP.transformVector(pFar);
        const result = new Vector3D();
        const dy = pFar.y - pNear.y;
        if (0.0001 < Math.abs(dy)) {
            const t = -pNear.y / dy;
            // Linear interpolation between pNear and pFar at Y=0
            result.set(pNear.x + (pFar.x - pNear.x) * t, 0, pNear.z + (pFar.z - pNear.z) * t);
        }
        else {
            result.copyFrom(pNear);
            result.y = 0;
        }
        MathPool.releaseMatrix(invVP);
        MathPool.releaseVector(pNear);
        MathPool.releaseVector(pFar);
        return result;
    }
    /** @inheritdoc */
    get strategy() {
        return this._strategy;
    }
    /** @inheritdoc */
    setStrategy(type) {
        const oldConstraints = this._strategy?.constraints;
        this._strategy = CameraStrategyFactory.get(type);
        if (undefined !== oldConstraints) {
            this._strategy.constraints = oldConstraints;
        }
    }
    /** @inheritdoc */
    setConstraints(constraints) {
        if (this._strategy) {
            this._strategy.constraints = constraints;
        }
    }
    addBehavior(behavior) {
        behavior.onAttach(this);
        this.behaviors.push(behavior);
        return this;
    }
    removeBehavior(behavior) {
        const index = this.behaviors.indexOf(behavior);
        if (index !== -1) {
            behavior.onDetach();
            this.behaviors.splice(index, 1);
        }
        return this;
    }
    /** @inheritdoc */
    get activeStrategyType() {
        return this._strategy.type;
    }
    /** @inheritdoc */
    update(targetPos, dx, dy, deltaTime = 0.016) {
        for (let i = 0; i < this.behaviors.length; i++) {
            const b = this.behaviors[i];
            if (b.isActive)
                b.update(deltaTime);
        }
        const totalDx = dx + this.pendingDx;
        const totalDy = dy + this.pendingDy;
        this.pendingDx = 0;
        this.pendingDy = 0;
        if (this._strategy) {
            this._strategy.update(this, targetPos, totalDx, totalDy);
        }
        // Update effects
        for (let i = this._effects.length - 1; 0 <= i; i--) {
            const effect = this._effects[i];
            effect.update(deltaTime);
            if (effect.isFinished) {
                this._effects.splice(i, 1);
            }
        }
        this.updateViewMatrix();
    }
    /**
     * Adds a new effect to the camera.
     * @param effect The effect to add.
     */
    addEffect(effect) {
        this._effects.push(effect);
    }
    /**
     * Creates and adds a new effect by type.
     * @param type The type of effect.
     * @param intensity The intensity.
     * @param duration The duration in seconds.
     */
    applyEffect(type, intensity, duration) {
        this.addEffect(CameraEffectFactory.create(type, intensity, duration));
    }
}
//# sourceMappingURL=Camera.js.map