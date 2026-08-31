import { FolderApi } from "tweakpane";
import { Object3D } from "../../core/Object3D.js";
import { Color } from "../../core/colors/Color.js";
import { InspectorField, collectInspectorSchema } from "../../core/Inspectable.js";
import { DisposableBlade } from "./types.js";

type ChangeEvent<T> = { value: T };

/**
 * Builds and binds Tweakpane GUI folders for selected Object3D properties in GadgetInspector.
 *
 * Every field comes from `collectInspectorSchema()` (see `docs/adr/0010-maker-editor-architecture.md`)
 * -- there is no per-material or per-light duck-typing here. A class declares its own
 * `static inspector` map once and it shows up automatically, with zero changes to this file.
 */
export class InspectorSelection {
  /** Object3D's own base fields (see `Object3D.inspector`), shown in the "General Settings"
   * folder rather than lumped in with a subclass's (e.g. a light's) extra fields. */
  private static readonly _GENERAL_KEYS = new Set(["isVisible", "castShadow", "receiveShadow"]);
  /** Object3D's transform fields (see `Object3D.inspector`), shown in their own folder. */
  private static readonly _TRANSFORM_KEYS = new Set([
    "posX",
    "posY",
    "posZ",
    "rotX",
    "rotY",
    "rotZ",
    "scaleX",
    "scaleY",
    "scaleZ",
  ]);

  /**
   * Rebuilds the Tweakpane UI for the selected object within the top-level selection folder.
   */
  public static buildGUI(
    obj: Object3D,
    selectedFolder: FolderApi,
    selectedBlades: DisposableBlade[],
    onSelectObject: (target: Object3D) => void,
  ): void {
    for (const blade of selectedBlades) {
      blade.dispose();
    }
    selectedBlades.length = 0;

    const displayName = obj.name && "" !== obj.name ? obj.name : obj.constructor.name;
    selectedFolder.title = `🎯 ${displayName}`;
    selectedFolder.expanded = true;

    if (obj.name && "" !== obj.name) {
      selectedBlades.push(
        selectedFolder.addBinding(obj, "name", { readonly: true, label: "Name" }),
      );
    }

    // Object3D's own schema (General Settings + Transform, plus anything a subclass -- e.g.
    // AbstractLight/PointLight -- layers on top) is one flat map; split it back into the
    // sections the UI has always shown rather than dumping everything into one folder.
    const objSchema = collectInspectorSchema(obj);
    const generalSchema: Record<string, InspectorField> = {};
    const transformSchema: Record<string, InspectorField> = {};
    const extraSchema: Record<string, InspectorField> = {};
    for (const [key, field] of Object.entries(objSchema)) {
      if (this._GENERAL_KEYS.has(key)) generalSchema[key] = field;
      else if (this._TRANSFORM_KEYS.has(key)) transformSchema[key] = field;
      else extraSchema[key] = field;
    }

    const settingsFolder = selectedFolder.addFolder({ title: "General Settings" });
    selectedBlades.push(settingsFolder);
    this._renderSchema(settingsFolder, obj as unknown as Record<string, unknown>, generalSchema);

    if (obj.parent || obj.children.length > 0) {
      const hierarchyFolder = selectedFolder.addFolder({
        title: "Hierarchy",
        expanded: false,
      });
      selectedBlades.push(hierarchyFolder);

      if (obj.parent) {
        hierarchyFolder
          .addButton({ title: `↑ Parent: ${obj.parent.name || obj.parent.constructor.name}` })
          .on("click", () => {
            onSelectObject(obj.parent!);
          });
      }

      if (obj.children.length > 0) {
        for (let i = 0; i < obj.children.length; i++) {
          const child = obj.children[i]!;
          hierarchyFolder
            .addButton({ title: `↳ Child: ${child.name || child.constructor.name}` })
            .on("click", () => {
              onSelectObject(child);
            });
        }
      }
    }

    const transformFolder = selectedFolder.addFolder({ title: "Transform" });
    selectedBlades.push(transformFolder);
    this._renderSchema(transformFolder, obj as unknown as Record<string, unknown>, transformSchema);

    if (obj.material) {
      const matFolder = selectedFolder.addFolder({ title: "Material" });
      selectedBlades.push(matFolder);
      matFolder.addBinding(obj.material, "type", { readonly: true });
      this._renderSchema(
        matFolder,
        obj.material as unknown as Record<string, unknown>,
        collectInspectorSchema(obj.material),
      );
    }

    // Anything beyond General/Transform -- a light's color/intensity/shadow bias, a subclass's
    // own distance/decay/angle, or any future Object3D subclass's own schema fields -- lands
    // here generically. Nothing here knows what a "light" is; it just renders what the class
    // declared.
    if (Object.keys(extraSchema).length > 0) {
      const propsFolder = selectedFolder.addFolder({ title: "Properties" });
      selectedBlades.push(propsFolder);
      this._renderSchema(propsFolder, obj as unknown as Record<string, unknown>, extraSchema);
    }

    if (obj.behaviors && obj.behaviors.length > 0) {
      const behaviorsFolder = selectedFolder.addFolder({
        title: "Behaviors",
        expanded: true,
      });
      selectedBlades.push(behaviorsFolder);
      for (const behavior of obj.behaviors) {
        const behaviorFolder = behaviorsFolder.addFolder({
          title: behavior.constructor.name,
          expanded: true,
        });
        behaviorFolder.addBinding(behavior, "isActive", { label: "Active" });
        this._renderSchema(
          behaviorFolder,
          behavior as unknown as Record<string, unknown>,
          collectInspectorSchema(behavior),
        );
      }
    }
  }

