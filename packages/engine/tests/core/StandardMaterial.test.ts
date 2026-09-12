import {
  StandardMaterial,
  StandardMaterialOptions,
} from "../../src/core/materials/StandardMaterial.js";
import { Color } from "../../src/core/colors/Color.js";
import { Texture } from "../../src/core/textures/Texture.js";
import { BlendingMode, MaterialType } from "../../src/enums/index.js";

describe("StandardMaterial", () => {
  it("should initialize with default values", () => {
    const material = new StandardMaterial();

    expect(material.type).toBe(MaterialType.STANDARD);
    expect(material.color.r).toBe(1.0);
    expect(material.color.g).toBe(1.0);
    expect(material.color.b).toBe(1.0);
    expect(material.metallic).toBe(0.0);
    expect(material.roughness).toBe(0.5);
    expect(material.ao).toBe(1.0);
    expect(material.emissiveColor.r).toBe(0.0);
    expect(material.emissiveIntensity).toBe(1.0);
    expect(material.transparent).toBe(false);
  });

  it("should initialize with custom values", () => {
    const customColor = new Color(0.1, 0.2, 0.3);
    const emissiveColor = new Color(1.0, 0.0, 0.0);
    const emissiveTexture = Texture.empty();

    const options: StandardMaterialOptions = {
      color: customColor,
      metallic: 0.8,
      roughness: 0.2,
      emissiveColor: emissiveColor,
      emissiveMap: emissiveTexture,
      emissiveIntensity: 2.5,
      transparent: true,
    };

    const material = new StandardMaterial(options);

    expect(material.color).toBe(customColor);
    expect(material.metallic).toBe(0.8);
    expect(material.roughness).toBe(0.2);
    expect(material.emissiveColor).toBe(emissiveColor);
    expect(material.emissiveMap).toBe(emissiveTexture);
    expect(material.emissiveIntensity).toBe(2.5);
    expect(material.transparent).toBe(true);
  });

  it("should ignore 'emissive' in options and require 'emissiveColor' (regression test)", () => {
    // This test ensures we don't accidentally pass 'emissive' to the constructor
    // which was a previous bug in Showcase 20.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      emissive: new Color(1.0, 1.0, 1.0),
    };
    const material = new StandardMaterial(options);

    // 'emissiveColor' should remain the default (black) because 'emissive' is ignored
    expect(material.emissiveColor.r).toBe(0.0);
    expect(material.emissiveColor.g).toBe(0.0);
    expect(material.emissiveColor.b).toBe(0.0);
  });

  it("should properly map properties to RenderManifest", () => {
    const emissiveColor = new Color(0.5, 0.6, 0.7);
    const material = new StandardMaterial({
      emissiveColor,
      emissiveIntensity: 3.0,
      transparent: true,
    });

    const manifest = material.getRenderManifest();

    // Check specColor mapping
    const specColor = manifest.properties["u_specColor"] as Float32Array;
    expect(specColor[0]).toBeCloseTo(0.5, 5); // R
    expect(specColor[1]).toBeCloseTo(0.6, 5); // G
    expect(specColor[2]).toBeCloseTo(0.7, 5); // B
    expect(specColor[3]).toBeCloseTo(3.0, 5); // Intensity

    // Check state mapping
    expect(manifest.state?.transparent).toBe(true);
    expect(manifest.state?.blending).toBe(BlendingMode.ALPHA);
    expect(manifest.state?.depthWrite).toBe(false);
  });

  it("should disable depthWrite and enable ALPHA blending only when transparent is true", () => {
    const opaqueMaterial = new StandardMaterial({ transparent: false });
    const opaqueManifest = opaqueMaterial.getRenderManifest();

    expect(opaqueManifest.state?.transparent).toBe(false);
    expect(opaqueManifest.state?.blending).toBe(BlendingMode.OPAQUE);
    expect(opaqueManifest.state?.depthWrite).toBe(true);
  });
});
