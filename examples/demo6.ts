/// examples/demo6.ts

import {
    AmbientLight,
    CameraStrategyType,
    Capsule,
    Circle,
    Color,
    Cone,
    Cylinder,
    CylinderSector,
    DirectionalLight,
    Grid,
    Input,
    Keys,
    Object3D,
    PerspectiveProjection,
    Pyramid,
    Sphere,
    Torus,
    Triangle,
    Tube,
    Vector3D,
    WireframeMaterial,
} from "../src/index.js";
import {AbstractDemo} from "./AbstractDemo.js";

/**
 * Demo 6: Showcasing advanced geometries like Capsule, Tube, and Sektors.
 */
export class Demo6 extends AbstractDemo {
    private _targetPos: Vector3D = new Vector3D(0, 0, 0);
    private _moveSpeed: number = 20.0;

    /** @inheritdoc */
    protected async setupScene(): Promise<void> {
        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });

        // 1. Setup Perspective Camera
        const aspect: number = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: (75 * Math.PI) / 180,
            aspect,
            near: 0.1,
            far: 1000,
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.SMOOTH);
        this.camera.position.set(0, 15, 30);

        // 2. Lights
        const ambient: AmbientLight = new AmbientLight({color: Color.WHITE, intensity: 0.4});
        this.scene.add(ambient);

        const sun: DirectionalLight = new DirectionalLight({color: Color.WHITE, intensity: 0.8});
        sun.direction.set(-1, -1, -1).normalize();
        this.scene.add(sun);

        // 3. Grid for orientation
        const gridObj: Object3D = new Object3D("FloorGrid");
        gridObj.geometry = new Grid({size: 100, divisions: 50}).getGeometryData();
        const gridMat: WireframeMaterial = new WireframeMaterial();
        gridMat.color = Color.DARKSLATEGRAY;
        gridObj.material = gridMat;
        this.scene.add(gridObj);

        // 4. Common Wireframe Material for all examples
        const wireMat: WireframeMaterial = new WireframeMaterial();
        wireMat.color = Color.CYAN;

        // 5. Helper function to add examples to the scene
        const addExample = (name: string, geometry: any, x: number, z: number): void => {
            const obj: Object3D = new Object3D(name);
            obj.geometry = geometry.getGeometryData();
            obj.material = wireMat;
            obj.position.set(x, 2, z);
            this.scene.add(obj);
        };

        const spacing: number = 10;

        // --- Row 1: Traditional Primitives ---
        addExample(
            "Sphere",
            new Sphere({radius: 2, widthSegments: 32, heightSegments: 24}),
            -spacing * 1.5,
            spacing,
        );
        addExample(
            "Pyramid",
            new Pyramid({base: 4, height: 4, radialSegments: 4}),
            -spacing * 0.5,
            spacing,
        );
        addExample(
            "Torus",
            new Torus({
                radius: 2,
                tube: 0.6,
                radialSegments: 16,
                tubularSegments: 32,
            }),
            spacing * 0.5,
            spacing,
        );
        addExample(
            "Capsule",
            new Capsule({
                radius: 1,
                length: 3,
                radialSegments: 16,
                capSegments: 8,
            }),
            spacing * 1.5,
            spacing,
        );

        // --- Row 2: Cylinder & Variations ---
        addExample("Cone", new Cone({radius: 2, height: 4, radialSegments: 32}), -spacing * 1.5, 0);
        addExample(
            "Frustum",
            new Cylinder({
                radiusTop: 1,
                radiusBottom: 2,
                height: 4,
                radialSegments: 32,
            }),
            -spacing * 0.5,
            0,
        );
        addExample(
            "Cylinder",
            new Cylinder({
                radiusTop: 2,
                radiusBottom: 2,
                height: 4,
                radialSegments: 32,
            }),
            spacing * 0.5,
            0,
        );
        addExample(
            "Tube",
            new Tube({radius: 2, innerRadius: 1.5, height: 4, radialSegments: 32}),
            spacing * 1.5,
            0,
        );

        // --- Row 3: Sectors & Basic units ---
        addExample(
            "CylinderSector",
            new CylinderSector({
                radiusTop: 2,
                radiusBottom: 2,
                height: 4,
                radialSegments: 16,
                thetaLength: Math.PI / 2,
            }),
            -spacing * 1.5,
            -spacing,
        );
        addExample(
            "CircleSector",
            new Circle({
                radius: 2,
                segments: 32,
                thetaLength: Math.PI * 1.5,
            }),
            -spacing * 0.5,
            -spacing,
        );

        // Triangle
        addExample(
            "Triangle",
            new Triangle(new Vector3D(-2, 0, -2), new Vector3D(2, 0, -2), new Vector3D(0, 3, 0)),
            -spacing * 0.5,
            -spacing,
        );

        console.log("Demo 6: All geometries added.");
    }

    /** @inheritdoc */
    protected update(deltaTime: number): void {
        // 1. Mouse Look
        const dx: number = Input.isPointerLocked ? Input.mouse.dx : 0;
        const dy: number = Input.isPointerLocked ? Input.mouse.dy : 0;
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;

        // 2. Keyboard Movement (relative to camera rotation)
        const moveZ = Input.getAxis(Keys.W, Keys.S);
        const moveX = Input.getAxis(Keys.A, Keys.D);

        if (moveZ !== 0 || moveX !== 0) {
            // Calculate direction based on camera yaw (theta)
            const sin = Math.sin(this.camera.theta);
            const cos = Math.cos(this.camera.theta);

            const dirX = moveX * cos + moveZ * sin;
            const dirZ = -moveX * sin + moveZ * cos;

            this._targetPos.x += dirX * this._moveSpeed * deltaTime;
            this._targetPos.z += dirZ * this._moveSpeed * deltaTime;
        }

        // 3. Vertical movement (Q/E or Space/Shift style)
        if (Input.isPressed(Keys.Q)) this._targetPos.y -= this._moveSpeed * deltaTime;
        if (Input.isPressed(Keys.E)) this._targetPos.y += this._moveSpeed * deltaTime;

        // 4. Update Camera
        this.camera.update(this._targetPos, dx, dy);
    }

    /** @inheritdoc */
    protected override getDebugInfo(): Record<string, string | number> {
        const base: Record<string, string | number> = super.getDebugInfo();
        return {
            ...base,
            Demo: "06 - Advanced Geometries",
            "Camera Target": `(${this._targetPos.x.toFixed(1)}, ${this._targetPos.y.toFixed(1)}, ${this._targetPos.z.toFixed(1)})`,
        };
    }
}

// === START DES PROGRAMMS ===
const app = new Demo6();
app
    .start()
    .then(() => {
        console.log("Engine läuft!");
    })
    .catch((err: Error) => {
        console.error("Fehler beim Starten der Engine:", err);
    });
