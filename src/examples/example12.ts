/// src/examples/example12.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  Gear,
  GearMath,
  GearParameters,
  Object3D,
  PerspectiveProjection,
  Plane,
  Sphere,
  ProjectionType,
  PhongMaterial,
  StandardMaterial,
  Texture,
  BoundingBox,
  Vector2D,
  Vector3D,
  SpotLight,
  LightFlickerBehavior,
  ProximitySensorBehavior,
  Fog,
  FogMode,
} from "../index.js";
import { AbstractExample, Input } from "../core/index.js";

class AbyssalDecoExample extends AbstractExample {
  private _portLight!: SpotLight;
  private _portLightBehavior!: LightFlickerBehavior;
  private _portMaterial?: StandardMaterial;
  private _time: number = 0;
  private _gears: { obj: Object3D; speed: number }[] = [];
  private _waterDrops: { obj: Object3D; velocityY: number; active: boolean }[] = [];

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
    // --- Fog Setup ---
    // A room length is 40. 1/5 of that is 8.
    // At density 0.06, EXP2 fog starts becoming visible around distance 8,
    // and becomes very thick towards the walls at distance 20-30.
    this.scene.fog = new Fog({
      mode: FogMode.LINEAR,
      color: new Color(0.0, 0.1, 0.15), // Dark abyssal teal/blue
      near: 7.0, // Kein Nebel in der Mitte (ca. 1/3 der Distanz)
      far: 22.0, // Dichter Nebel an den Wänden (Wände sind ca bei Distanz 20)
      height: 0.0,
      heightFalloff: 0.0, // No falloff, pure distance fog
    });

    // 1. Textures & Materials
    let decoDiffuse: Texture | undefined;
    let decoNormal: Texture | undefined;
    let decoRoughness: Texture | undefined;

    let brassDiffuse: Texture | undefined;
    let brassNormal: Texture | undefined;
    let brassRoughness: Texture | undefined;

    let steelDiffuse: Texture | undefined;
    let steelNormal: Texture | undefined;
    let steelRoughness: Texture | undefined;

    let steamDiffuse: Texture | undefined;
    let steamNormal: Texture | undefined;
    let steamRoughness: Texture | undefined;

    let steamWallDiffuse: Texture | undefined;
    let steamWallNormal: Texture | undefined;
    let steamWallRoughness: Texture | undefined;

    let crateDiffuse: Texture | undefined;
    let crateNormal: Texture | undefined;
    let crateSpecular: Texture | undefined;

    let brandingDiffuse: Texture | undefined;
    let brandingNormal: Texture | undefined;
    let brandingSpecular: Texture | undefined;

    let rockDiffuse: Texture | undefined;
    let rockNormal: Texture | undefined;
    let rockRoughness: Texture | undefined;

    let portDiffuse: Texture | undefined;
    let portNormal: Texture | undefined;
    let portRoughness: Texture | undefined;

