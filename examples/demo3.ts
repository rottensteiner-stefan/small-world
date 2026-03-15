import {
    AmbientLight,
    Application,
    CameraStrategyType,
    Color,
    DirectionalLight,
    Grid,
    Input,
    MaterialType,
    Object3D,
    ObjLoader,
    PerspectiveProjection,
    PhongMaterial,
    ProjectionType,
    Vector3D,
} from "../src/index.js";

class Demo3App extends Application {
    // Der Punkt, um den sich die Kamera dreht (Zentrum des Modells)
    private targetPos = new Vector3D(0, 0, 0);

    constructor() {
        super({ canvasId: "SmallWorld" });
    }

    protected async setupScene(): Promise<void> {
        Input.init();

        // Pointer Lock aktivieren (Maus-Fokus)
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

        // Wir nutzen SMOOTH, um das Modell elegant umkreisen zu können
        this.camera.setStrategy(CameraStrategyType.SMOOTH);
        this.camera.position.set(0, 5, 15);

        // Licht-Setup: Ambient für weiche Schatten, Directional für Highlights
        const ambientLight = new AmbientLight(Color.WHITE, 0.3);
        this.scene.add(ambientLight);

        const sun = new DirectionalLight(Color.WHITE, 0.8);
        sun.direction.set(-1, -1, -1);
        this.scene.add(sun);

        // ---------------------------------------------------------
        // HILFS-BODEN (GRID)
        // ---------------------------------------------------------
        const gridObj = new Object3D("Boden");
        gridObj.geometry = new Grid(20, 20).getGeometryData();
        const gridMat = new PhongMaterial();
        gridMat.color = Color.DARKSLATEGRAY;

        // WICHTIG: Zwingt den Renderer, das Grid als Linien zu zeichnen (keine "Fähnchen" mehr)
        gridMat.type = MaterialType.WIREFRAME;

        gridObj.material = gridMat;
        this.scene.add(gridObj);

        // ---------------------------------------------------------
        // OBJ LADEN
        // ---------------------------------------------------------
        const loader = new ObjLoader();
        loader.setBasePath("/resources/models/");

        try {
            // Lädt das komplett fertige Modell (inklusive der runden Räder)
            const model = await loader.load("car.obj");

            // Auto skalieren und leicht über den Boden heben, damit die Räder aufliegen
            model.scale.set(1.5, 1.5, 1.5);
            model.position.set(0, 0.4, 0);

            this.scene.add(model);
            console.log("[Demo 3] Auto erfolgreich geladen (Räder sind jetzt Teil des OBJ)!");
        } catch (error) {
            console.error("[Demo 3] Fehler beim Laden des Modells:", error);
        }
    }

    protected update(deltaTime: number): void {
        let dx = 0;
        let dy = 0;

        // Mausbewegung auslesen, wenn der Pointer gesperrt ist
        if (Input.isPointerLocked) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }

        // Deltas sofort zurücksetzen
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;

        // Kamera-Orbit aktualisieren
        this.camera.update(this.targetPos, dx, dy);
    }
}

const app = new Demo3App();
app.start().catch((err) => {
    console.error("Fehler beim Starten von Demo 3:", err);
});