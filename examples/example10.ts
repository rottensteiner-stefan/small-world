/// examples/example10.ts

import {
    AmbientLight,
    BasicMaterial,
    WorldMaterial,
    CameraStrategyType,
    Color,
    Cube,
    DirectionalLight,
    PointLight,
    PhongMaterial,
    Input,
    Keys,
    MathUtils,
    Object3D,
    PerspectiveProjection,
    Plane,
    Texture,
} from "../src/index.js";
import {AbstractExample} from "../src/core/example/AbstractExample.js";

/**
 * Example 10: Textured Floor & Fire Bowl.
 * Shows how to compose objects from primitives and apply textures.
 */
export class Example10 extends AbstractExample {
    private readonly _moveSpeed: number = 15.0;
    private readonly _eyeHeight: number = 2.0;

    private _rockTexture: Texture | undefined;
    private _lavaTexture: Texture | undefined;
    private _lavaNormalMap: Texture | undefined;
    private _lavaSpecularMap: Texture | undefined;

    /** @inheritdoc */
    protected override async setupScene(): Promise<void> {
        this.onCanvasRecreated();

        // 1. Camera Setup
        const aspect: number = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: MathUtils.degToRad(75),
            aspect,
            near: 0.1,
            far: 1000,
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.FPS);
        this.camera.position.set(0, this._eyeHeight, 15);

        // 2. Lighting
        this.scene.add(new AmbientLight({color: Color.WHITE, intensity: 0.4}));
        const sun: DirectionalLight = new DirectionalLight({color: Color.WHITE, intensity: 0.8});
        sun.direction.set(-1, -1, -1).normalize();
        this.scene.add(sun);

        // 3. Textures
        const sandTexture: Texture = await Texture.fromUrl("/resources/examples/10/sand.png", {
            anisotropy: 16,
            generateMipmaps: true
        });
        sandTexture.repeat.x = 20;
        sandTexture.repeat.y = 20;

        this._rockTexture = await Texture.fromUrl("/resources/examples/10/rock.png", {
            anisotropy: 16,
            generateMipmaps: true
        });
        this._lavaTexture = await Texture.fromUrl("/resources/examples/10/lava.png", {
            generateMipmaps: true // Lava doesn't need high anisotropy as much as the floor
        });
        this._lavaNormalMap = await Texture.fromUrl("/resources/examples/10/lava_normal.png", {
            generateMipmaps: true
        });
        this._lavaSpecularMap = await Texture.fromUrl("/resources/examples/10/lava_specular.png", {
            generateMipmaps: true
        });

        // 4. Textured Floor (instead of Grid)
        const floor: Object3D = new Object3D("Floor");
        floor.geometry = new Plane({ width: 100, depth: 100 }).getGeometryData();
        floor.material = new BasicMaterial({ diffuseMap: sandTexture });
        this.scene.add(floor);

        // 5. Fire Bowls (Feuerschalen) & Pedestal (Podest)
        // 1 tile per 2 world units
        if (this._rockTexture) {
          this._rockTexture.repeat.x = 0.5;
          this._rockTexture.repeat.y = 0.5;
        }
        const rockMaterial = new WorldMaterial({ diffuseMap: this._rockTexture });


        const createBox = (boxName: string, w: number, h: number, d: number, bx: number, by: number, bz: number): Object3D => {
          const obj: Object3D = new Object3D(boxName);
          obj.geometry = new Cube({ size: 1 }).getGeometryData();
          obj.material = rockMaterial;
          obj.scale.set(w, h, d);
          obj.position.set(bx, by, bz);
          return obj;
        };