    try {
      decoDiffuse = await Texture.fromUrl("/resources/examples/12/artdeco_diffuse.png");
      decoNormal = await Texture.fromUrl("/resources/examples/12/artdeco_normal.png");
      decoRoughness = await Texture.fromUrl("/resources/examples/12/artdeco_roughness.png");

      brassDiffuse = await Texture.fromUrl("/resources/examples/12/rusty_brass_diffuse.png");
      if (brassDiffuse) {
        brassDiffuse.repeat.x = 2;
        brassDiffuse.repeat.y = 2;
      }
      brassNormal = await Texture.fromUrl("/resources/examples/12/rusty_brass_normal.png");
      if (brassNormal) {
        brassNormal.repeat.x = 2;
        brassNormal.repeat.y = 2;
      }
      brassRoughness = await Texture.fromUrl("/resources/examples/12/rusty_brass_roughness.png");
      if (brassRoughness) {
        brassRoughness.repeat.x = 2;
        brassRoughness.repeat.y = 2;
      }

      steelDiffuse = await Texture.fromUrl("/resources/examples/12/scratched_steel_diffuse.png");
      if (steelDiffuse) {
        steelDiffuse.repeat.x = 2;
        steelDiffuse.repeat.y = 2;
      }
      steelNormal = await Texture.fromUrl("/resources/examples/12/scratched_steel_normal.png");
      if (steelNormal) {
        steelNormal.repeat.x = 2;
        steelNormal.repeat.y = 2;
      }
      steelRoughness = await Texture.fromUrl(
        "/resources/examples/12/scratched_steel_roughness.png",
      );
      if (steelRoughness) {
        steelRoughness.repeat.x = 2;
        steelRoughness.repeat.y = 2;
      }

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
      crateSpecular = await Texture.fromUrl("/resources/examples/12/crate_specular.png");
      if (crateDiffuse) crateDiffuse.repeat.y = -1;
      if (crateNormal) crateNormal.repeat.y = -1;
      if (crateSpecular) crateSpecular.repeat.y = -1;

      // Crate Branding
      brandingDiffuse = await Texture.fromUrl("/resources/examples/12/crate_branded_diffuse.png");
      brandingNormal = await Texture.fromUrl("/resources/examples/12/crate_branded_normal.png");
      brandingSpecular = await Texture.fromUrl("/resources/examples/12/crate_branded_specular.png");
      if (brandingDiffuse) brandingDiffuse.repeat.y = -1;
      if (brandingNormal) brandingNormal.repeat.y = -1;
      if (brandingSpecular) brandingSpecular.repeat.y = -1;

      // Rock Walls (Ends)
      rockDiffuse = await Texture.fromUrl("/resources/examples/12/large_rock_diffuse.png");
      rockNormal = await Texture.fromUrl("/resources/examples/12/large_rock_normal.png");
      rockRoughness = await Texture.fromUrl("/resources/examples/12/large_rock_roughness.png");

      // Baulicht (Construction Light)
      portDiffuse = await Texture.fromUrl("/resources/examples/12/porthole_diffuse.png");
      portNormal = await Texture.fromUrl("/resources/examples/12/porthole_normal.png");
      portRoughness = await Texture.fromUrl("/resources/examples/12/porthole_roughness.png");

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
        if (steamWallNormal) {
          steamWallNormal.repeat.x = 20;
          steamWallNormal.repeat.y = 4;
        }
        if (steamWallRoughness) {
          steamWallRoughness.repeat.x = 20;
          steamWallRoughness.repeat.y = 4;
        }
      }

