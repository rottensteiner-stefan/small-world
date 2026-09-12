import { PointLight, PointLightOptions } from "../../../core/lights/PointLight.js";
import { Color } from "../../../core/colors/Color.js";
import { GltfExtensionPlugin } from "../GltfExtensionPlugin.js";
import { GltfLightJson } from "../writerTypes.js";

interface PunctualLightDef {
  type: string;
  color?: number[];
  intensity?: number;
  range?: number;
}

const LIGHT_DEFS_KEY = "KHR_lights_punctual.lightDefsByNode";
const WRITE_LIGHTS_KEY = "KHR_lights_punctual.lights";

/**
 * `KHR_lights_punctual` -- Khronos-ratified extension for punctual lights. Only `"point"` lights
 * are handled on either side today; directional/spot are intentionally out of scope (see
 * `PointLight`'s own docs for why).
 */
export const khrLightsPunctual: GltfExtensionPlugin = {
  name: "KHR_lights_punctual",

  prepareRead(ctx) {
    const defsByNode = new Map<number, PunctualLightDef>();
    const punctualLights = ctx.json.extensions?.KHR_lights_punctual?.lights;
    if (punctualLights && ctx.json.nodes) {
      for (let i = 0; i < ctx.json.nodes.length; i++) {
        const lightIdx = ctx.json.nodes[i]?.extensions?.KHR_lights_punctual?.light;
        if (lightIdx === undefined) continue;
        const def = punctualLights[lightIdx];
        if (def && "point" === def.type) defsByNode.set(i, def);
      }
    }
    ctx.state.set(LIGHT_DEFS_KEY, defsByNode);
  },

  readNode(nodeIndex, _nodeDef, name, ctx) {
    const defsByNode = ctx.state.get(LIGHT_DEFS_KEY) as Map<number, PunctualLightDef> | undefined;
    const def = defsByNode?.get(nodeIndex);
    if (!def) return undefined;

    const options: PointLightOptions = { name };
    if (def.color) options.color = new Color(def.color[0]!, def.color[1]!, def.color[2]!);
    if (undefined !== def.intensity) options.intensity = def.intensity;
    if (undefined !== def.range) options.distance = def.range;
    return new PointLight(options);
  },

  writeNode(obj, node, ctx) {
    if (!(obj instanceof PointLight)) return;
    let lights = ctx.state.get(WRITE_LIGHTS_KEY) as GltfLightJson[] | undefined;
    if (!lights) {
      lights = [];
      ctx.state.set(WRITE_LIGHTS_KEY, lights);
    }
    const index = lights.length;
    lights.push({
      type: "point",
      color: [obj.color.r, obj.color.g, obj.color.b],
      intensity: obj.intensity,
      range: obj.distance,
    });
    node.extensions = { ...node.extensions, KHR_lights_punctual: { light: index } };
  },

  finalizeWrite(ctx) {
    const lights = ctx.state.get(WRITE_LIGHTS_KEY) as GltfLightJson[] | undefined;
    if (lights && 0 < lights.length) {
      ctx.doc.extensions = { ...ctx.doc.extensions, KHR_lights_punctual: { lights } };
    }
  },
};
