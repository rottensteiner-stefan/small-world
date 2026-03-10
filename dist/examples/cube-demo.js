import { SmallWorld } from "../src/core/SmallWorld.js";
import { Scene } from "../src/core/Scene.js";
import { Object3D } from "../src/core/Object3D.js";
import { Color } from "../src/core/colors/Color.js";
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
import { Keys } from "../src/enums/Keys.js";
import { FrustumCuller } from "../src/core/FrustumCuller.js";
import { WireframeMaterial } from "../src/core/materials/WireframeMaterial.js";
import { LambertMaterial } from "../src/core/materials/LambertMaterial.js";
import { PhongMaterial } from "../src/core/materials/PhongMaterial.js";
import { DirectionalLight } from "../src/core/lights/DirectionalLight.js";
import { AmbientLight } from "../src/core/lights/AmbientLight.js";
import { SpotLight } from "../src/core/lights/SpotLight.js";
async function start() {
    Input.init();
    const sw = new SmallWorld();
    await sw.init("./config/small-world.json");
    const WORLD_SIZE = sw.config.worldSize || 40;
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new Scene();
    const hud = new HUD(sw.config.showHUD !== false);
    await hud.init();
    // 1. Sanftes Grundlicht im Raum (blau-graulich)
    const ambient = new AmbientLight(new Color(0.3, 0.4, 0.6), 0.3);
    scene.add(ambient);
    // 2. Die schwache Sonne
    const sun = new DirectionalLight(Color.WHITE, 0.5);
    sun.direction.set(1, -1.5, -1);
    scene.add(sun);
    const grid = new Object3D("Grid");
    grid.geometry = new Grid(WORLD_SIZE, 50).getGeometryData();
    grid.material = new WireframeMaterial();
    grid.material.color = Color.DARKSLATEGRAY;
    scene.add(grid);
    const playerSize = 1.5;
    const player = new Object3D("Player");
    player.geometry = new Cube(playerSize).getGeometryData();
    const playerMat = new PhongMaterial();
    playerMat.color = Color.ORANGE;
    playerMat.specularColor = Color.WHITE;
    playerMat.shininess = 64;
    player.material = playerMat;
    scene.add(player);
    const moon = new Object3D("Moon");
    moon.geometry = new Sphere(0.4).getGeometryData();
    const moonMat = new LambertMaterial();
    moonMat.color = Color.YELLOW;
    moon.material = moonMat;
    player.add(moon);
    // 3. Das dramatische PointLight! Wir hängen es direkt an den kreisenden Mond.
    //const torch = new PointLight(Color.RED, 5.0); // Starkes rotes Licht
    //moon.add(torch); // <-- Es wird mit dem Mond reisen!
    // LÖSCHE das PointLight ("torch") und ersetze es durch:
    // 3. Die Taschenlampe (SpotLight) für den Spieler!
    const flashLight = new SpotLight(Color.GREEN, 8.0);
    // Winkel: 25 Grad, Penumbra: 0.8 (sehr weicher Rand)
    flashLight.angle = Math.PI / 7;
    flashLight.penumbra = 0.8;
    // Die Lampe etwas nach vorne und oben versetzen, damit sie nicht IM Würfel steckt
    flashLight.position.set(0, 1, 1);
    player.add(flashLight);
    const spheres = [];
    const TOTAL_SPHERES = 30;
    const sGeo = new Sphere(0.6).getGeometryData();
    const createSpheres = () => {
        for (let i = 0; i < TOTAL_SPHERES; i++) {
            const s = new Object3D(`Sphere_${i}`);
            s.geometry = sGeo;
            const sMat = new PhongMaterial();
            sMat.color = Color.DODGERBLUE;
            sMat.specularColor = new Color(0.8, 0.8, 1.0);
            sMat.shininess = 32;
            s.material = sMat;
            s.position = new Vector3D(Math.random() * 40 - 20, 0, Math.random() * 40 - 20);
            s.bounds = new BoundingSphere(s.position, 0.6);
            scene.add(s);
            spheres.push(s);
        }
    };
    createSpheres();
    const cam = new Camera(new PerspectiveProjection(Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, 200));
    const vM = new Matrix4(), vpM = new Matrix4();
    let score = 0, lastTime = performance.now(), frameCount = 0, fps = 0, hudVisible = sw.config.showHUD !== false, tabWasPressed = false;
    function loop() {
        frameCount++;
        const now = performance.now();
        const time = now * 0.001; // Zeit in Sekunden für flüssige Animationen
        if (now - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = now;
        }
        // --- 1. SPIELER BEWEGUNG & ROTATION ---
        const speed = Input.isPressed(Keys.SHIFT_L) ? 0.6 : 0.25;
        const dx = Input.getAxis(Keys.A, Keys.D);
        const dz = Input.getAxis(Keys.W, Keys.S);
        if (dx !== 0 || dz !== 0) {
            // Vektor normalisieren, damit diagonales Laufen nicht schneller ist
            const len = Math.sqrt(dx * dx + dz * dz);
            const moveX = dx / len;
            const moveZ = dz / len;
            player.position.add(new Vector3D(moveX, 0, moveZ).scale(speed));
            // Spieler in Laufrichtung drehen (Y-Achse)
            // Math.atan2 gibt uns den Winkel in Radiant basierend auf X und Z
            player.rotation.y = Math.atan2(moveX, moveZ);
            flashLight.direction.set(Math.sin(player.rotation.y), -0.2, Math.cos(player.rotation.y));
        }
        // --- SYSTEM & HUD ---
        const tabDown = Input.isPressed(Keys.TAB);
        if (tabDown && !tabWasPressed) {
            hudVisible = !hudVisible;
            hud.setVisible(hudVisible);
        }
        tabWasPressed = tabDown;
        if (Input.isPressed(Keys.R)) {
            spheres.forEach((s) => scene.remove(s));
            spheres.length = 0;
            score = 0;
            createSpheres();
        }
        // --- KOLLISION ---
        const h = playerSize / 2;
        player.bounds = new BoundingBox(new Vector3D(player.position.x - h, -h, player.position.z - h), new Vector3D(player.position.x + h, h, player.position.z + h));
        for (let i = spheres.length - 1; i >= 0; i--) {
            const s = spheres[i];
            if (s.bounds && Collision.test(player.bounds, s.bounds)) {
                scene.remove(s);
                spheres.splice(i, 1);
                score++;
            }
        }
        // --- KAMERA ---
        if (Input.isPressed(Keys.D1))
            cam.strategy = CameraStrategy.FIXED;
        if (Input.isPressed(Keys.D2))
            cam.strategy = CameraStrategy.STIFF;
        if (Input.isPressed(Keys.D3))
            cam.strategy = CameraStrategy.SMOOTH;
        cam.update(player.position, Input.mouse.right ? Input.mouse.dx : 0, Input.mouse.right ? Input.mouse.dy : 0);
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        // --- 2. MOND ANIMATION (Orbit + Eigenrotation) ---
        // Orbit um den Spieler
        moon.position.x = Math.cos(time * 2) * 3;
        moon.position.z = Math.sin(time * 2) * 3;
        // Eigenrotation um alle Achsen für einen coolen Effekt
        moon.rotation.x = time;
        moon.rotation.y = time * 1.5;
        // --- 3. KUGELN ANIMIEREN ---
        for (let i = 0; i < spheres.length; i++) {
            const s = spheres[i];
            // Sanftes Rotieren
            s.rotation.x += 0.01;
            s.rotation.y += 0.02;
            // Hover-Effekt (auf und ab schweben)
            // Wir nutzen 'i' als Offset, damit nicht alle exakt synchron schweben
            s.position.y = Math.sin(time * 3 + i) * 0.5 + 0.5;
            // Update BoundingSphere Position für genaue Kollision
            if (s.bounds)
                s.bounds.center.copyFrom(s.position);
        }
        scene.update();
        Matrix4.lookAt(cam.position, cam.target, cam.up, vM);
        cam.getViewProjection(vM, vpM);
        const visibleCount = FrustumCuller.cull(scene, vpM);
        hud.update({
            "hud.fps": fps,
            "hud.cam.type": CameraStrategy[cam.strategy],
            "hud.player.pos.x": player.position.x.toFixed(1),
            "hud.player.pos.y": player.position.y.toFixed(1),
            "hud.player.pos.z": player.position.z.toFixed(1),
            "hud.score": `${score} / ${TOTAL_SPHERES}`,
            "hud.visible": visibleCount,
        });
        sw.activeRenderer.render(scene, vpM.data, cam.position);
        requestAnimationFrame(loop);
    }
    loop();
}
start();
//# sourceMappingURL=cube-demo.js.map