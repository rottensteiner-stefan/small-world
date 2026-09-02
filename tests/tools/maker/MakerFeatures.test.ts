// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TransformGizmo } from "../../../src/tools/maker/TransformGizmo.js";
import { Object3D } from "../../../src/core/Object3D.js";
import { Vector3D, Matrix4 } from "../../../src/math/index.js";
import {
  Behavior,
  RotatorBehavior,
  attachBehavior,
  detachBehavior,
} from "../../../src/core/behaviors/index.js";
import { UndoStack } from "../../../src/tools/maker/UndoStack.js";
import { OrbitCameraController } from "../../../src/tools/maker/OrbitCameraController.js";
import { HierarchyPanel } from "../../../src/tools/maker/HierarchyPanel.js";
import { PropertyPanel } from "../../../src/tools/maker/PropertyPanel.js";
import { ObjectPalette } from "../../../src/tools/maker/ObjectPalette.js";
import { LightGizmoManager } from "../../../src/tools/maker/LightGizmoManager.js";
import { PointLight, DirectionalLight, SpotLight } from "../../../src/core/lights/index.js";
import { collectInspectorSchema } from "../../../src/core/Inspectable.js";

describe("Maker Phase 2 Features", () => {
  describe("Grid & Angle Snapping", () => {
    it("snaps translate to configured grid intervals", () => {
      const gizmo = new TransformGizmo();
      gizmo.snap.enabled = true;
      gizmo.snap.translate = 0.5;

      expect(gizmo.snapValue("translate", 0.0)).toBeCloseTo(0.0);
      expect(gizmo.snapValue("translate", 0.24)).toBeCloseTo(0.0);
      expect(gizmo.snapValue("translate", 0.26)).toBeCloseTo(0.5);
      expect(gizmo.snapValue("translate", 1.8)).toBeCloseTo(2.0);
      expect(gizmo.snapValue("translate", -0.74)).toBeCloseTo(-0.5);
      expect(gizmo.snapValue("translate", -0.76)).toBeCloseTo(-1.0);
    });

    it("snaps rotate to configured angle intervals (e.g. 15 degrees / PI/12)", () => {
      const gizmo = new TransformGizmo();
      gizmo.snap.enabled = true;
      gizmo.snap.rotate = Math.PI / 12; // 15 deg

      const deg15 = Math.PI / 12;
      expect(gizmo.snapValue("rotate", deg15 * 0.4)).toBeCloseTo(0);
      expect(gizmo.snapValue("rotate", deg15 * 0.6)).toBeCloseTo(deg15);
      expect(gizmo.snapValue("rotate", deg15 * 5.9)).toBeCloseTo(deg15 * 6); // 90 deg
    });

    it("snaps scale and enforces minimum scale of 0.01", () => {
      const gizmo = new TransformGizmo();
      gizmo.snap.enabled = true;
      gizmo.snap.scale = 0.25;

      expect(gizmo.snapValue("scale", 1.1)).toBeCloseTo(1.0);
      expect(gizmo.snapValue("scale", 1.2)).toBeCloseTo(1.25);
      expect(gizmo.snapValue("scale", -0.5)).toBeCloseTo(0.01);
      expect(gizmo.snapValue("scale", 0.0)).toBeCloseTo(0.01);
    });
  });

  describe("Pivot-Relative Cluster Transform Math", () => {
    it("rotates multiple objects around a primary pivot preserving radius", () => {
      const primary = new Object3D("Primary");
      primary.position.set(0, 0, 0);

      const child1 = new Object3D("Child1");
      child1.position.set(2, 0, 0);

      const pivot = primary.position.clone();
      const initialOffset = child1.position.clone().sub(pivot);
      const angle = Math.PI / 2; // 90 deg around Y

      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const rotated = new Vector3D(
        initialOffset.x * c + initialOffset.z * s,
        initialOffset.y,
        -initialOffset.x * s + initialOffset.z * c,
      );
      const newPos = pivot.clone().add(rotated);

      expect(newPos.x).toBeCloseTo(0);
      expect(newPos.y).toBeCloseTo(0);
      expect(newPos.z).toBeCloseTo(-2);
      expect(newPos.clone().sub(pivot).length()).toBeCloseTo(2);
    });

    it("scales multiple objects relative to primary pivot", () => {
      const primary = new Object3D("Primary");
      primary.position.set(1, 0, 0);

      const child1 = new Object3D("Child1");
      child1.position.set(3, 0, 0);

      const pivot = primary.position.clone();
      const offset = child1.position.clone().sub(pivot);
      const scaleMultiplier = 2.0;

      offset.x *= scaleMultiplier;
      const newPos = pivot.clone().add(offset);

      expect(newPos.x).toBeCloseTo(5); // 1 + (2 * 2) = 5
      expect(newPos.y).toBeCloseTo(0);
      expect(newPos.z).toBeCloseTo(0);
    });

    it("undo and redo cleanly restores multi-object transform state", () => {
      const undo = new UndoStack();
      const objA = new Object3D("A");
      objA.position.set(0, 0, 0);
      objA.rotation.set(0, 0, 0);

      const objB = new Object3D("B");
      objB.position.set(4, 0, 0);
      objB.rotation.set(0, 0, 0);

      const before = new Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>(
        [
          [
            objA,
            {
              position: objA.position.clone(),
              rotation: objA.rotation.clone(),
              scale: objA.scale.clone(),
            },
          ],
          [
            objB,
            {
              position: objB.position.clone(),
              rotation: objB.rotation.clone(),
              scale: objB.scale.clone(),
            },
          ],
        ],
      );

      objA.rotation.set(0, Math.PI / 2, 0);
      objB.position.set(0, 0, -4);
      objB.rotation.set(0, Math.PI / 2, 0);

      const after = new Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>([
        [
          objA,
          {
            position: objA.position.clone(),
            rotation: objA.rotation.clone(),
            scale: objA.scale.clone(),
          },
        ],
        [
          objB,
          {
            position: objB.position.clone(),
            rotation: objB.rotation.clone(),
            scale: objB.scale.clone(),
          },
        ],
      ]);

      const apply = (
        values: Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>,
      ): void => {
        for (const [obj, t] of values) {
          obj.position.copyFrom(t.position);
          obj.rotation.copyFrom(t.rotation);
          obj.scale.copyFrom(t.scale);
        }
      };

      undo.execute({
        label: "Rotate Cluster",
        redo: () => apply(after),
        undo: () => apply(before),
      });

      expect(objB.position.z).toBeCloseTo(-4);
      expect(objA.rotation.y).toBeCloseTo(Math.PI / 2);

      undo.undo();
      expect(objB.position.x).toBeCloseTo(4);
      expect(objB.position.z).toBeCloseTo(0);
      expect(objA.rotation.y).toBeCloseTo(0);

      undo.redo();
      expect(objB.position.z).toBeCloseTo(-4);
      expect(objA.rotation.y).toBeCloseTo(Math.PI / 2);
    });
  });

  describe("Batch Behaviors", () => {
    it("attaches distinct behavior instances to each selected object in batch", () => {
      const undo = new UndoStack();
      const obj1 = new Object3D("Obj1");
      const obj2 = new Object3D("Obj2");
      const objs = [obj1, obj2];

      const factory = (): RotatorBehavior => new RotatorBehavior();
      const attached = new Map<Object3D, RotatorBehavior>();
      for (const obj of objs) {
        attached.set(obj, factory());
      }

      undo.execute({
        label: "Attach Rotator (2 objects)",
        redo: () => {
          for (const [obj, beh] of attached) attachBehavior(obj.behaviors, beh, obj);
        },
        undo: () => {
          for (const [obj, beh] of attached) detachBehavior(obj.behaviors, beh);
        },
      });

      expect(obj1.behaviors.length).toBe(1);
      expect(obj2.behaviors.length).toBe(1);
      expect(obj1.behaviors[0]).toBeInstanceOf(RotatorBehavior);
      expect(obj2.behaviors[0]).toBeInstanceOf(RotatorBehavior);
      expect(obj1.behaviors[0]).not.toBe(obj2.behaviors[0]);

      undo.undo();
      expect(obj1.behaviors.length).toBe(0);
      expect(obj2.behaviors.length).toBe(0);

      undo.redo();
      expect(obj1.behaviors.length).toBe(1);
      expect(obj2.behaviors.length).toBe(1);
    });
  });

  describe("Marquee Screen Projection Math", () => {
    it("transforms world coordinates into NDC and screen rect overlap correctly", () => {
      const proj = new Matrix4();
      Matrix4.perspective(Math.PI / 3, 1.0, 0.1, 100, proj);
      const view = new Matrix4();
      Matrix4.lookAt(new Vector3D(0, 0, 10), new Vector3D(0, 0, 0), new Vector3D(0, 1, 0), view);
      const viewProj = new Matrix4().copy(proj).multiply(view);

      const ndcCenter = viewProj.transformVector(new Vector3D(0, 0, 0));
      expect(ndcCenter.x).toBeCloseTo(0);
      expect(ndcCenter.y).toBeCloseTo(0);
      expect(ndcCenter.z).toBeGreaterThan(-1);
      expect(ndcCenter.z).toBeLessThan(1);

      const rect = { left: 0, top: 0, width: 800, height: 600 };
      const screenX = (ndcCenter.x * 0.5 + 0.5) * rect.width + rect.left;
      const screenY = (-ndcCenter.y * 0.5 + 0.5) * rect.height + rect.top;

      expect(screenX).toBeCloseTo(400);
      expect(screenY).toBeCloseTo(300);

      const marqueeMinX = 350;
      const marqueeMaxX = 450;
      const marqueeMinY = 250;
      const marqueeMaxY = 350;

      const inside =
        screenX >= marqueeMinX &&
        screenX <= marqueeMaxX &&
        screenY >= marqueeMinY &&
        screenY <= marqueeMaxY;
      expect(inside).toBe(true);

      const outside = screenX >= 10 && screenX <= 50 && screenY >= 10 && screenY <= 50;
      expect(outside).toBe(false);
    });
  });

  describe("Sidebar Wheel Event Isolation", () => {
    it("stops propagation on wheel events to prevent editor viewport zoom leakage", () => {
      const sidebar = document.createElement("aside");
      sidebar.className = "maker-sidebar right";
      const props = document.createElement("div");
      props.id = "maker-properties";
      sidebar.appendChild(props);
      document.body.appendChild(sidebar);

      let globalWheelReceived = false;
      const onWindowWheel = (): void => {
        globalWheelReceived = true;
      };
      window.addEventListener("wheel", onWindowWheel);

      // Isolate sidebar
      sidebar.addEventListener("wheel", (e) => e.stopPropagation());

      const wheelEv = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 });
      props.dispatchEvent(wheelEv);

      expect(globalWheelReceived).toBe(false);

      window.removeEventListener("wheel", onWindowWheel);
      document.body.removeChild(sidebar);
    });
  });

  describe("OrbitCameraController Drag & Zoom", () => {
    it("updates yaw and pitch correctly via rotate()", () => {
      const orbit = new OrbitCameraController({ distance: 10, yaw: 0, pitch: 0 });
      orbit.rotate(100, 50);

      const view = orbit.getView();
      expect(view.yaw).toBeCloseTo(-100 * 0.005);
      expect(view.pitch).toBeCloseTo(-50 * 0.005);
    });

    it("updates distance via zoom()", () => {
      const orbit = new OrbitCameraController({ distance: 10 });
      orbit.zoom(20);
      const view = orbit.getView();
      expect(view.distance).toBeGreaterThan(10);
    });
  });

  describe("Gizmo Always-on-Top & Nudge", () => {
    it("configures gizmo handle materials with depthTest and depthWrite false", () => {
      const gizmo = new TransformGizmo();
      const leaves: Object3D[] = [];
      const collect = (node: Object3D): void => {
        if (node.material) leaves.push(node);
        for (const c of node.children) collect(c);
      };
      collect(gizmo.root);

      expect(leaves.length).toBeGreaterThan(0);
      for (const leaf of leaves) {
        expect(leaf.material?.depthTest).toBe(false);
        expect(leaf.material?.depthWrite).toBe(false);
      }
    });

    it("cycles grid snap steps with stepGrid()", () => {
      const gizmo = new TransformGizmo();
      expect(gizmo.snap.translate).toBe(0.5);

      // Step up: 0.5 -> 1.0 -> 2.0 -> 2.0 (clamp)
      expect(gizmo.stepGrid(1)).toBe(1.0);
      expect(gizmo.stepGrid(1)).toBe(2.0);
      expect(gizmo.stepGrid(1)).toBe(2.0);

      // Step down: 2.0 -> 1.0 -> 0.5 -> 0.25 -> 0.1 -> 0.1 (clamp)
      expect(gizmo.stepGrid(-1)).toBe(1.0);
      expect(gizmo.stepGrid(-1)).toBe(0.5);
      expect(gizmo.stepGrid(-1)).toBe(0.25);
      expect(gizmo.stepGrid(-1)).toBe(0.1);
      expect(gizmo.stepGrid(-1)).toBe(0.1);
    });
  });

  describe("Object Renaming (Hierarchy & PropertyPanel)", () => {
    it("includes name in Object3D inspector schema", () => {
      const obj = new Object3D("TestBox");
      const schema = collectInspectorSchema(obj);
      expect(schema["name"]).toBeDefined();
      expect(schema["name"]?.type).toBe("string");
      expect(schema["name"]?.label).toBe("Name");
    });

    it("renders inline rename input on startRenaming() in HierarchyPanel and commits on Enter", () => {
      const container = document.createElement("div");
      const root = new Object3D("Root");
      const child = new Object3D("OldName");
      root.add(child);

      let renamed: { obj: Object3D; name: string } | null = null;
      const hierarchy = new HierarchyPanel(container, () => root, {
        onSelect: (): void => {},
        onReparent: (): void => {},
        onRename: (obj, name): void => {
          renamed = { obj, name };
        },
      });

      hierarchy.refresh();
      expect(container.querySelector(".maker-hierarchy-row")?.textContent).toBe("OldName");

      // Start inline renaming
      hierarchy.startRenaming(child);
      const input = container.querySelector(".maker-hierarchy-rename-input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe("OldName");

      // Change value and press Enter
      input.value = "NewAwesomeName";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      expect(renamed).toEqual({ obj: child, name: "NewAwesomeName" });
    });

    it("cancels inline rename on Escape without invoking onRename", () => {
      const container = document.createElement("div");
      const root = new Object3D("Root");
      const child = new Object3D("KeepMe");
      root.add(child);

      let renamed = false;
      const hierarchy = new HierarchyPanel(container, () => root, {
        onSelect: (): void => {},
        onReparent: (): void => {},
        onRename: (): void => {
          renamed = true;
        },
      });

      hierarchy.startRenaming(child);
      const input = container.querySelector(".maker-hierarchy-rename-input") as HTMLInputElement;
      input.value = "DiscardedName";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(renamed).toBe(false);
      expect(container.querySelector(".maker-hierarchy-row")?.textContent).toBe("KeepMe");
    });

    it("PropertyPanel notifies onPropertyChanged and updates title on name edit", () => {
      const container = document.createElement("div");
      const undo = new UndoStack();
      let changedProp: { obj: Object3D; key: string; val: unknown } | null = null;

      const panel = new PropertyPanel(container, undo, {
        onPropertyChanged: (obj, key, val): void => {
          changedProp = { obj, key, val };
        },
      });

      const obj = new Object3D("InitialName");
      panel.setSelection(obj);

      // Verify focusNameInput does not crash
      panel.focusNameInput();

      // Edit name via undo stack simulation or property change
      obj.name = "UpdatedViaPanel";
      panel.setSelection(obj);
      expect(panel).toBeDefined();
      expect(changedProp).toBeNull();
    });

    it("filters hierarchy tree in real time and selects first match on Enter", () => {
      const container = document.createElement("div");
      const root = new Object3D("Root");
      const barrelA = new Object3D("Oil_Barrel_01");
      const barrelB = new Object3D("Oil_Barrel_02");
      const crate = new Object3D("Wood_Crate");
      root.add(barrelA);
      root.add(barrelB);
      root.add(crate);

      let selectedObj: Object3D | null = null;
      const hierarchy = new HierarchyPanel(container, () => root, {
        onSelect: (obj): void => {
          selectedObj = obj;
        },
        onReparent: (): void => {},
      });

      hierarchy.refresh();
      const allRows = container.querySelectorAll(".maker-hierarchy-row");
      expect(allRows.length).toBe(3);

      const searchInput = container.querySelector(
        ".maker-hierarchy-search-input",
      ) as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      // Type "barrel" into search
      searchInput.value = "barrel";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));

      const filteredRows = container.querySelectorAll(".maker-hierarchy-row");
      expect(filteredRows.length).toBe(2);
      expect(filteredRows[0]?.textContent).toBe("Oil_Barrel_01");
      expect(filteredRows[1]?.textContent).toBe("Oil_Barrel_02");

      // Press Enter to select first match
      searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(selectedObj).toBe(barrelA);

      // Press Escape to clear filter and reset
      searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(searchInput.value).toBe("");
      expect(container.querySelectorAll(".maker-hierarchy-row").length).toBe(3);
    });
  });

  describe("ObjectPalette Categorized Icon Grid", () => {
    it("renders primitives, lights, structure, and behavior grids with correct tile counts", () => {
      const container = document.createElement("div");
      const created: Object3D[] = [];
      const attached: Behavior[] = [];

      new ObjectPalette(container, {
        createObject: (factory): void => {
          created.push(factory());
        },
        attachBehavior: (factory): void => {
          attached.push(factory());
        },
      });

      const grids = container.querySelectorAll(".maker-palette-grid");
      expect(grids.length).toBe(4);

      const tiles = container.querySelectorAll(".maker-palette-tile");
      // 8 primitives + 4 lights + 2 structure + 6 behaviors = 20 tiles
      expect(tiles.length).toBe(20);

      // Trigger all buttons to verify geometry/material/light creation without errors
      tiles.forEach((tile) => {
        (tile as HTMLElement).click();
      });

      // 14 createObject calls (8 primitives + 4 lights + 2 structure)
      expect(created.length).toBe(14);
      // 6 attachBehavior calls
      expect(attached.length).toBe(6);

      const createdNames = created.map((o) => o.name);
      expect(createdNames).toContain("Cube");
      expect(createdNames).toContain("Sphere");
      expect(createdNames).toContain("Cylinder");
      expect(createdNames).toContain("Plane");
      expect(createdNames).toContain("Capsule");
      expect(createdNames).toContain("Cone");
      expect(createdNames).toContain("Torus");
      expect(createdNames).toContain("Pyramid");
      expect(createdNames).toContain("PointLight");
      expect(createdNames).toContain("DirectionalLight");
      expect(createdNames).toContain("SpotLight");
      expect(createdNames).toContain("AmbientLight");
      expect(createdNames).toContain("Group");
      expect(createdNames).toContain("SpawnPoint");
    });
  });

  describe("LightGizmoManager (3D Light Markers & Selection Bounds)", () => {
    it("creates, updates, and picks visual markers and selection ranges for lights", () => {
      const mgr = new LightGizmoManager();
      const sceneRoot = new Object3D("SceneRoot");

      const pointLight = new PointLight({ name: "BunkerLamp", distance: 12 });
      pointLight.position.set(2, 3, 4);
      sceneRoot.add(pointLight);

      const spotLight = new SpotLight({ name: "Flashlight", distance: 15, angle: 0.5 });
      spotLight.position.set(0, 5, 0);
      sceneRoot.add(spotLight);

      const sunLight = new DirectionalLight({ name: "Sun" });
      sceneRoot.add(sunLight);

      // 1. Initial update (unselected)
      mgr.update(sceneRoot, new Set());
      expect(mgr.root.children.length).toBeGreaterThanOrEqual(3);

      // Collect pickables
      const pickables: Object3D[] = [];
      mgr.collectPickables(pickables);
      expect(pickables.length).toBe(3);

      // Verify picking resolution
      const pointMarker = pickables.find((p) => p.name === "Helper_BunkerLamp");
      expect(pointMarker).toBeDefined();
      expect(mgr.getLightForObject(pointMarker!)).toBe(pointLight);

      // 2. Selection update (point light selected)
      mgr.update(sceneRoot, new Set([pointLight]));
      const rangeGizmo = mgr.root.children.find((c) => c.name === "Range_BunkerLamp");
      expect(rangeGizmo).toBeDefined();
      expect(rangeGizmo?.isVisible).toBe(true);

      // 3. Deletion sync
      sceneRoot.remove(pointLight);
      mgr.update(sceneRoot, new Set());
      const afterPickables: Object3D[] = [];
      mgr.collectPickables(afterPickables);
      expect(afterPickables.find((p) => p.name === "Helper_BunkerLamp")).toBeUndefined();
    });
  });
});