      // Felswände vorne/hinten (20x8)
      if (rockDiffuse) {
        rockDiffuse.repeat.x = 5; // 20 units -> 5 repeats (1 per 4 units, for larger stones)
        rockDiffuse.repeat.y = 2;
        if (rockNormal) {
          rockNormal.repeat.x = 5;
          rockNormal.repeat.y = 2;
        }
        if (rockRoughness) {
          rockRoughness.repeat.x = 5;
          rockRoughness.repeat.y = 2;
        }
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

    const brassMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      diffuseMap: brassDiffuse,
      normalMap: brassNormal,
      roughnessMap: brassRoughness,
      metallic: 0.8,
      roughness: 0.6,
    });

    const steelMaterial = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      diffuseMap: steelDiffuse,
      normalMap: steelNormal,
      roughnessMap: steelRoughness,
      metallic: 0.9,
      roughness: 0.4,
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
      color: new Color(0.2, 0.2, 0.2), // Dark base
      diffuseMap: portDiffuse,
      normalMap: portNormal,
      roughnessMap: portRoughness,
      emissiveMap: portDiffuse, // Use diffuse as emissive mask so the black grid stays dark!
      emissiveColor: new Color(1.0, 0.8, 0.5), // Warm glow
      emissiveIntensity: 3.0,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.3,
      metallic: 0.8,
    });
    this._portMaterial = portMaterial;

    const crateMaterial = new PhongMaterial({
      color: new Color(1.0, 1.0, 1.0),
      diffuseMap: crateDiffuse,
      normalMap: crateNormal,
      normalScale: new Vector2D(1, -1), // Fix for DirectX normal map
      specularMap: crateSpecular,
      shininess: 32.0,
    });

    const brandingMaterial = new PhongMaterial({
      color: new Color(1.0, 1.0, 1.0),
      diffuseMap: brandingDiffuse,
      normalMap: brandingNormal,
      normalScale: new Vector2D(1, -1), // Fix for DirectX normal map
      specularMap: brandingSpecular,
      shininess: 32.0,
    });

    // Helper to build a solid crate from 6 Plane geometries,
    // randomly assigning the branded texture to some faces.
    const createCrate = (name: string, size: number, numBrandings: number = 3): Object3D => {
      const crateGroup = new Object3D(name);
      const d = size / 2;
      const faces: Array<{
        name: string;
        pos: [number, number, number];
        rot: [number, number, number];
      }> = [
        { name: "Top", pos: [0, d, 0], rot: [0, 0, 0] },
        { name: "Bottom", pos: [0, -d, 0], rot: [Math.PI, 0, 0] },
        { name: "Right", pos: [d, 0, 0], rot: [Math.PI / 2, 0, -Math.PI / 2] },
        { name: "Left", pos: [-d, 0, 0], rot: [Math.PI / 2, 0, Math.PI / 2] },
        { name: "Front", pos: [0, 0, -d], rot: [Math.PI / 2, Math.PI, 0] },
        { name: "Back", pos: [0, 0, d], rot: [Math.PI / 2, 0, 0] },
      ];

      // Randomly pick which faces get the branding
      const shuffledIndices = [0, 1, 2, 3, 4, 5].sort(() => 0.5 - Math.random());
      const brandedIndices = new Set(shuffledIndices.slice(0, numBrandings));

      faces.forEach((face, index) => {
        const isBranded = brandedIndices.has(index);

        const container = new Object3D(`${name}_${face.name}_Container`);
        container.position.set(face.pos[0], face.pos[1], face.pos[2]);
        container.rotation.set(face.rot[0], face.rot[1], face.rot[2]);

        const faceObj = new Object3D(`${name}_${face.name}_Plane`);
        faceObj.geometry = new Plane({ width: size, depth: size }).getGeometryData();
        faceObj.material = isBranded ? brandingMaterial : crateMaterial;
        faceObj.castShadow = true;
        faceObj.receiveShadow = true;

        if (isBranded) {
          // Random 0, 90, 180, 270 degree clockwise rotation around the local normal (+Y axis)
          const randomTurns = Math.floor(Math.random() * 4);
          faceObj.rotation.y = -randomTurns * (Math.PI / 2);
        }

        container.add(faceObj);
        crateGroup.add(container);
      });

      return crateGroup;
    };

    // 1. Floor (Art Deco)
    const floor = new Object3D("Floor").setPosition(0, 0, 0);
    floor.geometry = new Plane({ width: 20, depth: 40 }).getGeometryData();
    floor.material = floorMaterial;
    floor.castShadow = false; // Floor usually doesn't cast shadow on itself, but receives
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Ceiling (Steampunk)
    const ceiling = new Object3D("Ceiling").setPosition(0, 8, 0);
    ceiling.geometry = new Plane({ width: 20, depth: 40 }).getGeometryData();
    ceiling.rotation.x = Math.PI; // Face downwards
    ceiling.material = ceilingMaterial;
    ceiling.castShadow = false;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    // 3. Walls (Left & Right) (Steampunk)
    const leftWall = new Object3D("LeftWall").setPosition(-10, 4, 0).setScale(1, 8, 40);
    leftWall.geometry = new Cube({ size: 1 }).getGeometryData();
    leftWall.material = sideWallMaterial;
    leftWall.castShadow = false;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new Object3D("RightWall").setPosition(10, 4, 0).setScale(1, 8, 40);
    rightWall.geometry = new Cube({ size: 1 }).getGeometryData();
    rightWall.material = sideWallMaterial;
    rightWall.castShadow = false;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // 3.5 Walls (Front & Back) (Rock)
    const frontWall = new Object3D("FrontWall").setPosition(0, 4, -20).setScale(20, 8, 1);
    frontWall.geometry = new Cube({ size: 1 }).getGeometryData();
    frontWall.material = rockMaterial;
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    const backWall = new Object3D("BackWall").setPosition(0, 4, 20).setScale(20, 8, 1);
    backWall.geometry = new Cube({ size: 1 }).getGeometryData();
    backWall.material = rockMaterial;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // 3.8 Steampunk Gears (Composite with Spokes using GearMath)
    const createSpokedGear = (
      name: string,
      module: number,
      thickness: number,
      numTeeth: number,
      numSpokes: number,
      rimMaterial: StandardMaterial,
      spokeMaterial: StandardMaterial,
    ): { obj: Object3D; params: GearParameters } => {
      const gearGroup = new Object3D(name);

      const params = GearMath.getGearParams(module, numTeeth);

      const rimWidth = params.innerRadius * 0.2; // Width of the solid metal ring
      const holeRadius = params.innerRadius - rimWidth;

      // 1. The Rim (Kranz)
      const rim = new Object3D(`${name}_Rim`);
      rim.geometry = new Gear({
        teeth: numTeeth,
        innerRadius: params.innerRadius,
        holeRadius: holeRadius,
        toothHeight: params.toothHeight,
        vRatio: 0.5,
        thickness: thickness,
      }).getGeometryData();
      rim.material = rimMaterial;
      rim.castShadow = true;
      rim.receiveShadow = true;
      gearGroup.add(rim);

      // 2. The Hub (Nabe)
      const hubRadius = params.innerRadius * 0.3;
      const hubHole = hubRadius * 0.4;
      const hub = new Object3D(`${name}_Hub`);
      hub.geometry = new Gear({
        teeth: 32,
        innerRadius: hubRadius,
        holeRadius: hubHole,
        toothHeight: 0,
        vRatio: 1.0,
        thickness: thickness * 1.2,
      }).getGeometryData();
      hub.material = rimMaterial;
      hub.castShadow = true;
      hub.receiveShadow = true;
      gearGroup.add(hub);

      // 3. The Spokes (Speichen)
      const spokeLength = holeRadius - hubRadius + 0.1;
      const spokeWidth = params.innerRadius * 0.12;
      const spokeThickness = thickness * 0.6;

      for (let i = 0; i < numSpokes; i++) {
        const angle = (i / numSpokes) * Math.PI * 2;
        const spoke = new Object3D(`${name}_Spoke_${i}`);
        spoke.geometry = new Cube({ size: 1 }).getGeometryData();
        spoke.setScale(spokeLength, spokeWidth, spokeThickness);

        const dist = hubRadius + spokeLength / 2 - 0.05;
        spoke.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
        spoke.rotation.z = angle;

        spoke.material = spokeMaterial;
        spoke.castShadow = true;
        spoke.receiveShadow = true;
        gearGroup.add(spoke);
      }

      return { obj: gearGroup, params };
    };

    const gearModule = 0.25;

    // Gear 1: Brass, large (16 teeth)
    const gear1Data = createSpokedGear(
      "Gear_Brass_Large",
      gearModule,
      0.4,
      16,
      5,
      brassMaterial,
      steelMaterial,
    );
    const gear1 = gear1Data.obj;
    gear1.position.set(-8.8, 4, -8); // Moved down by another 1 unit
    gear1.rotation.y = Math.PI / 2;
    // Initial rotation
    gear1.rotation.z = 0;
    this.scene.add(gear1);
    this._gears.push({ obj: gear1, speed: 0.5 }); // Base speed

    // Gear 2: Steel, medium (10 teeth)
    const gear2Data = createSpokedGear(
      "Gear_Steel_Medium",
      gearModule,
      0.3,
      10,
      4,
      steelMaterial,
      brassMaterial,
    );
    const gear2 = gear2Data.obj;
    const dist1to2 = GearMath.getCenterDistance(gearModule, 16, 10);
    const angle1to2 = -Math.PI / 6; // 30 degrees down and forward along Z
    gear2.position.set(
      -8.8,
      gear1.position.y + Math.sin(angle1to2) * dist1to2,
      gear1.position.z + Math.cos(angle1to2) * dist1to2,
    );
    gear2.rotation.y = Math.PI / 2;

    // Mathematically perfect meshing rotation
    const mapToXY = (v: Vector3D): Vector3D => new Vector3D(v.z, v.y, 0);
    gear2.rotation.z = GearMath.getMeshingRotation(
      mapToXY(gear1.position),
      gear1.rotation.z,
      gear1Data.params,
      mapToXY(gear2.position),
      gear2Data.params,
    );
    this.scene.add(gear2);
    this._gears.push({ obj: gear2, speed: GearMath.getDrivenSpeed(0.5, 16, 10) });

    // Gear 3: Steel, small (6 teeth)
    const gear3Data = createSpokedGear(
      "Gear_Steel_Small",
      gearModule,
      0.3,
      6,
      3,
      steelMaterial,
      steelMaterial,
    );
    const gear3 = gear3Data.obj;
    const dist2to3 = GearMath.getCenterDistance(gearModule, 10, 6);

    const angle2to3 = Math.PI / 8; // 22.5 degrees up and forward along Z
    gear3.position.set(
      -8.8,
      gear2.position.y + Math.sin(angle2to3) * dist2to3,
      gear2.position.z + Math.cos(angle2to3) * dist2to3,
    );
    gear3.rotation.y = Math.PI / 2;

    // Speed of gear3 driven by gear2
    const speed3 = GearMath.getDrivenSpeed(GearMath.getDrivenSpeed(0.5, 16, 10), 10, 6);

    gear3.rotation.z = GearMath.getMeshingRotation(
      mapToXY(gear2.position),
      gear2.rotation.z,
      gear2Data.params,
      mapToXY(gear3.position),
      gear3Data.params,
    );
    this.scene.add(gear3);
    this._gears.push({ obj: gear3, speed: speed3 });

    // 4. Large Wooden Crate (Center)
    const crate = createCrate("OldCrate", 3, 3);
    crate.setPosition(0, 1.5, 0); // Y=1.5 because size is 3 and center is 0
    // slightly rotate to look interesting
    crate.rotation.y = Math.PI / 6;
    this.scene.add(crate);

    // 5. Stack of 4 Small Crates (Corner -> moved 3 units diagonally)
    const s = 1.5; // Half size
    const y0 = s / 2; // Ground level center (0.75)
    const y1 = y0 + s; // Second layer center (2.25)

    // Three on the ground, slightly messy
    // Original positions + 2.1 on X and Z (approx 3 units diagonal distance)
    const c1 = createCrate("SmallCrate1", s, 1);
    c1.setPosition(-5.4, y0, -15.4);
    c1.rotation.y = 0.15;
    this.scene.add(c1);

    const c2 = createCrate("SmallCrate2", s, 1);
    c2.setPosition(-3.7, y0, -15.1);
    c2.rotation.y = -0.12;
    this.scene.add(c2);

    const c3 = createCrate("SmallCrate3", s, 1);
    c3.setPosition(-4.7, y0, -13.7);
    c3.rotation.y = 0.28;
    this.scene.add(c3);

    // One on top
    const c4 = createCrate("SmallCrate4", 1.5, 2);
    c4.setPosition(-4.5, y1, -14.7);
    c4.rotation.y = -0.25;
    this.scene.add(c4);

    // 5. Portholes (Bullaugen on the Rock Walls)
    const createPorthole = (name: string, radius: number): Object3D => {
      const group = new Object3D(name);

      // Frame
      const frame = new Object3D(`${name}_Frame`);
      frame.geometry = new Gear({
        teeth: 32,
        innerRadius: radius,
        holeRadius: radius * 0.8,
        toothHeight: 0,
        vRatio: 1.0,
        thickness: 0.4,
      }).getGeometryData();
      frame.material = brassMaterial;
      frame.castShadow = true;
      frame.receiveShadow = true;
      group.add(frame);

      // Glass (A flattened sphere inside the frame)
      const glass = new Object3D(`${name}_Glass`);
      glass.geometry = new Sphere({
        radius: radius * 0.85,
        widthSegments: 16,
        heightSegments: 16,
      }).getGeometryData();
      glass.setScale(1.0, 1.0, 0.2); // Flattened on Z axis

      const glassMaterial = new StandardMaterial({
        color: new Color(0.0, 0.1, 0.2),
        emissiveColor: new Color(0.0, 0.4, 0.5), // Glowing cyan
        emissiveIntensity: 3.0,
        roughness: 0.1,
        metallic: 0.9,
      });
      glass.material = glassMaterial;
      group.add(glass);

      return group;
    };

    // Pair on Front Wall (Z = -19.5, faces +Z)
    const porthole1 = createPorthole("Porthole_Front1", 1.5);
    porthole1.position.set(-5, 5, -19.49);
    porthole1.rotation.y = 0;
    this.scene.add(porthole1);

    const porthole2 = createPorthole("Porthole_Front2", 1.5);
    porthole2.position.set(5, 5, -19.49);
    porthole2.rotation.y = 0;
    this.scene.add(porthole2);

    // Pair on Back Wall (Z = 19.5, faces -Z)
    const porthole3 = createPorthole("Porthole_Back1", 1.5);
    porthole3.position.set(-5, 5, 19.49);
    porthole3.rotation.y = Math.PI;
    this.scene.add(porthole3);

    const porthole4 = createPorthole("Porthole_Back2", 1.5);
    porthole4.position.set(5, 5, 19.49);
    porthole4.rotation.y = Math.PI;
    this.scene.add(porthole4);

    // 6. Dripping Water Particles
    const waterMaterial = new StandardMaterial({
      color: new Color(0.7, 0.8, 0.9),
      roughness: 0.0,
      metallic: 1.0,
    });

    for (let i = 0; i < 30; i++) {
      const drop = new Object3D(`WaterDrop_${i}`);
      drop.geometry = new Sphere({
        radius: 0.04,
        widthSegments: 8,
        heightSegments: 8,
      }).getGeometryData();
      drop.material = waterMaterial;
      drop.castShadow = true;
      drop.position.set(0, -4, 0); // Hide initially below ground
      this.scene.add(drop);
      this._waterDrops.push({ obj: drop, velocityY: 0, active: false });
    }

    // 7. Baulicht (Construction Light) on the Right Wall
    const baulichtGroup = new Object3D("BaulichtGroup").setPosition(9.49, 4, -5);
    // Rotate entire group so +Z faces -X (towards the room)
    baulichtGroup.rotation.y = -Math.PI / 2;

    // Sockel (Base/Frame) connecting the light to the wall
    const baulichtSockel = new Object3D("Baulicht_Sockel");
    baulichtSockel.geometry = new Gear({
      teeth: 32,
      innerRadius: 1.7, // Made larger so it extends beyond the painted metal rim
      holeRadius: 0.0, // Solid base
      toothHeight: 0,
      vRatio: 1.0,
      thickness: 0.5,
    }).getGeometryData();
    baulichtSockel.material = brassMaterial;
    baulichtSockel.castShadow = true;
    baulichtSockel.receiveShadow = true;
    // The wall is at local Z = 0 (after group rotation).
    // The Sockel goes from -0.25 to 0.25.
    baulichtSockel.position.set(0, 0, 0.25); // Push it out so it starts at the wall
    baulichtGroup.add(baulichtSockel);

    // The Light Surface (Decal with Baugitter)
    const baulichtSurface = new Object3D("Baulicht_Surface");
    baulichtSurface.geometry = new Plane({ width: 2.8, depth: 2.8 }).getGeometryData();
    baulichtSurface.material = portMaterial;
    baulichtSurface.castShadow = false;
    // Plane is on XZ plane (+Y normal). Rotate X by 90deg to face +Z
    baulichtSurface.rotation.x = Math.PI / 2;
    // Place it exactly on top of the Sockel
    baulichtSurface.position.set(0, 0, 0.51);
    baulichtGroup.add(baulichtSurface);

    this.scene.add(baulichtGroup);

    // Add the SpotLight back to the Baulicht
    const portLight = new SpotLight({
      color: new Color(1.0, 0.8, 0.5),
      intensity: 10.0,
      direction: new Vector3D(-1, -0.2, 0), // Pointing -X (from right wall to left wall)
      angle: Math.PI / 4,
      penumbra: 0.5,
      distance: 40.0,
    });
    portLight.position.set(9.4, 4, -5); // Positioned slightly in front of the decal
    portLight.castShadow = true;
    portLight.shadowResolution = 1024;
    portLight.shadowBias = 0.015;
    this._portLight = portLight;

    // Add our new Behavior to the light
    this._portLightBehavior = new LightFlickerBehavior({
      baseIntensity: 10.0,
      flickerColor: new Color(1.0, 0.0, 0.0), // Deep red when it flickers/dims
    });
    this._portLight.addBehavior(this._portLightBehavior);

    // Attach Proximity Sensor to increase flicker speed and intensity when player approaches
    this._portLight.addBehavior(
      new ProximitySensorBehavior({
        targetObj: this.camera, // The player
        radius: 15.0, // Start reacting at 15 units away so it's easier to notice
        minDistance: 2.0, // Max intensity at 2 unit distance
        onUpdate: (factor: number): void => {
          // factor is 0.0 (far) to 1.0 (very close)

          // Boost base intensity up to 250% (10.0 * 2.5) for extreme debugging visibility
          this._portLightBehavior.options.baseIntensity = 10.0 * (1.0 + 1.5 * factor);

          // Reduce stable time (0% at full proximity, i.e., constant flickering)
          this._portLightBehavior.options.minStableTime = 2.0 * (1.0 - factor);
          this._portLightBehavior.options.maxStableTime = 6.0 * (1.0 - factor);

          // Speed up the flickering itself
          this._portLightBehavior.options.minFlickerTime = 0.2 - 0.1 * factor;
        },
      }),
    );

    this.scene.add(portLight);

    // 6. Lighting: Ambient (Increased to balance contrast and prevent pitch-black shadows)
    this.scene.add(new AmbientLight({ color: new Color(0.1, 0.1, 0.15), intensity: 0.4 }));

    // 7. Lighting: Moon/Ocean rays coming from above/side (Dimmed)
    const oceanLight = new DirectionalLight({ color: new Color(0.4, 0.7, 1.0), intensity: 1.0 }); // Increased for visibility
    oceanLight.direction.set(1, -1, 0);
    oceanLight.castShadow = true; // Enable CSM Shadows
    oceanLight.shadowBias = 0.005;
    this.scene.add(oceanLight);

    // 7. Camera & Controls (FPS)
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 10);
    this.camera.target.set(0, 2, 0);
    this.camera.updateViewMatrix();

    // Initialize collision octree (world boundaries: -30 to 30)
    this.scene.initOctrees(new BoundingBox(new Vector3D(-30, -5, -50), new Vector3D(30, 15, 50)));

    // Add WASD/Mouse controller with collisions
    const fpsController = new FPSController({
      moveSpeed: 5.0,
      enableCollision: true,
      scene: this.scene,
      collisionRadius: 0.8,
    });
    this.camera.addBehavior(fpsController);

    // Pointer Lock
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;

    if (this._portLight && this._portMaterial) {
      // Sync the light bulb's emissive intensity with the actual flickering light intensity
      this._portMaterial.emissiveIntensity = (this._portLight.intensity / 10.0) * 3.0;
    }

    // Adjust base porthole light intensity via NumpadAdd (+) and NumpadSubtract (-)
    if (
      Input.isPressed("NumpadAdd") ||
      Input.isPressed("Equal") ||
      Input.isPressed("BracketRight")
    ) {
      this._portLightBehavior.options.baseIntensity += deltaTime * 5.0;
      console.log(
        `[Porthole] Base Intensity: ${this._portLightBehavior.options.baseIntensity.toFixed(2)}`,
      );
    }
    if (Input.isPressed("NumpadSubtract") || Input.isPressed("Minus") || Input.isPressed("Slash")) {
      this._portLightBehavior.options.baseIntensity = Math.max(
        0,
        this._portLightBehavior.options.baseIntensity - deltaTime * 5.0,
      );
      console.log(
        `[Porthole] Base Intensity: ${this._portLightBehavior.options.baseIntensity.toFixed(2)}`,
      );
    }

    // Update gears
    for (const gear of this._gears) {
      gear.obj.rotation.z += gear.speed * deltaTime;
    }

    // Update Water Drops
    for (const drop of this._waterDrops) {
      if (drop.active) {
        drop.velocityY -= 15.0 * deltaTime; // Gravity
        drop.obj.position.y += drop.velocityY * deltaTime;

        // Motion blur stretch
        const stretch = 1.0 + Math.abs(drop.velocityY) * 0.15;
        drop.obj.setScale(1.0, stretch, 1.0);

        if (drop.obj.position.y <= 0.1) {
          drop.active = false;
          drop.obj.position.y = -4; // Hide (but stay within Octree Y > -5)
        }
      } else {
        // Spawn chance based on time
        if (Math.random() < 1.0 * deltaTime) {
          // e.g. at 60 FPS, 1.6% chance per frame per drop
          drop.active = true;
          drop.velocityY = 0;
          // Random position on the ceiling
          const rx = (Math.random() - 0.5) * 16; // -8 to 8
          const rz = (Math.random() - 0.5) * 26 + 5; // -8 to 18
          drop.obj.position.set(rx, 9.8, rz);
          drop.obj.setScale(1.0, 1.0, 1.0);
        }
      }
    }
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
