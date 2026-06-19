/// src/core/cameras/strategies/HybridSyncStrategy.ts
import { CameraStrategyType } from "../../../enums/index.js";
import { Vector3D } from "../../../math/Vector3D.js";
import { MathUtils } from "../../../math/index.js";
/**
 * A hybrid camera strategy that synchronizes manual position changes
 * with orbital spherical coordinates.
 */
export class HybridSyncStrategy {
    /** @inheritdoc */
    type = CameraStrategyType.HYBRID_SYNC;
    /** @inheritdoc */
    constraints;
    _lastPosition = new Vector3D();
    _isInitialized = false;
    /** @inheritdoc */
    update(camera, targetPos, dx, dy) {
        if (!this._isInitialized) {
            this._lastPosition.copyFrom(camera.position);
            this._syncSphericalFromCartesian(camera);
            this._isInitialized = true;
        }
        // 1. Detect manual position changes (WSAD/QE)
        if (camera.position.x !== this._lastPosition.x ||
            camera.position.y !== this._lastPosition.y ||
            camera.position.z !== this._lastPosition.z) {
            // Position was moved manually -> Sync angles (Theta/Phi) and Radius
            this._syncSphericalFromCartesian(camera);
            this._lastPosition.copyFrom(camera.position);
        }
        // 2. Handle Orbital Rotation (Mouse/OrbitController)
        if (0 !== dx || 0 !== dy) {
            camera.theta -= dx * 0.005;
            camera.phi += dy * 0.005;
            // Limit phi to avoid flipping at poles
            const limit = MathUtils.HALF_PI - 0.01;
            camera.phi = MathUtils.clamp(camera.phi, -limit, limit);
            // Recalculate position from new angles
            this._syncCartesianFromSpherical(camera);
            this._lastPosition.copyFrom(camera.position);
        }
        // 3. Update target
        camera.target.copyFrom(targetPos);
    }
    /**
     * Calculates Theta, Phi, and Radius based on the current Cartesian position.
     */
    _syncSphericalFromCartesian(camera) {
        const relX = camera.position.x - camera.target.x;
        const relY = camera.position.y - camera.target.y;
        const relZ = camera.position.z - camera.target.z;
        const radius = Math.sqrt(relX * relX + relY * relY + relZ * relZ);
        if (radius < 0.0001)
            return;
        camera.theta = Math.atan2(relX, relZ);
        camera.phi = Math.asin(relY / radius);
        // Note: radius isn't stored in CameraInterfaceData,
        // so we'd need a way to persist it if we wanted to zoom via radius.
        // For now, we assume the distance is defined by the position itself.
    }
    /**
     * Updates the Cartesian position based on current Theta, Phi, and distance.
     */
    _syncCartesianFromSpherical(camera) {
        const relX = camera.position.x - camera.target.x;
        const relY = camera.position.y - camera.target.y;
        const relZ = camera.position.z - camera.target.z;
        const radius = Math.sqrt(relX * relX + relY * relY + relZ * relZ);
        camera.position.x = camera.target.x + radius * Math.sin(camera.theta) * Math.cos(camera.phi);
        camera.position.y = camera.target.y + radius * Math.sin(camera.phi);
        camera.position.z = camera.target.z + radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    }
}
//# sourceMappingURL=HybridSyncStrategy.js.map