import { SmallWorld } from "../src/core/SmallWorld.js";
import { Scene } from "../src/core/Scene.js";
import { Mesh } from "../src/core/Mesh.js";
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
import { BoundingSphere } from "../src/physics/BoundingSphere.js";
import { BoundingBox } from "../src/physics/BoundingBox.js";
import { Collision } from "../src/physics/Collision.js";
import { Keys } from "../src/constants/Keys.js";
async function start() {
    Input.init();
    const sw = new SmallWorld();
    await sw.init("./config/small-world.json");
    const WORLD_SIZE = sw.config.worldSize;
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new Scene();
    const hud = new HUD(sw.config.showHUD);
    await hud.init();
    // 1. Grid als Mesh
    const grid = new Mesh(new Grid(WORLD_SIZE, 50).getGeometryData(), Color.DARKSLATEGRAY, "Grid");
    scene.add(grid);
    // 2. Spieler als Mesh
    const playerSize = 1.5;
    const player = new Mesh(new Cube(playerSize).getGeometryData(), Color.ORANGE, "Player");
    scene.add(player);
    // --- NEU: DER MOND (Parent-Child Demo) ---
    // Dieser Mond wird an den PLAYER gehängt, nicht an die Scene!
    const moon = new Mesh(new Sphere(0.4, 8, 6).getGeometryData(), Color.LIGHTSTEELBLUE, "Moon");
    moon.position.set(3, 1, 0); // 3 Einheiten rechts vom Spieler
    player.add(moon); // Hier passiert die Magie der Hierarchie
    // -----------------------------------------
    const spheres = [];
    const TOTAL_SPHERES = 30;
    const sGeo = new Sphere(0.6).getGeometryData();
    const createSpheres = () => {
        for (let i = 0; i < TOTAL_SPHERES; i++) {
            const s = new Mesh(sGeo, Color.DODGERBLUE, `Sphere_${i}`);
            s.position = new Vector3D(Math.random() * 40 - 20, 0, Math.random() * 40 - 20);
            s.bounds = new BoundingSphere(s.position, 0.6);
            scene.add(s);
            spheres.push(s);
        }
    };
    createSpheres();
    const cam = new Camera(new PerspectiveProjection(Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, 200));
    const vM = new Matrix4(), vpM = new Matrix4();
    let score = 0, lastTime = performance.now(), frameCount = 0, fps = 0, hudVisible = sw.config.showHUD, tabWasPressed = false;
    function loop() {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = now;
        }
        // Steuerung
        const speed = Input.isPressed(Keys.SHIFT_L) ? 0.6 : 0.25;
        player.position.add(new Vector3D(Input.getAxis(Keys.A, Keys.D), 0, Input.getAxis(Keys.W, Keys.S)).scale(speed));
        // Mond-Rotation (relativ zum Spieler!)
        moon.rotation.y += 0.05;
        // HUD Toggle
        const tabDown = Input.isPressed(Keys.TAB);
        if (tabDown && !tabWasPressed) {
            hudVisible = !hudVisible;
            hud.setVisible(hudVisible);
        }
        tabWasPressed = tabDown;
        // Reset
        if (Input.isPressed(Keys.R)) {
            spheres.forEach((s) => scene.remove(s));
            spheres.length = 0;
            score = 0;
            createSpheres();
        }
        // Player Bounds Update (AABB)
        const h = playerSize / 2;
        player.bounds = new BoundingBox(new Vector3D(player.position.x - h, -h, player.position.z - h), new Vector3D(player.position.x + h, h, player.position.z + h));
        // Kollisions-Check
        for (let i = spheres.length - 1; i >= 0; i--) {
            const s = spheres[i];
            if (s.bounds && Collision.test(player.bounds, s.bounds)) {
                scene.remove(s);
                spheres.splice(i, 1);
                score++;
            }
        }
        // Kamera
        if (Input.isPressed(Keys.D1))
            cam.strategy = CameraStrategy.FIXED;
        if (Input.isPressed(Keys.D2))
            cam.strategy = CameraStrategy.STIFF;
        if (Input.isPressed(Keys.D3))
            cam.strategy = CameraStrategy.SMOOTH;
        cam.update(player.position, Input.mouse.right ? Input.mouse.dx : 0, Input.mouse.right ? Input.mouse.dy : 0);
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        hud.update(fps, CameraStrategy[cam.strategy], player.position.x, player.position.y, player.position.z, score, TOTAL_SPHERES);
        // --- SCENE GRAPH UPDATE ---
        scene.update();
        // --------------------------
        Matrix4.lookAt(cam.position, cam.target, cam.up, vM);
        cam.getViewProjection(vM, vpM);
        sw.activeRenderer.render(scene, vpM.data);
        requestAnimationFrame(loop);
    }
    loop();
}
start();
//# sourceMappingURL=cube-demo.js.map