import { FolderApi } from "tweakpane";
import { Object3D } from "../../core/Object3D.js";
import { Color } from "../../core/colors/Color.js";
import { Behavior } from "../../core/behaviors/Behavior.js";
import { DisposableBlade } from "./types.js";

/**
 * Builds and binds Tweakpane GUI folders for selected Object3D properties in GadgetInspector.
 */
export class InspectorSelection {
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

    const settingsFolder = selectedFolder.addFolder({ title: "General Settings" });
    selectedBlades.push(settingsFolder);
    settingsFolder.addBinding(obj, "isVisible", { label: "Visible" });
    settingsFolder.addBinding(obj, "castShadow", { label: "Cast Shadow" });
    settingsFolder.addBinding(obj, "receiveShadow", { label: "Recv Shadow" });

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

    // Transform
    const transformFolder = selectedFolder.addFolder({ title: "Transform" });
    selectedBlades.push(transformFolder);
    transformFolder.addBinding(obj.position, "x", { label: "Pos X" });
    transformFolder.addBinding(obj.position, "y", { label: "Pos Y" });
    transformFolder.addBinding(obj.position, "z", { label: "Pos Z" });

    transformFolder.addBinding(obj.rotation, "x", { label: "Rot X" });
    transformFolder.addBinding(obj.rotation, "y", { label: "Rot Y" });
    transformFolder.addBinding(obj.rotation, "z", { label: "Rot Z" });

    transformFolder.addBinding(obj.scale, "x", { label: "Scale X" });
    transformFolder.addBinding(obj.scale, "y", { label: "Scale Y" });
    transformFolder.addBinding(obj.scale, "z", { label: "Scale Z" });

    // Expose material type if available
    if (obj.material) {
      const matFolder = selectedFolder.addFolder({ title: "Material" });
      selectedBlades.push(matFolder);
      matFolder.addBinding(obj.material, "type", { readonly: true });

      const mat = obj.material as unknown as Record<string, unknown>;

      const bindColor = (propName: string, label: string): void => {
        if (propName in mat && mat[propName]) {
          const colorObj = mat[propName] as Color;
          if (typeof colorObj.r === "number") {
            const proxy = {
              color: { r: colorObj.r * 255, g: colorObj.g * 255, b: colorObj.b * 255 },
            };
            matFolder
              .addBinding(proxy, "color", { label })
              .on("change", (ev: { value: { r: number; g: number; b: number } }) => {
                colorObj.r = ev.value.r / 255;
                colorObj.g = ev.value.g / 255;
                colorObj.b = ev.value.b / 255;
              });
          }
        }
      };

      bindColor("color", "Color");
      bindColor("specularColor", "Specular");
      bindColor("emissiveColor", "Emissive");

      if ("shininess" in mat) matFolder.addBinding(mat, "shininess", { min: 0, max: 256 });
      if ("transparent" in mat) matFolder.addBinding(mat, "transparent");
      if ("alphaTest" in mat) matFolder.addBinding(mat, "alphaTest", { min: 0, max: 1 });
      if ("depthTest" in mat) matFolder.addBinding(mat, "depthTest");
      if ("depthWrite" in mat) matFolder.addBinding(mat, "depthWrite");
      if ("wireframeMode" in mat) {
        matFolder.addBinding(mat, "wireframeMode", {
          options: { structural: "structural", triangles: "triangles" },
        });
      }
      if ("wireframe" in mat) matFolder.addBinding(mat, "wireframe");
      if ("opacity" in mat) matFolder.addBinding(mat, "opacity", { min: 0, max: 1 });
      if ("emissiveIntensity" in mat)
        matFolder.addBinding(mat, "emissiveIntensity", { min: 0, max: 10 });
      if ("metalness" in mat) matFolder.addBinding(mat, "metalness", { min: 0, max: 1 });
      if ("roughness" in mat) matFolder.addBinding(mat, "roughness", { min: 0, max: 1 });
    }

