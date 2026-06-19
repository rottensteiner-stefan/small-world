/// src/core/lights/SpotLight.ts
import { LightType } from "../../enums/index.js";
import { AbstractLight } from "./AbstractLight.js";
import { Vector3D } from "../../math/Vector3D.js";
import { PerspectiveProjection } from "../../math/index.js";
import { Camera } from "../Camera.js";
/**
 * Spotlight that emits light in a cone shape.
 */
export class SpotLight extends AbstractLight {
    /** @inheritdoc */
    type = LightType.SPOT;
    /** The direction of the light. */
    direction;
    /** The maximum distance of the light. */
    distance;
    /** The angle of the light cone in radians. */
    angle;
    /** The penumbra factor (0-1). */
    penumbra;
    /** The decay factor of the light. */
    decay;
    /**
     * Creates a new SpotLight.
     * @param options The configuration options for the light.
     */
    constructor(options = {}) {
        const { direction = new Vector3D(0, -1, 0).normalize(), distance = 50.0, angle = Math.PI / 6, penumbra = 0.5, decay = 2.0, name = "SpotLight", } = options;
        super({ ...options, name });
        this.direction = direction;
        this.distance = distance;
        this.angle = angle;
        this.penumbra = penumbra;
        this.decay = decay;
        if (this.castShadow) {
            this.updateShadowCamera();
        }
    }
    /**
     * Updates the shadow camera's matrices based on the spotlight's properties.
     */
    updateShadowCamera() {
        if (!this.shadowCamera) {
            this.shadowCamera = new Camera(new PerspectiveProjection({
                fov: this.angle * 2.0, // FOV is full angle
                aspect: 1.0, // Shadow map is 1:1 square
                near: 0.1,
                far: this.distance > 0 ? this.distance : 1000.0,
            }));
        }
        else {
            const proj = this.shadowCamera.projection;
            proj.fov = this.angle * 2.0;
            proj.far = this.distance > 0 ? this.distance : 1000.0;
            this.shadowCamera.updateProjectionMatrix();
        }
        // Position camera at light position
        this.shadowCamera.position.set(this.worldMatrix.data[12] ?? this.position.x, this.worldMatrix.data[13] ?? this.position.y, this.worldMatrix.data[14] ?? this.position.z);
        // Target is position + direction
        const target = this.shadowCamera.position.clone().add(this.direction);
        this.shadowCamera.target.copyFrom(target);
        // Default up vector for lights looking straight down
        if (Math.abs(this.direction.y) > 0.99) {
            this.shadowCamera.up.set(0, 0, -1);
        }
        else {
            this.shadowCamera.up.set(0, 1, 0);
        }
        this.shadowCamera.updateViewMatrix();
    }
    /** @inheritdoc */
    applyTo(data) {
        if (4 > data.sLights.length) {
            data.sLights.push(this);
        }
    }
}
//# sourceMappingURL=SpotLight.js.map