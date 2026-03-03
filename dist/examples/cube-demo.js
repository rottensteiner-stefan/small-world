import { SmallWorld } from "../src/core/SmallWorld.js";
import { Scene } from "../src/core/Scene.js";
import { Object3D } from "../src/core/Object3D.js";
import { Cube } from "../src/geometry/Cube.js";
import { Sphere } from "../src/geometry/Sphere.js";
import { Grid } from "../src/geometry/Grid.js";
import { Camera, CameraStrategy } from "../src/core/Camera.js";
import { PerspectiveProjection } from "../src/math/projections/PerspectiveProjection.js";
import { Matrix4 } from "../src/math/Matrix4.js";
import { Input } from "../src/core/Input.js";
async function start() {
    Input.init();
    const sw = new SmallWorld();
    await sw.init("./config/small-world.json");
    // Werte aus der Config ziehen
    const WORLD_SIZE = sw.config.worldSize;
    const LIMIT = WORLD_SIZE / 2;
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new Scene();
    // BODEN-GITTER
    const grid = new Object3D();
    grid.geometry = new Grid(WORLD_SIZE, WORLD_SIZE / 2).getPrimitiveData();
    grid.color = [0.3, 0.3, 0.3, 1.0];
    scene.add(grid);
    // SPIELER
    const player = new Object3D();
    player.geometry = new Cube(1.5).getPrimitiveData();
    player.color = [1, 0.5, 0, 1];
    scene.add(player);
    // HINDERNISSE
    const sData = new Sphere(0.6, 12).getPrimitiveData();
    for (let i = 0; i < 25; i++) {
        const s = new Object3D();
        s.geometry = sData;
        s.position = [
            Math.random() * (WORLD_SIZE - 10) - LIMIT + 5,
            0,
            Math.random() * (WORLD_SIZE - 10) - LIMIT + 5
        ];
        s.color = [0, 0.5, 1, 1];
        scene.add(s);
    }
    const cam = new Camera(new PerspectiveProjection(Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, WORLD_SIZE * 2));
    const vM = new Matrix4(), vpM = new Matrix4();
    function loop() {
        const speed = 0.25;
        let nextX = player.position[0] + Input.getAxis("KeyA", "KeyD") * speed;
        let nextZ = player.position[2] + Input.getAxis("KeyW", "KeyS") * speed;
        // BOUNDARY LOGIK (Nutzt das dynamische LIMIT)
        const halfSize = 0.75;
        if (nextX > LIMIT - halfSize)
            nextX = LIMIT - halfSize;
        if (nextX < -LIMIT + halfSize)
            nextX = -LIMIT + halfSize;
        if (nextZ > LIMIT - halfSize)
            nextZ = LIMIT - halfSize;
        if (nextZ < -LIMIT + halfSize)
            nextZ = -LIMIT + halfSize;
        player.position[0] = nextX;
        player.position[2] = nextZ;
        if (Input.isPressed("Digit1"))
            cam.strategy = CameraStrategy.FIXED;
        if (Input.isPressed("Digit2"))
            cam.strategy = CameraStrategy.STIFF;
        if (Input.isPressed("Digit3"))
            cam.strategy = CameraStrategy.SMOOTH;
        let dx = 0, dy = 0;
        if (Input.mouse.right) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }
        cam.update(player.position, dx, dy);
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        scene.update();
        Matrix4.lookAt(cam.position, cam.target, cam.up, vM);
        cam.getViewProjection(vM, vpM);
        sw.activeRenderer.render(scene, vpM.data);
        requestAnimationFrame(loop);
    }
    loop();
}
start();
//# sourceMappingURL=cube-demo.js.map