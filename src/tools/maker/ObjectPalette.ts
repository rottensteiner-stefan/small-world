import { Object3D } from "../../core/index.js";
import { StandardMaterial } from "../../core/materials/index.js";
import { Color } from "../../core/colors/index.js";
import { PointLight, DirectionalLight, AmbientLight } from "../../core/lights/index.js";
import { Behavior, RotatorBehavior, HoverBehavior } from "../../core/behaviors/index.js";
import { Cube, Sphere } from "../../geometry/index.js";

export interface PaletteCallbacks {
  /** Adds a freshly-built object as a child of the current scene root. */
  createObject(factory: () => Object3D): void;
  /** Attaches a freshly-built behavior to the currently selected object, if any. */
  attachBehavior(factory: () => Behavior): void;
}

/**
 * Buttons to instantiate Maker's object palette -- deliberately just the existing
 * geometry/material/light/behavior catalog (per docs/adr/0010-maker-editor-architecture.md,
 * Maker needs no new primitives, only a UI to place the ones that already exist).
 */
export class ObjectPalette {
  constructor(container: HTMLElement, callbacks: PaletteCallbacks) {
    container.classList.add("maker-palette");

    this._addSection(container, "Objects");
    this._addButton(container, "+ Cube", () =>
      callbacks.createObject(() => {
        const obj = new Object3D("Cube");
        obj.geometry = new Cube({ size: 1 }).getGeometryData();
        obj.material = new StandardMaterial({ color: Color.WHITE, metallic: 0, roughness: 0.6 });
        return obj;
      }),
    );
    this._addButton(container, "+ Sphere", () =>
      callbacks.createObject(() => {
        const obj = new Object3D("Sphere");
        obj.geometry = new Sphere({ radius: 0.5 }).getGeometryData();
        obj.material = new StandardMaterial({ color: Color.WHITE, metallic: 0, roughness: 0.6 });
        return obj;
      }),
    );

    this._addSection(container, "Lights");
    this._addButton(container, "+ Point Light", () =>
      callbacks.createObject(() => new PointLight({ name: "PointLight" })),
    );
    this._addButton(container, "+ Directional Light", () =>
      callbacks.createObject(() => new DirectionalLight({ name: "DirectionalLight" })),
    );
    this._addButton(container, "+ Ambient Light", () =>
      callbacks.createObject(() => new AmbientLight({ name: "AmbientLight" })),
    );

    this._addSection(container, "Behaviors (attach to selection)");
    this._addButton(container, "+ Rotator", () =>
      callbacks.attachBehavior(() => new RotatorBehavior()),
    );
    this._addButton(container, "+ Hover", () =>
      callbacks.attachBehavior(() => new HoverBehavior()),
    );
  }

  private _addSection(container: HTMLElement, title: string): void {
    const heading = document.createElement("h4");
    heading.className = "maker-palette-section";
    heading.textContent = title;
    container.appendChild(heading);
  }

  private _addButton(container: HTMLElement, label: string, onClick: () => void): void {
    const button = document.createElement("button");
    button.className = "maker-palette-btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    container.appendChild(button);
  }
}
