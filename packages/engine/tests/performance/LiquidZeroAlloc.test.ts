import { describe, expect, it, beforeAll } from "vitest";
import {
  FluidSurfaceMaterial,
  LavaMaterial,
  SlimeMaterial,
  OpenWaterMaterial,
  StylizedWaterMaterial,
  Object3D,
  MathPool,
  UniformPacker,
  ShaderBootstrap,
  ShaderRegistry,
} from "../../src/index.js";

describe("Liquid Materials Zero-Allocation Guarantees", () => {
  beforeAll(async () => {
    await ShaderBootstrap.init();
  });

  const liquidMaterials = [
    { name: "FluidSurfaceMaterial", instance: new FluidSurfaceMaterial() },
    { name: "LavaMaterial", instance: new LavaMaterial() },
    { name: "SlimeMaterial", instance: new SlimeMaterial() },
    { name: "OpenWaterMaterial", instance: new OpenWaterMaterial() },
    { name: "StylizedWaterMaterial", instance: new StylizedWaterMaterial() },
  ];

  describe("Manifest Instance & Buffer Reuse", () => {
    liquidMaterials.forEach(({ name, instance }) => {
      it(`should reuse the same RenderManifest and internal property buffers for ${name} across frame updates`, () => {
        // First frame
        const manifest1 = instance.getRenderManifest();
        const props1 = manifest1.properties as Record<string, unknown>;

        // Capture references to all internal arrays/buffers in the manifest
        const arrayRefs1 = new Map<string, unknown>();
        for (const [key, val] of Object.entries(props1)) {
          if (typeof val === "object" && val !== null) {
            arrayRefs1.set(key, val);
          }
        }

        // Simulate frame updates
        for (let frame = 1; frame <= 100; frame++) {
          instance.time += 0.016;
          const manifestN = instance.getRenderManifest();
          const propsN = manifestN.properties as Record<string, unknown>;

          // Must return the exact same manifest object instance
          expect(manifestN).toBe(manifest1);

          // All array/buffer references inside manifest.properties must be identical across frames
          for (const [key, ref1] of arrayRefs1) {
            expect(propsN[key]).toBe(ref1);
          }
        }
      });
    });
  });

  describe("UniformPacker Packing Zero-Allocation & MathPool Soundness", () => {
    liquidMaterials.forEach(({ name, instance }) => {
      it(`should pack ObjectUniforms for ${name} with 0 MathPool leaks into a pre-allocated buffer`, () => {
        const obj = new Object3D();
        obj.material = instance;
        obj.position.set(10, 20, 30);
        obj.updateMatrixWorld();

        const def = instance.getShaderDefinition();
        const scratchBuffer = new Float32Array(128); // 512 bytes = 128 floats
        const scratchUniformValues: Record<string, unknown> = {};
        const scratchModelMatrix = new Float32Array(16);

        // Warm up
        instance.time = 0;
        let manifest = instance.getRenderManifest();
        scratchModelMatrix.set(obj.worldMatrix.data);
        for (const k in scratchUniformValues) scratchUniformValues[k] = undefined;
        for (const k in manifest.properties) scratchUniformValues[k] = manifest.properties[k];
        scratchUniformValues["u_model"] = scratchModelMatrix;
        UniformPacker.packInto(def.layout, scratchUniformValues, scratchBuffer);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vectorsBefore = (MathPool as any)._VECTOR_POOL.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matricesBefore = (MathPool as any)._MATRIX_POOL.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quaternionsBefore = (MathPool as any)._QUATERNION_POOL.length;

        // Run 1000 simulated frame packing cycles
        for (let frame = 1; frame <= 1000; frame++) {
          instance.time += 0.016;
          obj.position.x += 0.001;
          obj.updateMatrixWorld();

          manifest = instance.getRenderManifest();
          scratchModelMatrix.set(obj.worldMatrix.data);

          for (const k in scratchUniformValues) scratchUniformValues[k] = undefined;
          for (const k in manifest.properties) scratchUniformValues[k] = manifest.properties[k];
          scratchUniformValues["u_model"] = scratchModelMatrix;

          UniformPacker.packInto(def.layout, scratchUniformValues, scratchBuffer);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vectorsAfter = (MathPool as any)._VECTOR_POOL.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matricesAfter = (MathPool as any)._MATRIX_POOL.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quaternionsAfter = (MathPool as any)._QUATERNION_POOL.length;

        expect(vectorsAfter).toBe(vectorsBefore);
        expect(matricesAfter).toBe(matricesBefore);
        expect(quaternionsAfter).toBe(quaternionsBefore);

        // Model matrix should have been packed to offset 0
        expect(scratchBuffer[12]).toBeCloseTo(obj.position.x);
        expect(scratchBuffer[13]).toBeCloseTo(20);
        expect(scratchBuffer[14]).toBeCloseTo(30);
      });
    });
  });

  describe("WebGPURenderer Packing Pipeline Parity", () => {
    it("should pack liquid manifests without allocating new property structures", () => {
      const materials = [
        new FluidSurfaceMaterial(),
        new LavaMaterial(),
        new SlimeMaterial(),
        new OpenWaterMaterial(),
        new StylizedWaterMaterial(),
      ];

      const scratchObjBufferData = new Float32Array(128); // 512 bytes = 128 floats
      const scratchUniformValues: Record<string, unknown> = {};
      const scratchModelMatrix = new Float32Array(16);
      const scratchColorArray = new Float32Array(4);

      for (const mat of materials) {
        const obj = new Object3D();
        obj.material = mat;
        const shaderDef = ShaderRegistry.instance.get(mat.type)!;
        expect(shaderDef).toBeDefined();

        for (let frame = 0; frame < 500; frame++) {
          mat.time += 0.016;
          const m = mat.getRenderManifest();

          scratchModelMatrix.set(obj.worldMatrix.data);

          for (const k in scratchUniformValues) {
            scratchUniformValues[k] = undefined;
          }
          for (const k in m.properties) {
            scratchUniformValues[k] = m.properties[k];
          }

          scratchUniformValues["u_model"] = scratchModelMatrix;
          if (scratchUniformValues["u_color"] === undefined && obj.material) {
            scratchColorArray[0] = obj.material.color?.r ?? 1.0;
            scratchColorArray[1] = obj.material.color?.g ?? 1.0;
            scratchColorArray[2] = obj.material.color?.b ?? 1.0;
            scratchColorArray[3] = obj.material.color?.a ?? 1.0;
            scratchUniformValues["u_color"] = scratchColorArray;
          }

          if (scratchUniformValues["u_isSkinned"] === undefined) {
            scratchUniformValues["u_isSkinned"] = 0.0;
            scratchUniformValues["u_boneOffset"] = 0.0;
          }

          UniformPacker.packInto(shaderDef.layout, scratchUniformValues, scratchObjBufferData);
        }
      }
    });
  });
});
