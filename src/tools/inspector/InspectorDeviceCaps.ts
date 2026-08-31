import { TabPageApi } from "tweakpane";
import { DeviceCaps, DeviceFeature, DeviceLimit } from "../../core/index.js";

/**
 * Manages the Device Capabilities pane in GadgetInspector.
 */
export class InspectorDeviceCaps {
  public static setupCapabilities(statsTab: TabPageApi): void {
    const capsFolder = statsTab.addFolder({ title: "Capabilities", expanded: false });

    const caps = {
      WebGL1: DeviceCaps.hasFeature(DeviceFeature.WEBGL1) ? "Yes" : "No",
      WebGL2: DeviceCaps.hasFeature(DeviceFeature.WEBGL2) ? "Yes" : "No",
      WebGPU: DeviceCaps.hasFeature(DeviceFeature.WEBGPU) ? "Yes" : "No",
      TexSize: DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_SIZE),
      TexUnits: DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS),
      Anisotropy: DeviceCaps.getLimit(DeviceLimit.MAX_ANISOTROPY),
      UBOSize: DeviceCaps.getLimit(DeviceLimit.MAX_UNIFORM_BUFFER_SIZE),
      MSAA: DeviceCaps.getLimit(DeviceLimit.MAX_MSAA_SAMPLES),
      VertAttrs: DeviceCaps.getLimit(DeviceLimit.MAX_VERTEX_ATTRIBUTES),
      VertUnis: DeviceCaps.getLimit(DeviceLimit.MAX_VERTEX_UNIFORM_VECTORS),
      FragUnis: DeviceCaps.getLimit(DeviceLimit.MAX_FRAGMENT_UNIFORM_VECTORS),
      FloatTex: DeviceCaps.hasFeature(DeviceFeature.FLOAT_TEXTURES) ? "Yes" : "No",
      CompTex: DeviceCaps.hasFeature(DeviceFeature.COMPRESSED_TEXTURES) ? "Yes" : "No",
    };

    capsFolder.addBinding(caps, "WebGL1", { readonly: true, label: "WebGL1" });
    capsFolder.addBinding(caps, "WebGL2", { readonly: true, label: "WebGL2" });
    capsFolder.addBinding(caps, "WebGPU", { readonly: true, label: "WebGPU" });
    capsFolder.addBinding(caps, "TexSize", { readonly: true, label: "Max Tex Size" });
    capsFolder.addBinding(caps, "TexUnits", { readonly: true, label: "Max Tex Units" });
    capsFolder.addBinding(caps, "Anisotropy", { readonly: true, label: "Max Anisotropy" });
    capsFolder.addBinding(caps, "UBOSize", { readonly: true, label: "Max UBO Size" });
    capsFolder.addBinding(caps, "MSAA", { readonly: true, label: "Max MSAA" });
    capsFolder.addBinding(caps, "VertAttrs", { readonly: true, label: "Max Vert Attrs" });
    capsFolder.addBinding(caps, "VertUnis", { readonly: true, label: "Max Vert Unis" });
    capsFolder.addBinding(caps, "FragUnis", { readonly: true, label: "Max Frag Unis" });
    capsFolder.addBinding(caps, "FloatTex", { readonly: true, label: "Float Tex" });
    capsFolder.addBinding(caps, "CompTex", { readonly: true, label: "Compressed Tex" });
  }
}
