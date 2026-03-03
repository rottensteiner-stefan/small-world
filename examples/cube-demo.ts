import { SmallWorld } from '../src/core/SmallWorld.js';
import { Scene } from '../src/core/Scene.js';
import { Object3D } from '../src/core/Object3D.js';
import { Cube } from '../src/geometry/Cube.js';
import { Sphere } from '../src/geometry/Sphere.js';
import { Camera, CameraStrategy } from '../src/core/Camera.js';
import { PerspectiveProjection } from '../src/math/projections/PerspectiveProjection.js';
import { Matrix4 } from '../src/math/Matrix4.js';
import { Input } from '../src/core/Input.js';

async function start() {
    Input.init();
    const sw = new SmallWorld();
    await sw.init('./config/small-world.json');
    sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new Scene();
    const player = new Object3D();
    player.geometry = new Cube(1.5).getPrimitiveData();
    player.color = [1, 0.5, 0, 1];
    scene.add(player);

    const sData = new Sphere(0.6, 12).getPrimitiveData();
    for(let i=0; i<30; i++) {
        const s = new Object3D(); s.geometry = sData;
        s.position = [Math.random()*40-20, 0, Math.random()*40-20];
        s.color = [0, 0.5, 1, 1]; scene.add(s);
    }

    const cam = new Camera(new PerspectiveProjection(Math.PI/4, window.innerWidth/window.innerHeight, 0.1, 200));
    const vM = new Matrix4(), vpM = new Matrix4();

    console.log("%cKamera-Modi: [1] FIXED, [2] STIFF, [3] SMOOTH", "color: #0ff");

    function loop() {
        // 1. Input abfragen
        const speed = 0.2;
        player.position[0] += Input.getAxis("KeyA", "KeyD") * speed;
        player.position[2] += Input.getAxis("KeyW", "KeyS") * speed;

        // 2. Strategie umschalten (JETZT GEFIXT)
        if (Input.isPressed("Digit1")) cam.strategy = CameraStrategy.FIXED;
        if (Input.isPressed("Digit2")) cam.strategy = CameraStrategy.STIFF;
        if (Input.isPressed("Digit3")) cam.strategy = CameraStrategy.SMOOTH;

        // 3. Kamera Update
        let dx = 0, dy = 0;
        if (Input.mouse.right) { dx = Input.mouse.dx; dy = Input.mouse.dy; }
        cam.update(player.position, dx, dy);
        Input.mouse.dx = 0; Input.mouse.dy = 0;

        // 4. Transform & Render
        scene.update();
        Matrix4.lookAt(cam.position, cam.target, cam.up, vM);
        cam.getViewProjection(vM, vpM);
        sw.activeRenderer.render(scene, vpM.data);

        requestAnimationFrame(loop);
    }
    loop();
}
start();
