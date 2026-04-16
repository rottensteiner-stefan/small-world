/// examples/example5.ts
import {
    AmbientLight,
    CameraStrategyType,
    Color,
    Cube,
    DirectionalLight,
    Grid,
    Input,
    IsometricStrategy,
    Keys,
    Object3D,
    OrthographicProjection,
    PhongMaterial,
    Vector3D,
    WireframeMaterial,
} from "../src/index.js";
import {AbstractExample} from "../src/core/example/AbstractExample.js";

/**
 * Example 5: Introduction to 2D elements and Isometric Camera.
 */
export class Example5 extends AbstractExample {
    private _player!: Object3D;
    private _targetPos: Vector3D = new Vector3D(0, 0, 0);

    // Grid Movement State
    private _isMoving: boolean = false;
    private _moveProgress: number = 0;
    private _moveStart: Vector3D = new Vector3D();
    private _moveEnd: Vector3D = new Vector3D();
    private _moveDuration: number = 0.2; // Seconds for one step

    protected override async setupScene(): Promise<void> {
        // 1. Setup Orthographic Camera for 2D/Isometric feel
        const aspect: number = window.innerWidth / window.innerHeight;
        const size: number = 10;
        this.camera.projection = new OrthographicProjection({
            left: -size * aspect,
            right: size * aspect, // left, right
            bottom: -size,
            top: size, // bottom, top
            near: 0.1,
            far: 1000, // near, far
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.ISOMETRIC);

        // 2. Lights
        const ambient: AmbientLight = new AmbientLight({color: Color.WHITE, intensity: 0.4});
        this.scene.add(ambient);

        const sun: DirectionalLight = new DirectionalLight({color: Color.WHITE, intensity: 0.8});
        sun.direction.set(-1, -1, -0.5).normalize();
        this.scene.add(sun);

        // 3. Grid for orientation
        const gridObj: Object3D = new Object3D("IsometricGrid");
        gridObj.geometry = new Grid({size: 20, divisions: 20}).getGeometryData();
        const gridMat: WireframeMaterial = new WireframeMaterial();
        gridMat.color = Color.DARKSLATEGRAY;
        gridObj.material = gridMat;
        this.scene.add(gridObj);

        // 4. "Player" (Container for 3 stacked cubes)
        this._player = new Object3D("Player");
        this._player.position.set(0.5, 0, 0.5); // Parent is on the floor
        this.scene.add(this._player);

        const playerMat: PhongMaterial = new PhongMaterial({color: Color.DODGERBLUE});

        // Layer 1 (Base): Size 1.0
        const pBase = new Object3D("PlayerBase");
        pBase.geometry = new Cube({size: 1.0}).getGeometryData();
        pBase.material = playerMat;
        pBase.position.y = 0.5;
        this._player.add(pBase);

        // Layer 2 (Mid): Size 0.5
        const pMid = new Object3D("PlayerMid");
        pMid.geometry = new Cube({size: 0.5}).getGeometryData();
        pMid.material = playerMat;
        pMid.position.y = 1.25; // top of base (1.0) + half of mid (0.25)
        this._player.add(pMid);

        // Layer 3 (Top): Size 0.25
        const pTop = new Object3D("PlayerTop");
        pTop.geometry = new Cube({size: 0.25}).getGeometryData();
        pTop.material = playerMat;
        pTop.position.y = 1.625; // top of mid (1.5) + half of top (0.125)
        this._player.add(pTop);

        // 5. Some static "World" objects (Trees as 3 stacked cubes)
        const treeMat: PhongMaterial = new PhongMaterial({color: Color.GREEN});
        for (let i: number = 0; 10 > i; i++) {
            const tree: Object3D = new Object3D(`Tree_${i}`);
            const x = Math.floor(Math.random() * 16 - 8) + 0.5;
            const z = Math.floor(Math.random() * 16 - 8) + 0.5;
            tree.position.set(x, 0, z);
            this.scene.add(tree);

            // Tree Layer 1
            const tBase = new Object3D("TreeBase");
            tBase.geometry = new Cube({size: 1.0}).getGeometryData();
            tBase.material = treeMat;
            tBase.position.y = 0.5;
            tree.add(tBase);

            // Tree Layer 2
            const tMid = new Object3D("TreeMid");
            tMid.geometry = new Cube({size: 0.5}).getGeometryData();
            tMid.material = treeMat;
            tMid.position.y = 1.25;
            tree.add(tMid);

            // Tree Layer 3
            const tTop = new Object3D("TreeTop");
            tTop.geometry = new Cube({size: 0.25}).getGeometryData();
            tTop.material = treeMat;
            tTop.position.y = 1.625;
            tree.add(tTop);
        }
    }

    protected override update(deltaTime: number): void {
        if (!this._isMoving) {
            // Start movement if a key is pressed
            let dx = 0;
            let dz = 0;

            if (Input.isPressed(Keys.W)) dz = -1;
            else if (Input.isPressed(Keys.S)) dz = 1;
            else if (Input.isPressed(Keys.A)) dx = -1;
            else if (Input.isPressed(Keys.D)) dx = 1;

            if (dx !== 0 || dz !== 0) {
                const nextX = this._player.position.x + dx;
                const nextZ = this._player.position.z + dz;

                // Bounds check: Grid is 20x20 (from -10 to 10).
                // Centers are -9.5, -8.5, ..., 8.5, 9.5.
                if (nextX >= -9.5 && nextX <= 9.5 && nextZ >= -9.5 && nextZ <= 9.5) {
                    this._isMoving = true;
                    this._moveProgress = 0;
                    this._moveStart.copyFrom(this._player.position);
                    this._moveEnd.set(nextX, 0, nextZ);
                }
            }
        }

        if (this._isMoving) {
            this._moveProgress += deltaTime / this._moveDuration;
            if (this._moveProgress >= 1.0) {
                this._moveProgress = 1.0;
                this._isMoving = false;
            }

            // Smooth interpolation (Linear here, could be eased)
            const t = this._moveProgress;
            this._player.position.x = this._moveStart.x + (this._moveEnd.x - this._moveStart.x) * t;
            this._player.position.z = this._moveStart.z + (this._moveEnd.z - this._moveStart.z) * t;
        }

        // Toggle Pixel-Perfect Snapping with 'P'
        const strategy: unknown = this.camera.strategy;
        if (strategy instanceof IsometricStrategy) {
            if (Input.isPressed(Keys.P)) {
                strategy.pixelPerfect = !strategy.pixelPerfect;
            }

            // Example of Screen-to-World (later usage)
            if (Input.mouse.left && !this._isMoving) {
                // Normalized mouse coords (-1 to 1)
                const mx: number = (Input.mouse.x / window.innerWidth) * 2 - 1;
                const my: number = -(Input.mouse.y / window.innerHeight) * 2 + 1;
                const worldPos: Vector3D = strategy.screenToWorld(mx, my, this.camera);

                const nextX = Math.floor(worldPos.x) + 0.5;
                const nextZ = Math.floor(worldPos.z) + 0.5;

                // Bounds check
                if (nextX >= -9.5 && nextX <= 9.5 && nextZ >= -9.5 && nextZ <= 9.5) {
                    this._isMoving = true;
                    this._moveProgress = 0;
                    this._moveStart.copyFrom(this._player.position);
                    this._moveEnd.set(nextX, 0, nextZ);
                }
            }
        }

        this._targetPos.copyFrom(this._player.position);
        this.camera.update(this._targetPos, 0, 0);
    }

    protected override getDebugInfo(): Record<string, string | number> {
        const base: Record<string, string | number> = super.getDebugInfo();
        const strategy: IsometricStrategy | undefined = this.camera.strategy as IsometricStrategy;
        return {
            ...base,
            Example: "05 - Isometric 2D/3D",
            "Pixel Snapping (P)": strategy ? (strategy.pixelPerfect ? "ON" : "OFF") : "N/A",
            "Player Pos": `(${this._player.position.x.toFixed(2)}, ${this._player.position.z.toFixed(2)})`,
            Moving: this._isMoving ? "Yes" : "No",
        };
    }
}

// === START THE ENGINE ===
const app: Example5 = new Example5();
app
    .start()
    .then((): void => {
        console.log("Engine running");
    })
    .catch((err: Error): void => {
        console.error("Error while starting the engine: ", err);
    });
