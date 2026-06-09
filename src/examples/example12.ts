/// src/examples/example12.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  Object3D,
  PerspectiveProjection,
  Plane,
  PointLight,
  ProjectionType,
  StandardMaterial,
  Texture,
  BoundingBox,
  Vector3D,
  SpotLight,
} from "../index.js";
import { AbstractExample, Input } from "../core/index.js";

class AbyssalDecoExample extends AbstractExample {
  private _flickerLight!: PointLight;
  private _portLight!: SpotLight;
  private _time: number = 0;

  protected override async setupScene(): Promise<void> {
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect: number = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    // Load the generated textures
    let decoDiffuse: Texture | undefined;
    let decoNormal: Texture | undefined;
    let decoRoughness: Texture | undefined;
    
    let steamDiffuse: Texture | undefined;
    let steamNormal: Texture | undefined;
    let steamRoughness: Texture | undefined;

    let steamWallDiffuse: Texture | undefined;
    let steamWallNormal: Texture | undefined;
    let steamWallRoughness: Texture | undefined;

    let crateDiffuse: Texture | undefined;
    let crateNormal: Texture | undefined;
    let crateRoughness: Texture | undefined;

    let brandingDiffuse: Texture | undefined;
    let brandingNormal: Texture | undefined;
    let brandingRoughness: Texture | undefined;

    let rockDiffuse: Texture | undefined;
    let rockNormal: Texture | undefined;
    let rockRoughness: Texture | undefined;

    let portDiffuse: Texture | undefined;
    let portNormal: Texture | undefined;
    let portRoughness: Texture | undefined;
    let portEmissive: Texture | undefined;

    try {
      decoDiffuse = await Texture.fromUrl("/resources/examples/12/artdeco_diffuse.png");
      decoNormal = await Texture.fromUrl("/resources/examples/12/artdeco_normal.png");
      decoRoughness = await Texture.fromUrl("/resources/examples/12/artdeco_roughness.png");
      
      // Ceiling Textures
      steamDiffuse = await Texture.fromUrl("/resources/examples/12/steampunk_diffuse.png");
      steamNormal = await Texture.fromUrl("/resources/examples/12/steampunk_normal.png");
      steamRoughness = await Texture.fromUrl("/resources/examples/12/steampunk_roughness.png");

      // Side Wall Textures (need different repeat scale due to different geometry size)
      steamWallDiffuse = await Texture.fromUrl("/resources/examples/12/steampunk_diffuse.png");
      steamWallNormal = await Texture.fromUrl("/resources/examples/12/steampunk_normal.png");
      steamWallRoughness = await Texture.fromUrl("/resources/examples/12/steampunk_roughness.png");
      
      // Wooden Crate
      crateDiffuse = await Texture.fromUrl("/resources/examples/12/crate_diffuse.png");
      crateNormal = await Texture.fromUrl("/resources/examples/12/crate_normal.png");
      crateRoughness = await Texture.fromUrl("/resources/examples/12/crate_roughness.png");
      
      // Crate Branding
      brandingDiffuse = await Texture.fromUrl("/resources/examples/12/create_branding_diffuse.png");
      brandingNormal = await Texture.fromUrl("/resources/examples/12/create_branding_normal.png");
      brandingRoughness = await Texture.fromUrl("/resources/examples/12/create_branding_roughness.png");
      if (brandingDiffuse) brandingDiffuse.repeat.y = -1;
      if (brandingNormal) brandingNormal.repeat.y = -1;
      if (brandingRoughness) brandingRoughness.repeat.y = -1;
      
      // Rock Walls (Ends)
      rockDiffuse = await Texture.fromUrl("/resources/examples/12/large_rock_diffuse.png");
      rockNormal = await Texture.fromUrl("/resources/examples/12/large_rock_normal.png");
      rockRoughness = await Texture.fromUrl("/resources/examples/12/large_rock_roughness.png");
      
      // Porthole Light
      portDiffuse = await Texture.fromUrl("/resources/examples/12/porthole_diffuse.png");
      portNormal = await Texture.fromUrl("/resources/examples/12/porthole_normal.png");
      portRoughness = await Texture.fromUrl("/resources/examples/12/porthole_roughness.png");
      portEmissive = await Texture.fromUrl("/resources/examples/12/porthole_emissive.png");
      
      // Texturen kacheln (1 Repeat pro 2 World-Units)
      if (decoDiffuse) {
        decoDiffuse.repeat.x = 10; // Floor width 20 -> 10 repeats
        decoDiffuse.repeat.y = 20; // Floor depth 40 -> 20 repeats
      }
      if (steamDiffuse) {
        steamDiffuse.repeat.x = 5; // Ceiling width 20
        steamDiffuse.repeat.y = 10; // Ceiling depth 40
      }
      // Seitliche Wände (40x8)
      if (steamWallDiffuse) {
        steamWallDiffuse.repeat.x = 20;
        steamWallDiffuse.repeat.y = 4;
        if (steamWallNormal) { steamWallNormal.repeat.x = 20; steamWallNormal.repeat.y = 4; }
        if (steamWallRoughness) { steamWallRoughness.repeat.x = 20; steamWallRoughness.repeat.y = 4; }
      }
      
      // Felswände vorne/hinten (20x8)
      if (rockDiffuse) {
        rockDiffuse.repeat.x = 5; // 20 units -> 5 repeats (1 per 4 units, for larger stones)
        rockDiffuse.repeat.y = 2;
        if (rockNormal) { rockNormal.repeat.x = 5; rockNormal.repeat.y = 2; }
        if (rockRoughness) { rockRoughness.repeat.x = 5; rockRoughness.repeat.y = 2; }
      }
    } catch (e) {
      console.warn("Could not load textures:", e);
    }

    const floorMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      roughness: 1.0,
      diffuseMap: decoDiffuse,
      normalMap: decoNormal,
      roughnessMap: decoRoughness,
    });

    const ceilingMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      metallic: 1.0,
      roughness: 0.6, // Low roughness to catch specular highlights
      diffuseMap: steamDiffuse,
      normalMap: steamNormal,
      roughnessMap: steamRoughness,
    });

    const sideWallMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      metallic: 1.0,
      roughness: 0.6, // Low roughness for shiny steel
      diffuseMap: steamWallDiffuse,
      normalMap: steamWallNormal,
      roughnessMap: steamWallRoughness,
    });

    const rockMaterial = new StandardMaterial({
      diffuseMap: rockDiffuse,
      normalMap: rockNormal,
      roughnessMap: rockRoughness,
      roughness: 0.9,
      metallic: 0.0,
      color: new Color(0.8, 0.8, 0.8), // Slightly darken rocks
    });

    const portMaterial = new StandardMaterial({
      diffuseMap: portDiffuse,
      normalMap: portNormal,
      roughnessMap: portRoughness,
      emissiveMap: portEmissive,
      emissiveColor: new Color(1.0, 0.8, 0.5), // Warm glow
      emissiveIntensity: 3.0,
      transparent: true,
      roughness: 0.3,
      metallic: 0.8,
    });

    const crateMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      metallic: 0.0, // Not metal
      roughness: 0.9, // Very rough wood
      diffuseMap: crateDiffuse,
      normalMap: crateNormal,
      roughnessMap: crateRoughness,
    });

    const brandingMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      metallic: 0.0,
      roughness: 0.9,
      diffuseMap: brandingDiffuse,
      normalMap: brandingNormal,
      roughnessMap: brandingRoughness,
    });

    const applyBrandings = (crateObj: Object3D, size: number) => {
      const eps = 0.005;
      const d = size / 2 + eps;
      const faces: Array<{ name: string; pos: [number, number, number]; rot: [number, number, number] }> = [
        { name: "Top", pos: [0, d, 0], rot: [0, 0, 0] },
        { name: "Bottom", pos: [0, -d, 0], rot: [Math.PI, 0, 0] },
        { name: "Right", pos: [d, 0, 0], rot: [Math.PI / 2, 0, -Math.PI / 2] },
        { name: "Left", pos: [-d, 0, 0], rot: [Math.PI / 2, 0, Math.PI / 2] },
        { name: "Front", pos: [0, 0, -d], rot: [Math.PI / 2, Math.PI, 0] },
        { name: "Back", pos: [0, 0, d], rot: [Math.PI / 2, 0, 0] }
      ];

      // Shuffle faces and pick 3
      const shuffled = faces.sort(() => 0.5 - Math.random()).slice(0, 3);

      shuffled.forEach((face) => {
        const container = new Object3D(`Branding_Container_${face.name}`);
        container.position.set(face.pos[0] as number, face.pos[1] as number, face.pos[2] as number);
        container.rotation.set(face.rot[0] as number, face.rot[1] as number, face.rot[2] as number);

        const planeObj = new Object3D("Branding_Plane");
        planeObj.geometry = new Plane({ width: size, depth: size }).getGeometryData();
        planeObj.material = brandingMaterial;
        
        // Random 0, 90, 180, 270 degree clockwise rotation around the local normal (+Y axis)
        const randomTurns = Math.floor(Math.random() * 4);
        planeObj.rotation.y = -randomTurns * (Math.PI / 2);
        
        container.add(planeObj);
        crateObj.add(container);
      });
    };

    // 1. Floor (Art Deco)
    const floor = new Object3D("Floor").setPosition(0, 0, 0);
    floor.geometry = new Plane({ width: 20, depth: 40 }).getGeometryData();
    floor.material = floorMaterial;
    this.scene.add(floor);

    // 2. Ceiling (Steampunk)
    const ceiling = new Object3D("Ceiling").setPosition(0, 8, 0);
    ceiling.geometry = new Plane({ width: 20, depth: 40 }).getGeometryData();
    ceiling.rotation.x = Math.PI; // Face downwards
    ceiling.material = ceilingMaterial;
    this.scene.add(ceiling);

    // 3. Walls (Left & Right) (Steampunk)
    const leftWall = new Object3D("LeftWall").setPosition(-10, 4, 0).setScale(1, 8, 40);
    leftWall.geometry = new Cube({ size: 1 }).getGeometryData();
    leftWall.material = sideWallMaterial;
    this.scene.add(leftWall);

    const rightWall = new Object3D("RightWall").setPosition(10, 4, 0).setScale(1, 8, 40);
    rightWall.geometry = new Cube({ size: 1 }).getGeometryData();
    rightWall.material = sideWallMaterial;
    this.scene.add(rightWall);

    // 3.5 Walls (Front & Back) (Rock)
    const frontWall = new Object3D("FrontWall").setPosition(0, 4, -20).setScale(20, 8, 1);
    frontWall.geometry = new Cube({ size: 1 }).getGeometryData();
    frontWall.material = rockMaterial;
    this.scene.add(frontWall);

    const backWall = new Object3D("BackWall").setPosition(0, 4, 20).setScale(20, 8, 1);
    backWall.geometry = new Cube({ size: 1 }).getGeometryData();
    backWall.material = rockMaterial;
    this.scene.add(backWall);

    // 4. Large Wooden Crate (Center)
    const crate = new Object3D("OldCrate").setPosition(0, 1.5, 0); // Y=1.5 because size is 3 and center is 0
    crate.geometry = new Cube({ size: 3 }).getGeometryData();
    crate.material = crateMaterial;
    // slightly rotate to look interesting
    crate.rotation.y = Math.PI / 6;
    applyBrandings(crate, 3);
    this.scene.add(crate);

    // 5. Stack of 4 Small Crates (Corner)
    const s = 1.5; // Half size
    const y0 = s / 2; // Ground level center (0.75)
    const y1 = y0 + s; // Second layer center (2.25)

    // Three on the ground, slightly messy
    const c1 = new Object3D("SmallCrate1").setPosition(-7.5, y0, -17.5);
    c1.geometry = new Cube({ size: s }).getGeometryData();
    c1.material = crateMaterial;
    c1.rotation.y = 0.15;
    applyBrandings(c1, s);
    this.scene.add(c1);

    const c2 = new Object3D("SmallCrate2").setPosition(-5.8, y0, -17.2);
    c2.geometry = new Cube({ size: s }).getGeometryData();
    c2.material = crateMaterial;
    c2.rotation.y = -0.12;
    applyBrandings(c2, s);
    this.scene.add(c2);

    const c3 = new Object3D("SmallCrate3").setPosition(-6.8, y0, -15.8);
    c3.geometry = new Cube({ size: s }).getGeometryData();
    c3.material = crateMaterial;
    c3.rotation.y = 0.28;
    applyBrandings(c3, s);
    this.scene.add(c3);

    // One on top
    const c4 = new Object3D("SmallCrate4").setPosition(-6.6, y1, -16.8);
    c4.geometry = new Cube({ size: 1.5 }).getGeometryData();
    c4.material = crateMaterial;
    c4.rotation.y = -0.25;
    applyBrandings(c4, 1.5);
    this.scene.add(c4);

    // 5. Porthole Light (Decal on Left Wall)
    const porthole = new Object3D("Porthole").setPosition(-9.49, 4, -5);
    // Rotate to face +X
    porthole.rotation.z = -Math.PI / 2;
    porthole.geometry = new Plane({ width: 2, depth: 2 }).getGeometryData();
    porthole.material = portMaterial;
    this.scene.add(porthole);

    // Add a SpotLight to cast a beam into the room
    const portLight = new SpotLight({ 
      color: new Color(1.0, 0.8, 0.5), 
      intensity: 2.5,
      direction: new Vector3D(1, 0, 0), // Pointing exactly AWAY from the left wall
      angle: Math.PI / 4, // 45 degrees cone
      penumbra: 0.5,
      distance: 30.0
    });
    portLight.position.set(-9.4, 4, -5); // Positioned slightly in front of the porthole glass
    this._portLight = portLight;
    this.scene.add(portLight);

    // 6. Lighting: Ambient (Brighter to see the textures)
    this.scene.add(new AmbientLight({ color: new Color(0.1, 0.1, 0.15), intensity: 0.8 }));

    // 5. Lighting: Moon/Ocean rays coming from above/side
    const oceanLight = new DirectionalLight({ color: new Color(0.4, 0.7, 1.0), intensity: 1.5 });
    oceanLight.direction.set(1, -1, 0);
    this.scene.add(oceanLight);

    // 6. Lighting: Flickering orange neon/broken lamp (Stronger for reflections)
    this._flickerLight = new PointLight({ color: new Color(1.0, 0.5, 0.0), intensity: 10.0 });
    this._flickerLight.position.set(0, 4, -5);
    this.scene.add(this._flickerLight);

    // 7. Camera & Controls (FPS)
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 10);
    this.camera.target.set(0, 2, 0);
    this.camera.updateViewMatrix();

    // Initialize collision octree (world boundaries: -30 to 30)
    this.scene.initOctrees(new BoundingBox(new Vector3D(-30, -5, -50), new Vector3D(30, 15, 50)));

    // Add WASD/Mouse controller with collisions
    this.controllers.push(new FPSController(this.camera, { 
      moveSpeed: 5.0,
      enableCollision: true,
      scene: this.scene,
      collisionRadius: 0.8
    }));

    // Pointer Lock
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;

    // Adjust porthole light intensity via NumpadAdd (+) and NumpadSubtract (-)
    if (Input.isPressed("NumpadAdd") || Input.isPressed("Equal") || Input.isPressed("BracketRight")) {
      this._portLight.intensity += deltaTime * 2.0;
      console.log(`[Porthole] Light Intensity: ${this._portLight.intensity.toFixed(2)}`);
    }
    if (Input.isPressed("NumpadSubtract") || Input.isPressed("Minus") || Input.isPressed("Slash")) {
      this._portLight.intensity = Math.max(0, this._portLight.intensity - deltaTime * 2.0);
      console.log(`[Porthole] Light Intensity: ${this._portLight.intensity.toFixed(2)}`);
    }

    // Flickering logic: using Math.random combined with sine wave for an irregular pattern
    const flicker = Math.abs(Math.sin(this._time * 10)) * (Math.random() > 0.8 ? 0.2 : 1.0);
    this._flickerLight.intensity = 2.0 * flicker;

    this.scene.update();
  }
}

// === START THE ENGINE ===
const app: AbyssalDecoExample = new AbyssalDecoExample();
app
  .start()
  .then((): void => {
    console.log("AbyssalDeco Example running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
