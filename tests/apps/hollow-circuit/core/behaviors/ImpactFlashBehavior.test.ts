import { ImpactFlashBehavior } from "../../../../../src/apps/hollow-circuit/core/behaviors/ImpactFlashBehavior.js";
import { Object3D } from "../../../../../src/core/Object3D.js";
import { Scene } from "../../../../../src/core/Scene.js";
import { StandardMaterial } from "../../../../../src/core/materials/StandardMaterial.js";
import { Color } from "../../../../../src/core/colors/Color.js";

describe("ImpactFlashBehavior", () => {
  it("fades emissiveIntensity toward zero, then removes its Object3D once expired", () => {
    const scene = new Scene();
    const shard = new Object3D("shard");
    shard.material = new StandardMaterial({
      color: Color.WHITE,
      emissiveColor: Color.WHITE,
      emissiveIntensity: 8.0,
    });
    scene.add(shard);

    const behavior = new ImpactFlashBehavior({ scene, duration: 0.4, peakIntensity: 8.0 });
    behavior.onAttach(shard);

    behavior.update(0.1);
    const midIntensity = (shard.material as StandardMaterial).emissiveIntensity;
    expect(midIntensity).toBeGreaterThan(0);
    expect(midIntensity).toBeLessThan(8.0);
    expect(scene.objects).toContain(shard);

    behavior.update(0.4); // Pushes elapsed time past duration.
    expect(scene.objects).not.toContain(shard);
  });
});
