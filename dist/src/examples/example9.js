/// src/examples/example9.ts
import { AmbientLight, BoundingBox, CameraStrategyType, Color, Cube, DirectionalLight, Input, Keys, MathUtils, Object3D, PerspectiveProjection, PhongMaterial, Sphere, BasicMaterial, Texture, TextureFilter, Vector3D, } from "../index.js";
import { AbstractExample } from "../core/index.js";
/**
 * Example 9: A classic 2.5D Jump & Run with pure code physics and collision!
 */
export class Example9 extends AbstractExample {
    _player;
    _blocks = [];
    // Physics & Movement
    _velocity = new Vector3D();
    _gravity = -25.0;
    _jumpForce = 12.0;
    _moveSpeed = 8.0;
    _isGrounded = false;
    // The Level Map (1-3 = blocks with different textures, 0 = air)
    _levelMap = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 3, 3, 3],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 3, 2, 3, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        [1, 0, 0, 2, 3, 0, 0, 0, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    async setupScene() {
        Input.init();
        this.renderer.setClearColor(new Color(0.5, 0.7, 1.0));
        // 1. Camera Setup
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: MathUtils.degToRad(60),
            aspect,
            near: 0.1,
            far: 1000,
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.STIFF);
        this.camera.strategy.radius = 15;
        this.camera.position.set(0, 0, 15);
        // 2. Lights
        this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.4 }));
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.9 });
        sun.direction.set(0.5, -1, -0.5).normalize();
        this.scene.add(sun);
        // 3. Texturen laden
        const loadPixelTexture = async (url) => {
            const tex = await Texture.fromUrl(url);
            tex.magFilter = TextureFilter.NEAREST;
            tex.minFilter = TextureFilter.NEAREST;
            return tex;
        };
        const brickTextures = [
            await loadPixelTexture("/resources/examples/9/brick-1.png"),
            await loadPixelTexture("/resources/examples/9/brick-2.png"),
            await loadPixelTexture("/resources/examples/9/brick-3.png"),
        ];
        // 4. Level aufbauen
        const blockGeo = new Cube({ size: 1 }).getGeometryData();
        const blockMat1 = new PhongMaterial({
            color: Color.WHITE,
            diffuseMap: brickTextures[0],
            shininess: 0,
        });
        const blockMat2 = new PhongMaterial({
            color: Color.WHITE,
            diffuseMap: brickTextures[1],
            shininess: 0,
        });
        const blockMat3 = new PhongMaterial({
            color: Color.WHITE,
            diffuseMap: brickTextures[2],
            shininess: 0,
        });
        const rows = this._levelMap.length;
        const cols = this._levelMap[0].length;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cellType = this._levelMap[y][x];
                if (cellType !== undefined && cellType > 0) {
                    const block = new Object3D(`Block_${x}_${y}`);
                    block.geometry = blockGeo;
                    if (cellType === 1)
                        block.material = blockMat1;
                    else if (cellType === 2)
                        block.material = blockMat2;
                    else if (cellType === 3)
                        block.material = blockMat3;
                    block.position.set(x, rows - y - 1, 0);
                    this.scene.add(block);
                    this._blocks.push(block);
                }
            }
        }
        // 5. Spieler erstellen
        const playerMat = new BasicMaterial({ color: Color.YELLOW });
        this._player = new Object3D("Player");
        this._player.geometry = new Sphere({
            radius: 0.5,
            widthSegments: 16,
            heightSegments: 16,
        }).getGeometryData();
        this._player.material = playerMat;
        this._player.position.set(2, 10, 0);
        this.scene.add(this._player);
    }
    _getAABB(obj, width, height) {
        const halfW = width / 2;
        const halfH = height / 2;
        const min = new Vector3D(obj.position.x - halfW, obj.position.y - halfH, -0.5);
        const max = new Vector3D(obj.position.x + halfW, obj.position.y + halfH, 0.5);
        return new BoundingBox(min, max);
    }
    _checkCollision(boxA, boxB) {
        return (boxA.min.x <= boxB.max.x &&
            boxA.max.x >= boxB.min.x &&
            boxA.min.y <= boxB.max.y &&
            boxA.max.y >= boxB.min.y);
    }
    update(deltaTime) {
        // --- 1. HORIZONTALE BEWEGUNG (X) & ROTATION ---
        this._velocity.x = 0;
        if (Input.isPressed(Keys.A)) {
            this._velocity.x = -this._moveSpeed;
        }
        if (Input.isPressed(Keys.D)) {
            this._velocity.x = this._moveSpeed;
        }
        this._player.position.x += this._velocity.x * deltaTime;
        // Horizontale Kollision prüfen & korrigieren
        const playerBoxX = this._getAABB(this._player, 1, 1);
        for (const block of this._blocks) {
            const blockBox = this._getAABB(block, 1, 1);
            if (this._checkCollision(playerBoxX, blockBox)) {
                if (this._velocity.x > 0) {
                    this._player.position.x = blockBox.min.x - 0.501;
                }
                else if (this._velocity.x < 0) {
                    this._player.position.x = blockBox.max.x + 0.501;
                }
                this._velocity.x = 0;
            }
        }
        // --- 2. VERTIKALE BEWEGUNG (Y) ---
        this._velocity.y += this._gravity * deltaTime;
        if (this._isGrounded && Input.isPressed(Keys.SPACE)) {
            this._velocity.y = this._jumpForce;
            this._isGrounded = false;
        }
        this._player.position.y += this._velocity.y * deltaTime;
        // Vertikale Kollision prüfen & korrigieren
        this._isGrounded = false;
        const playerBoxY = this._getAABB(this._player, 1, 1);
        for (const block of this._blocks) {
            const blockBox = this._getAABB(block, 1, 1);
            if (this._checkCollision(playerBoxY, blockBox)) {
                if (this._velocity.y < 0) {
                    this._player.position.y = blockBox.max.y + 0.501;
                    this._isGrounded = true;
                    this._velocity.y = 0;
                }
                else if (this._velocity.y > 0) {
                    this._player.position.y = blockBox.min.y - 0.501;
                    this._velocity.y = 0;
                }
            }
        }
        // Death Zone
        if (this._player.position.y < -10) {
            this._player.position.set(2, 10, 0); // Respawn
            this._velocity.set(0, 0, 0);
        }
        // --- 4. KAMERA NACHFÜHREN ---
        const camTarget = new Vector3D(this._player.position.x, this._player.position.y, 0);
        this.camera.update(camTarget, 0, 0, deltaTime);
    }
    getDebugInfo() {
        const base = super.getDebugInfo();
        return {
            ...base,
            Example: "09 - 2.5D Jump & Run",
            "Player X": this._player.position.x.toFixed(2),
            "Player Y": this._player.position.y.toFixed(2),
            Grounded: this._isGrounded ? "Yes" : "No",
        };
    }
}
const app = new Example9();
app
    .start()
    .then(() => {
    console.log("Example 9 running");
})
    .catch((err) => {
    console.error("Error starting engine:", err);
});
//# sourceMappingURL=example9.js.map