    // Lights
    const maybeLight = obj as unknown as Record<string, unknown>;
    if ("intensity" in maybeLight && "color" in maybeLight) {
      const lightCol = maybeLight["color"] as Color;
      if (typeof lightCol.r === "number") {
        const lightFolder = selectedFolder.addFolder({ title: "Light Properties" });
        selectedBlades.push(lightFolder);

        const proxy = {
          color: { r: lightCol.r * 255, g: lightCol.g * 255, b: lightCol.b * 255 },
        };
        lightFolder
          .addBinding(proxy, "color", { label: "Color" })
          .on("change", (ev: { value: { r: number; g: number; b: number } }) => {
            lightCol.r = ev.value.r / 255;
            lightCol.g = ev.value.g / 255;
            lightCol.b = ev.value.b / 255;
          });

        const lightProps = {
          intensity: (maybeLight["intensity"] as number) || 0,
          distance: (maybeLight["distance"] as number) || 0,
          decay: (maybeLight["decay"] as number) || 0,
        };

        lightFolder
          .addBinding(lightProps, "intensity", {
            min: 0,
            max: 200,
            step: 0.01,
            label: "Intensity",
          })
          .on("change", (ev: { value: number }) => {
            maybeLight["intensity"] = ev.value;
          });

        if ("distance" in maybeLight) {
          lightFolder
            .addBinding(lightProps, "distance", { min: 0, max: 100, label: "Distance" })
            .on("change", (ev: { value: number }) => {
              maybeLight["distance"] = ev.value;
              const updateShadowCamera = maybeLight["updateShadowCamera"] as
                (() => void) | undefined;
              if (typeof updateShadowCamera === "function") {
                updateShadowCamera.call(maybeLight);
              }
            });
        }
        if ("decay" in maybeLight) {
          lightFolder
            .addBinding(lightProps, "decay", { min: 0, max: 5, label: "Decay" })
            .on("change", (ev: { value: number }) => {
              maybeLight["decay"] = ev.value;
            });
        }
      }
    }

    // Behaviors
    if (obj.behaviors && obj.behaviors.length > 0) {
      const behaviorsFolder = selectedFolder.addFolder({
        title: "Behaviors",
        expanded: true,
      });
      selectedBlades.push(behaviorsFolder);
      for (const behavior of obj.behaviors) {
        const behaviorClass = behavior.constructor as typeof Behavior & {
          inspector?: Record<
            string,
            {
              type: "number" | "boolean" | "string" | "choice";
              label?: string;
              min?: number;
              max?: number;
              step?: number;
              options?: string[] | Record<string, string | number>;
              path?: string;
            }
          >;
        };

        const behaviorFolder = behaviorsFolder.addFolder({
          title: behaviorClass.name,
          expanded: true,
        });

        behaviorFolder.addBinding(behavior, "isActive", { label: "Active" });

        if (behaviorClass.inspector) {
          for (const [key, config] of Object.entries(behaviorClass.inspector)) {
            let targetObj: Record<string, unknown> = behavior as unknown as Record<string, unknown>;
            let targetKey: string = key;
            if (config.path) {
              const parts = config.path.split(".");
              for (let i = 0; i < parts.length - 1; i++) {
                if (targetObj) {
                  targetObj = targetObj[parts[i]!] as Record<string, unknown>;
                }
              }
              targetKey = parts[parts.length - 1]!;
            }

            if (targetObj && targetKey in targetObj) {
              const options: Record<string, unknown> = {
                label: config.label || key,
              };

              if (config.type === "number") {
                if (typeof config.min === "number") options["min"] = config.min;
                if (typeof config.max === "number") options["max"] = config.max;
                if (typeof config.step === "number") options["step"] = config.step;
              } else if (config.type === "choice") {
                if (config.options) {
                  if (Array.isArray(config.options)) {
                    const optObj: Record<string, unknown> = {};
                    for (const opt of config.options) {
                      optObj[opt] = opt;
                    }
                    options["options"] = optObj;
                  } else {
                    options["options"] = config.options;
                  }
                }
              }

              behaviorFolder.addBinding(targetObj, targetKey, options);
            }
          }
        }
      }
    }
  }
}
