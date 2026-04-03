/// examples/example7.ts

import {
    AmbientLight,
    CameraStrategyType,
    Color,
    Cube,
    CubeTexture,
    DirectionalLight,
    Input,
    Keys,
    MathUtils,
    Object3D,
    PerspectiveProjection,
    PhongMaterial,
    Plane,
    SkyboxMaterial,
} from "../src/index.js";
import {AbstractExample} from "../src/core/example/AbstractExample.js";

/**
 * Example 7: Clean rebuild with Skybox, Green Floor, WASD/QE movement.
 */
export class Example7 extends AbstractExample {
    private _moveSpeed: number = 15.0;
    private _eyeHeight: number = 2.0;

    constructor() {
        super({canvasId: "SmallWorld"});
    }

    protected override onCanvasRecreated(): void {
        super.onCanvasRecreated();
        this.canvas.addEventListener("click", (): void => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
    }

    protected override async setupScene(): Promise<void> {
        this.onCanvasRecreated();

        // 1. Camera
        const aspect: number = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: MathUtils.degToRad(75),
            aspect,
            near: 0.1,
            far: 2000, // Make sure far plane is large enough for the skybox
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.FPS);
        this.camera.position.set(0, this._eyeHeight, 0);

        // 2. Lighting
        this.scene.add(new AmbientLight({color: Color.WHITE, intensity: 0.5}));
        const sun = new DirectionalLight({color: Color.WHITE, intensity: 0.8});
        sun.direction.set(-1, -1, -1).normalize();
        this.scene.add(sun);

        // 3. Skybox
        const skyTexture = new CubeTexture();
        await skyTexture.loadFrom("/resources/models/textures/skybox.jpg");

        const skybox = new Object3D("Skybox");
        skybox.geometry = new Cube({size: 1000}).getGeometryData();
        skybox.material = new SkyboxMaterial({cubeMap: skyTexture});
        skybox.frustumCulled = false;
        this.scene.add(skybox);

        // 4. Floor
        const floor = new Object3D("Floor");
        floor.geometry = new Plane({
            width: 2000,
            depth: 2000,
            widthSegments: 10,
            depthSegments: 10,
        }).getGeometryData();

        floor.material = new PhongMaterial({
            color: new Color(0.2, 0.8, 0.2), // Bright grass green
            shininess: 0,
        });
        floor.rotation.x = -MathUtils.HALF_PI;
        this.scene.add(floor);
    }

    protected override update(deltaTime: number): void {
        // 1. Process rotation from mouse
        let dx = 0;
        let dy = 0;
        if (Input.isPointerLocked) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;

        // Wir updaten die Kamera einmal vorab, damit die Rotation (theta) für den Bewegungsvektor aktuell ist.
        // In FPSStrategy ignoriert die Kamera targetPos, wenn es === camera.target ist,
        // aber übernimmt die Rotationswerte dx und dy.
        this.camera.update(this.camera.target, dx, dy, deltaTime);

        // 2. Process movement from keyboard
        const moveZ: number = Input.getAxis(Keys.W, Keys.S);
        const moveX: number = Input.getAxis(Keys.A, Keys.D);

        if (moveZ !== 0 || moveX !== 0) {
            const sin: number = Math.sin(this.camera.theta);
            const cos: number = Math.cos(this.camera.theta);

            const dirX: number = moveX * cos + moveZ * sin;
            const dirZ: number = -moveX * sin + moveZ * cos;

            // Direktes Manipulieren der Kamera-Position!
            this.camera.position.x += dirX * this._moveSpeed * deltaTime;
            this.camera.position.z += dirZ * this._moveSpeed * deltaTime;
        }

        // 3. Process vertical movement (Q = down, E = up)
        if (Input.isPressed(Keys.Q)) {
            this.camera.position.y -= this._moveSpeed * deltaTime;
        }
        if (Input.isPressed(Keys.E)) {
            this.camera.position.y += this._moveSpeed * deltaTime;
        }

        // 4. Collision / Floor Clamp
        // Verhindert, dass die Kamera unter den Boden (Y=2.0) sinkt.
        this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

        // 5. Update Skybox Position
        // Die Skybox muss immer exakt auf der Kamera liegen, damit man sie nicht verlassen kann.
        const skybox = this.scene.objects.find((o) => o.name === "Skybox");
        if (skybox) {
            skybox.position.copyFrom(this.camera.position);
        }

        // ACHTUNG: Wir rufen hier NICHT nochmal this.camera.update() auf, um Überschreibungen zu verhindern.
        // Die Basisklasse Application.ts ruft ohnehin this.camera.update() sowie this.camera.updateViewMatrix() am Ende des Frames auf!
    }

    protected override getDebugInfo(): Record<string, string | number> {
        const base = super.getDebugInfo();
        return {
            ...base,
            Example: "07 - Clean Rebuild",
            "Pointer Locked": Input.isPointerLocked ? "Yes" : "No",
        };
    }
}

const app = new Example7();
app
    .start()
    .then((): void => {
        console.log("Example 7 running");
    })
    .catch((err: Error): void => {
        console.error("Error starting engine:", err);
    });
