import { FrostglassPanelBehavior } from "../../../../../src/apps/hollow-circuit/core/behaviors/FrostglassPanelBehavior.js";
import { Object3D } from "../../../../../src/core/Object3D.js";
import { StandardMaterial } from "../../../../../src/core/materials/StandardMaterial.js";
import { Color } from "../../../../../src/core/colors/Color.js";

function makePanel(obj: Object3D): StandardMaterial {
  const mat = new StandardMaterial({ color: new Color(1, 1, 1, 0.55) });
  obj.material = mat;
  return mat;
}

describe("FrostglassPanelBehavior", () => {
  it("eases opacity down to revealOpacity while revealed", () => {
    const obj = new Object3D("panel");
    const mat = makePanel(obj);
    const panel = new FrostglassPanelBehavior({
      restOpacity: 0.55,
      revealOpacity: 0.12,
      transitionSpeed: 3.0,
    });
    panel.onAttach(obj);

    panel.reveal(1.4);
    panel.update(1.0); // min(1, 3.0*1.0) clamps to 1 -> fully snaps to the target this step.
    expect(mat.color.a).toBeCloseTo(0.12, 5);
  });

  it("eases back to restOpacity once the reveal window elapses", () => {
    const obj = new Object3D("panel");
    const mat = makePanel(obj);
    const panel = new FrostglassPanelBehavior({
      restOpacity: 0.55,
      revealOpacity: 0.12,
      transitionSpeed: 3.0,
    });
    panel.onAttach(obj);

    panel.reveal(2.0);
    panel.update(1.0); // 1.0s left in the window -- still revealed.
    expect(mat.color.a).toBeCloseTo(0.12, 5);

    panel.update(1.0); // Window now exhausted -- eases back toward restOpacity.
    expect(mat.color.a).toBeCloseTo(0.55, 5);
  });

  it("reveal() extends an active window but never shortens a longer one already running", () => {
    const obj = new Object3D("panel");
    const mat = makePanel(obj);
    const panel = new FrostglassPanelBehavior({
      restOpacity: 0.55,
      revealOpacity: 0.12,
      transitionSpeed: 3.0,
    });
    panel.onAttach(obj);

    panel.reveal(2.0);
    panel.reveal(0.5); // Shorter -- must not shrink the already-running 2.0s window.

    panel.update(1.5); // 1.5s elapsed; the (unshrunk) window still has 0.5s left.
    expect(mat.color.a).toBeCloseTo(0.12, 5); // still fully revealed, not easing back yet
  });
});