        /** Helper to create a fire bowl at a specific position */
        const createFireBowl = (name: string, x: number, y: number, z: number): Object3D => {
          const container: Object3D = new Object3D(name);

          // Base (5 x 1 x 5)
          container.add(createBox("Base", 5, 1, 5, 0, 0.5, 0));

          // Walls (1 unit high, around the 3x3 hole)
          container.add(createBox("WallFront", 5, 1, 1, 0, 1.5, 2));
          container.add(createBox("WallBack", 5, 1, 1, 0, 1.5, -2));
          container.add(createBox("WallLeft", 1, 1, 3, -2, 1.5, 0));
          container.add(createBox("WallRight", 1, 1, 3, 2, 1.5, 0));

          // 5c. Add Lava (3x3 plane, slightly below the rim at y=1.8)
          const lava: Object3D = new Object3D("Lava");
          lava.geometry = new Plane({ width: 3, depth: 3 }).getGeometryData();
          const lavaMaterial = new PhongMaterial({
            diffuseMap: this._lavaTexture,
            normalMap: this._lavaNormalMap,
            specularMap: this._lavaSpecularMap,
            shininess: 64,
            specularColor: new Color(1, 0.5, 0.2) // Orange-ish specular for lava
          });
          lava.material = lavaMaterial;
          lava.position.set(0, 1.8, 0);
          container.add(lava);

          // 5d. Add PointLight inside the bowl to make the normal map visible
          const light = new PointLight({
            color: new Color(1, 0.4, 0.1),
            intensity: 2.0,
            distance: 10
          });
          light.position.set(0, 2.5, 0); // Position slightly above the lava surface
          container.add(light);

          container.position.set(x, y, z);
          return container;
        };

        // 5a. Add Pedestal (Podest)
        // 15 units wide, 7 units deep, 1 unit high. Center at y=0.5.
        this.scene.add(createBox("Pedestal", 15, 1, 7, 0, 0.5, 0));

        // 5b. Add two bowls on top of the pedestal (y=1)
        this.scene.add(createFireBowl("FireBowl1", -4, 1, 0));
        this.scene.add(createFireBowl("FireBowl2", 4, 1, 0));

        await this.waitForAssets();
    }

    /** @inheritdoc */
    protected override update(deltaTime: number): void {
        // 1. Mouse Look
        let dx: number = 0;
        let dy: number = 0;
        if (Input.isPointerLocked) {
            dx = Input.mouse.dx;
            dy = Input.mouse.dy;
        }
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;

        this.camera.update(this.camera.target, dx, dy, deltaTime);

        // 2. Keyboard Movement
        const moveZ: number = Input.getAxis(Keys.W, Keys.S);
        const moveX: number = Input.getAxis(Keys.A, Keys.D);

        if (0 !== moveZ || 0 !== moveX) {
            const sin: number = Math.sin(this.camera.theta);
            const cos: number = Math.cos(this.camera.theta);

            const dirX: number = moveX * cos + moveZ * sin;
            const dirZ: number = -moveX * sin + moveZ * cos;

            this.camera.position.x += dirX * this._moveSpeed * deltaTime;
            this.camera.position.z += dirZ * this._moveSpeed * deltaTime;
        }

        // 3. Fly height (Q/E)
        if (Input.isPressed(Keys.Q)) {
            this.camera.position.y -= this._moveSpeed * deltaTime;
        }
        if (Input.isPressed(Keys.E)) {
            this.camera.position.y += this._moveSpeed * deltaTime;
        }

        // Floor clamp
        this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);
    }

    /** @inheritdoc */
    protected override getDebugInfo(): Record<string, string | number> {
        const base: Record<string, string | number> = super.getDebugInfo();
        return {
            ...base,
            Example: "10 - Textured Floor & Composed Fire Bowl",
            "Cam Pos": `(${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`,
        };
    }
}

// Start application
const app: Example10 = new Example10({
    fullscreen: true,
    quality: {
        maxAnisotropy: 16, // Ultra-sharp textures at flat angles
        msaa: 4,           // Smooth edges
        mipmapping: true   // No flickering in the distance
    }
});
app.start().catch((err) => {
    console.error("Example 10 failed to start:", err);
    if (err instanceof Error) {
        console.error("Stack trace:", err.stack);
    }
});
