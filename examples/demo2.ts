/// examples/demo2.ts

import {
    CameraStrategyType,
    Color,
    Cube,
    DirectionalLight,
    Grid,
    Input,
    Keys,
    Object3D,
    PerspectiveProjection,
    PhongMaterial,
    ProjectionType,
    Vector3D,
} from "../src/index.js";
import {AbstractDemo} from "./AbstractDemo.js";

class Demo2 extends AbstractDemo {
    private playerPos = new Vector3D(0, 1, 0);
    private speed = 15.0;

    protected async setupScene(): Promise<void> {
        Input.init();

        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });

        if (this.camera.projection.type === ProjectionType.PERSPECTIVE) {
            const aspect = window.innerWidth / window.innerHeight;
            this.camera.projection = new PerspectiveProjection((75 * Math.PI) / 180, aspect, 0.1, 1000);
            this.camera.updateProjectionMatrix();
        }

        this.camera.setStrategy(CameraStrategyType.FPS);

        const sun = new DirectionalLight(Color.WHITE, 0.8);
        sun.direction.set(-1, -1, -1);
        this.scene.add(sun);

        const gridObj = new Object3D("Boden");
        gridObj.geometry = new Grid(100, 100).getGeometryData();
        const gridMat = new PhongMaterial();
        gridMat.color = Color.DARKSLATEGRAY;
        gridObj.material = gridMat;
        this.scene.add(gridObj);

        // Ein paar zufällige Würfel als Hindernisse zur Orientierung
        for (let i = 0; i < 20; i++) {
            const cube = new Object3D(`Cube_${i}`);
            cube.geometry = new Cube(2).getGeometryData();

            const mat = new PhongMaterial();
            mat.color = new Color(Math.random(), Math.random(), Math.random());
            cube.material = mat;

            cube.position.set((Math.random() - 0.5) * 50, 1, (Math.random() - 0.5) * 50);
            this.scene.add(cube);
        }
    }

    protected update(deltaTime: number): void {
        const moveZ = Input.getAxis(Keys.W, Keys.S);
        const moveX = Input.getAxis(Keys.A, Keys.D);

        const sin = Math.sin(this.camera.theta);
        const cos = Math.cos(this.camera.theta);

        const dirX = moveX * cos + moveZ * sin;
        const dirZ = -moveX * sin + moveZ * cos;

        this.playerPos.x += dirX * this.speed * deltaTime;
        this.playerPos.z += dirZ * this.speed * deltaTime;

        let dx = 0;
        let dy = 0;

        if (Input.isPointerLocked) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }

        Input.mouse.dx = 0;
        Input.mouse.dy = 0;

        this.camera.update(this.playerPos, dx, dy);
    }
}

// === START DES PROGRAMMS ===
const app = new Demo2();
app
    .start()
    .then(() => {
        console.log("Engine läuft!");
    })
    .catch((err: Error) => {
        console.error("Fehler beim Starten der Engine:", err);
    });