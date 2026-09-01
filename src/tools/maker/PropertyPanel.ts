import { Pane, FolderApi } from "tweakpane";
import { Object3D } from "../../core/index.js";
import { Color } from "../../core/colors/index.js";
import { InspectorField, collectInspectorSchema } from "../../core/Inspectable.js";
import { UndoStack } from "./UndoStack.js";

/** Minimal shape shared by Tweakpane binding/blade APIs this panel actually calls -- mirrors
 * `GadgetInspector`'s own minimal interfaces rather than depending on Tweakpane's full types. */
interface DisposableBlade {
  dispose(): void;
}
interface RefreshableBinding {
  refresh(): void;
}

type ChangeEvent<T> = { value: T; last?: boolean };

/**
 * The generic, schema-driven property panel that is Maker's actual replacement for
 * GadgetInspector's hand-duck-typed one (see docs/adr/0010-maker-editor-architecture.md).
 * Every field it renders comes from `collectInspectorSchema()` -- there is no per-material or
 * per-light special-casing here; a new `static inspector` entry on any class is enough to make
 * it show up, with zero changes to this file.
 */
export class PropertyPanel {
  private _pane: Pane;
  private _titleFolder: FolderApi;
  private _blades: DisposableBlade[] = [];

  constructor(
    container: HTMLElement,
    private _undo: UndoStack,
  ) {
    this._pane = new Pane({ container });
    this._titleFolder = this._pane.addFolder({ title: "No Selection", expanded: true });
  }

  /** Rebuilds the entire panel for the newly selected (primary) object, or clears it for
   * `undefined`. `extraCount` -- how many other objects are also selected alongside it -- is
   * shown as a "(+N more)" suffix; this panel only ever edits the primary object's properties,
   * never a multi-object batch edit. */
  public setSelection(obj: Object3D | undefined, extraCount: number = 0): void {
    for (const blade of this._blades) blade.dispose();
    this._blades = [];
    const baseName = obj ? obj.name || obj.constructor.name : "No Selection";
    this._titleFolder.title =
      obj && extraCount > 0 ? `${baseName} (+${extraCount} more)` : baseName;
    if (!obj) return;

    this._renderSchema(
      this._titleFolder,
      obj as unknown as Record<string, unknown>,
      collectInspectorSchema(obj),
    );

    if (obj.material) {
      const matFolder = this._titleFolder.addFolder({ title: "Material", expanded: true });
      this._blades.push(matFolder);
      this._renderSchema(
        matFolder,
        obj.material as unknown as Record<string, unknown>,
        collectInspectorSchema(obj.material),
      );
    }

    if (obj.behaviors.length > 0) {
      const behaviorsFolder = this._titleFolder.addFolder({ title: "Behaviors", expanded: true });
      this._blades.push(behaviorsFolder);
      for (const behavior of obj.behaviors) {
        const oneFolder = behaviorsFolder.addFolder({
          title: behavior.constructor.name,
          expanded: true,
        });
        oneFolder.addBinding(behavior, "isActive", { label: "Active" });
        this._renderSchema(
          oneFolder,
          behavior as unknown as Record<string, unknown>,
          collectInspectorSchema(behavior),
        );
      }
    }
  }

  private _renderSchema(
    folder: FolderApi,
    target: Record<string, unknown>,
    schema: Record<string, InspectorField>,
  ): void {
    for (const [key, field] of Object.entries(schema)) {
      this._bindField(folder, target, key, field);
    }
  }

  /** Resolves `field.path` (e.g. "position.x") to the actual host object + property key --
   * the same dotted-path convention `GadgetInspector` already uses for nested Behavior fields,
   * generalized here to every schema entry. */
  private _resolvePath(
    target: Record<string, unknown>,
    key: string,
    path: string | undefined,
  ): { host: Record<string, unknown>; propKey: string } {
    if (!path) return { host: target, propKey: key };
    const parts = path.split(".");
    let host = target;
    for (let i = 0; i < parts.length - 1; i++) {
      host = host[parts[i]!] as Record<string, unknown>;
    }
    return { host, propKey: parts[parts.length - 1]! };
  }

  private _bindField(
    folder: FolderApi,
    target: Record<string, unknown>,
    key: string,
    field: InspectorField,
  ): void {
    const { host, propKey } = this._resolvePath(target, key, field.path);
    const label = field.label ?? key;

    if ("color" === field.type) {
      this._bindColorField(folder, host, propKey, label);
      return;
    }

    const options: Record<string, unknown> = { label };
    if ("number" === field.type) {
      if (undefined !== field.min) options["min"] = field.min;
      if (undefined !== field.max) options["max"] = field.max;
      if (undefined !== field.step) options["step"] = field.step;
    } else if ("choice" === field.type && field.options) {
      options["options"] = Array.isArray(field.options)
        ? Object.fromEntries(field.options.map((o) => [o, o]))
        : field.options;
    }

    let before = host[propKey];
    const binding = folder.addBinding(host, propKey, options) as unknown as RefreshableBinding &
      DisposableBlade & { on: (event: "change", cb: (ev: ChangeEvent<unknown>) => void) => void };
    binding.on("change", (ev: ChangeEvent<unknown>) => {
      if (false === ev.last) return;
      const from = before;
      const to = ev.value;
      this._undo.execute({
        label: `Edit ${label}`,
        redo: () => {
          host[propKey] = to;
          binding.refresh();
        },
        undo: () => {
          host[propKey] = from;
          binding.refresh();
        },
      });
      before = to;
    });
    this._blades.push(binding);
  }

  private _bindColorField(
    folder: FolderApi,
    host: Record<string, unknown>,
    propKey: string,
    label: string,
  ): void {
    const colorObj = host[propKey] as Color;
    const proxy = { value: { r: colorObj.r * 255, g: colorObj.g * 255, b: colorObj.b * 255 } };
    let before = { ...proxy.value };

    const binding = folder.addBinding(proxy, "value", { label }) as unknown as RefreshableBinding &
      DisposableBlade & {
        on: (
          event: "change",
          cb: (ev: ChangeEvent<{ r: number; g: number; b: number }>) => void,
        ) => void;
      };
    binding.on("change", (ev: ChangeEvent<{ r: number; g: number; b: number }>) => {
      colorObj.r = ev.value.r / 255;
      colorObj.g = ev.value.g / 255;
      colorObj.b = ev.value.b / 255;
      if (false === ev.last) return;
      const from = before;
      const to = { ...ev.value };
      this._undo.execute({
        label: `Edit ${label}`,
        redo: () => {
          colorObj.r = to.r / 255;
          colorObj.g = to.g / 255;
          colorObj.b = to.b / 255;
          proxy.value = { ...to };
          binding.refresh();
        },
        undo: () => {
          colorObj.r = from.r / 255;
          colorObj.g = from.g / 255;
          colorObj.b = from.b / 255;
          proxy.value = { ...from };
          binding.refresh();
        },
      });
      before = to;
    });
    this._blades.push(binding);
  }
}