  private static _renderSchema(
    folder: FolderApi,
    target: Record<string, unknown>,
    schema: Record<string, InspectorField>,
  ): void {
    for (const [key, field] of Object.entries(schema)) {
      this._bindField(folder, target, key, field);
    }
  }

  /** Resolves `field.path` (e.g. "position.x") to the actual host object + property key. */
  private static _resolvePath(
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

  private static _bindField(
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

    const binding = folder.addBinding(host, propKey, options) as unknown as DisposableBlade & {
      on: (event: "change", cb: () => void) => void;
    };
    // Some hosts (e.g. SpotLight) need to recompute derived state -- a shadow frustum -- after
    // any of their own fields change. Calling an optional `updateShadowCamera()` here if present
    // is cheap/idempotent and replaces the old code's one-off special case for "distance".
    binding.on("change", () => {
      const updateShadowCamera = host["updateShadowCamera"];
      if ("function" === typeof updateShadowCamera) {
        (updateShadowCamera as () => void).call(host);
      }
    });
  }

  private static _bindColorField(
    folder: FolderApi,
    host: Record<string, unknown>,
    propKey: string,
    label: string,
  ): void {
    const colorObj = host[propKey] as Color | undefined;
    if (!colorObj || "number" !== typeof colorObj.r) return;

    const proxy = { value: { r: colorObj.r * 255, g: colorObj.g * 255, b: colorObj.b * 255 } };
    const binding = folder.addBinding(proxy, "value", { label }) as unknown as DisposableBlade & {
      on: (
        event: "change",
        cb: (ev: ChangeEvent<{ r: number; g: number; b: number }>) => void,
      ) => void;
    };
    binding.on("change", (ev: ChangeEvent<{ r: number; g: number; b: number }>) => {
      colorObj.r = ev.value.r / 255;
      colorObj.g = ev.value.g / 255;
      colorObj.b = ev.value.b / 255;
      const updateShadowCamera = host["updateShadowCamera"];
      if ("function" === typeof updateShadowCamera) {
        (updateShadowCamera as () => void).call(host);
      }
    });
  }
}
