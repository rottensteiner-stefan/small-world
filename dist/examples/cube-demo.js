import { SmallWorld } from "../src/core/SmallWorld.js";
import { Scene } from "../src/core/Scene.js";
import { Object3D } from "../src/core/Object3D.js";
import { Color } from "../src/core/Color.js";
import { Cube } from "../src/geometry/Cube.js";
import { Sphere } from "../src/geometry/Sphere.js";
import { Grid } from "../src/geometry/Grid.js";
import { Camera, CameraStrategy } from "../src/core/Camera.js";
import { PerspectiveProjection } from "../src/math/projections/PerspectiveProjection.js";
import { Matrix4 } from "../src/math/Matrix4.js";
import { Input } from "../src/core/Input.js";
import { Vector3D } from "../src/math/Vector3D.js";
import { HUD } from "../src/core/HUD.js";
async function start() {
    Input.init();
    const sw = new SmallWorld();
    await sw.init("./config/small-world.json");
    const WORLD_SIZE = sw.config.worldSize;
    const LIMIT = WORLD_SIZE / 2;
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new Scene();
    const hud = new HUD(sw.config.showHUD);
    await hud.init();
    const grid = new Object3D();
    grid.geometry = new Grid(WORLD_SIZE, 50).getPrimitiveData();
    grid.color = Color.DARKSLATEGRAY;
    scene.add(grid);
    const player = new Object3D();
    player.geometry = new Cube(1.5).getPrimitiveData();
    player.color = Color.ORANGE;
    scene.add(player);
    const sData = new Sphere(0.6, 12).getPrimitiveData();
    for (let i = 0; i < 30; i++) {
        const s = new Object3D();
        s.geometry = sData;
        s.position = new Vector3D(Math.random() * 40 - 20, 0, Math.random() * 40 - 20);
        s.color = Color.DODGERBLUE;
        scene.add(s);
    }
    const cam = new Camera(new PerspectiveProjection(Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, 200));
    const vM = new Matrix4(), vpM = new Matrix4();
    let lastTime = performance.now();
    let frameCount = 0;
    let currentFps = 0;
    function loop() {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            currentFps = frameCount;
            frameCount = 0;
            lastTime = now;
        }
        const speed = 0.25;
        const move = new Vector3D(Input.getAxis("KeyA", "KeyD"), 0, Input.getAxis("KeyW", "KeyS")).scale(speed);
        player.position.add(move);
        const margin = 0.75;
        if (player.position.x > LIMIT - margin)
            player.position.x = LIMIT - margin;
        if (player.position.x < -LIMIT + margin)
            player.position.x = -LIMIT + margin;
        if (player.position.z > LIMIT - margin)
            player.position.z = LIMIT - margin;
        if (player.position.z < -LIMIT + margin)
            player.position.z = -LIMIT + margin;
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
        // UPDATE HUD MIT X, Y, Z
        hud.update(currentFps, CameraStrategy[cam.strategy], player.position.x, player.position.y, player.position.z);
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