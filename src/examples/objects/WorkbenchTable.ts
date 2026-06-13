import { Object3D } from "../../index.js";
import { Cube, Cylinder } from "../../index.js";
import { AbstractMaterial } from "../../index.js";

export interface WorkbenchTableOptions {
  /** Width in meters (X-axis). Default: 1.2 */
  width?: number;
  /** Depth in meters (Z-axis). Default: 0.7 */
  depth?: number;
  /** Height in meters (Y-axis). Default: 0.45 */
  height?: number;
  /** Thickness of the tabletop in meters. Default: 0.08 */
  topThickness?: number;
  /** Material for the wooden parts */
  woodMaterial?: AbstractMaterial;
  /** Material for the metal bolts and frames */
  metalMaterial?: AbstractMaterial;
}

export class WorkbenchTable extends Object3D {
  constructor(name: string, options: WorkbenchTableOptions = {}) {
    super(name);

    // 1 Unit = 1 Meter approach
    const w = options.width ?? 1.2;
    const d = options.depth ?? 0.7;
    const h = options.height ?? 0.45;
    const t = options.topThickness ?? 0.08;

    const woodMat = options.woodMaterial;
    const metalMat = options.metalMaterial;

    const unitCubeGeo = new Cube({ size: 1 }).getGeometryData();

    // --- 1. TABLE TOP ---
    const topGroup = new Object3D(`${name}_Top`);
    topGroup.position.set(0, h - t / 2, 0); // Origin is in the center of the tabletop volume

    // Breadboard ends (Hirnholzleisten)
    const breadboardWidth = 0.12; // 12cm wide breadboards

    const bbLeft = new Object3D(`${name}_BB_Left`);
    bbLeft.geometry = unitCubeGeo;
    bbLeft.scale.set(breadboardWidth, t, d);
    if (woodMat) bbLeft.material = woodMat;
    bbLeft.castShadow = true;
    bbLeft.receiveShadow = true;
    bbLeft.position.set(-w / 2 + breadboardWidth / 2, 0, 0);
    topGroup.add(bbLeft);

    const bbRight = new Object3D(`${name}_BB_Right`);
    bbRight.geometry = unitCubeGeo;
    bbRight.scale.set(breadboardWidth, t, d);
    if (woodMat) bbRight.material = woodMat;
    bbRight.castShadow = true;
    bbRight.receiveShadow = true;
    bbRight.position.set(w / 2 - breadboardWidth / 2, 0, 0);
    topGroup.add(bbRight);

    // Middle Planks
    const innerWidth = w - breadboardWidth * 2;
    const numPlanks = 4;
    const plankDepth = d / numPlanks;
    // We add a tiny gap between planks to sell the illusion
    const gap = 0.005;
    const actualPlankDepth = plankDepth - gap;

    for (let i = 0; i < numPlanks; i++) {
      const plank = new Object3D(`${name}_Plank_${i}`);
      plank.geometry = unitCubeGeo;
      plank.scale.set(innerWidth, t, actualPlankDepth);
      if (woodMat) plank.material = woodMat;
      plank.castShadow = true;
      plank.receiveShadow = true;
      const zPos = -d / 2 + plankDepth * i + plankDepth / 2;
      plank.position.set(0, 0, zPos);
      topGroup.add(plank);
    }

    // Top Bolts (on breadboards)
    const boltWasherGeo = new Cylinder({
      radiusTop: 0.03,
      radiusBottom: 0.03,
      height: 0.005,
      radialSegments: 16,
    }).getGeometryData();

    const addTopBolt = (x: number, z: number): void => {
      const boltGroup = new Object3D(`${name}_Bolt_${x}_${z}`);
      boltGroup.position.set(x, t / 2, z);

      const washer = new Object3D(`${name}_Washer`);
      washer.geometry = boltWasherGeo;
      if (metalMat) washer.material = metalMat;
      washer.position.set(0, 0.0025, 0);
      washer.castShadow = true;
      boltGroup.add(washer);

      const nut = new Object3D(`${name}_Nut`);
      nut.geometry = unitCubeGeo;
      nut.scale.set(0.03, 0.02, 0.03);
      if (metalMat) nut.material = metalMat;
      nut.position.set(0, 0.005 + 0.01, 0); // Above washer
      nut.castShadow = true;
      // Slight random rotation for realism
      nut.rotation.y = (Math.random() * Math.PI) / 4;
      boltGroup.add(nut);

      topGroup.add(boltGroup);
    };

    // Place bolts on the breadboards
    const boltX = w / 2 - breadboardWidth / 2;
    const boltZ = d / 2 - 0.1;
    addTopBolt(boltX, boltZ);
    addTopBolt(boltX, -boltZ);
    addTopBolt(-boltX, boltZ);
    addTopBolt(-boltX, -boltZ);

    this.add(topGroup);

    // --- 2. THE BASE ---
    const baseGroup = new Object3D(`${name}_Base`);

    // Runners (Bodenkufen)
    const runnerHeight = 0.08;
    const runnerWidth = 0.12;
    const runnerDepth = d - 0.05; // Slightly shorter than table depth

    const legWidth = 0.1;
    const legDepth = 0.1;
    // Leg height goes from top of runner to bottom of tabletop
    const legHeight = h - t - runnerHeight;

    const legInsetX = w / 2 - breadboardWidth - 0.1; // Place legs just inside the breadboards

    const createSideBase = (x: number, isLeft: boolean): void => {
      const sideGroup = new Object3D(`${name}_SideBase_${isLeft ? "L" : "R"}`);
      sideGroup.position.set(x, 0, 0);

      const runner = new Object3D(`${name}_Runner`);
      runner.geometry = unitCubeGeo;
      runner.scale.set(runnerWidth, runnerHeight, runnerDepth);
      if (woodMat) runner.material = woodMat;
      runner.position.set(0, runnerHeight / 2, 0);
      runner.castShadow = true;
      runner.receiveShadow = true;
      sideGroup.add(runner);

      const legZ = runnerDepth / 2 - legDepth / 2 - 0.05;

      const legF = new Object3D(`${name}_Leg_Front`);
      legF.geometry = unitCubeGeo;
      legF.scale.set(legWidth, legHeight, legDepth);
      if (woodMat) legF.material = woodMat;
      legF.position.set(0, runnerHeight + legHeight / 2, legZ);
      legF.castShadow = true;
      legF.receiveShadow = true;
      sideGroup.add(legF);

      const legB = new Object3D(`${name}_Leg_Back`);
      legB.geometry = unitCubeGeo;
      legB.scale.set(legWidth, legHeight, legDepth);
      if (woodMat) legB.material = woodMat;
      legB.position.set(0, runnerHeight + legHeight / 2, -legZ);
      legB.castShadow = true;
      legB.receiveShadow = true;
      sideGroup.add(legB);

      return sideGroup;
    };

    baseGroup.add(createSideBase(-legInsetX, true));
    baseGroup.add(createSideBase(legInsetX, false));

    // --- 3. SHELF (Ablage) ---
    // Metal rails running across
    const shelfHeight = runnerHeight + legHeight * 0.3; // 30% up the legs
    const shelfDepth = d - 0.2; // narrower than table depth
    const railWidth = 0.04;
    const railHeight = 0.04;
    const railLength = legInsetX * 2; // Spans between the legs

    const railF = new Object3D(`${name}_Rail_Front`);
    railF.geometry = unitCubeGeo;
    railF.scale.set(railLength, railHeight, railWidth);
    if (metalMat) railF.material = metalMat;
    railF.position.set(0, shelfHeight, shelfDepth / 2);
    railF.castShadow = true;
    railF.receiveShadow = true;
    baseGroup.add(railF);

    const railB = new Object3D(`${name}_Rail_Back`);
    railB.geometry = unitCubeGeo;
    railB.scale.set(railLength, railHeight, railWidth);
    if (metalMat) railB.material = metalMat;
    railB.position.set(0, shelfHeight, -shelfDepth / 2);
    railB.castShadow = true;
    railB.receiveShadow = true;
    baseGroup.add(railB);

    // Shelf Slats (Latten)
    const numSlats = 12;
    const slatDepth = shelfDepth + 0.04; // Overhangs rails slightly
    const slatHeight = 0.02;
    const slatGap = 0.02;
    const totalSlatWidth = railLength - 0.04; // Keep inside legs
    const slatWidth = (totalSlatWidth - (numSlats - 1) * slatGap) / numSlats;

    for (let i = 0; i < numSlats; i++) {
      const slat = new Object3D(`${name}_Slat_${i}`);
      slat.geometry = unitCubeGeo;
      slat.scale.set(slatWidth, slatHeight, slatDepth);
      if (woodMat) slat.material = woodMat;
      slat.castShadow = true;
      slat.receiveShadow = true;

      const xPos = -totalSlatWidth / 2 + slatWidth / 2 + i * (slatWidth + slatGap);
      slat.position.set(xPos, shelfHeight + railHeight / 2 + slatHeight / 2, 0);
      baseGroup.add(slat);
    }

    this.add(baseGroup);
  }
}
