import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Regression guard for docs/adr/0006-pcss-directional-light-only.md: WebGPU spot-light shadows
// use PCSS (getShadowPCSS is fully generic -- same signature as getShadowPCF, no directional-
// specific uniform access -- so this is a pure function-name swap, no new bindings). The
// directional cascade-blend sample deliberately stays on fixed PCF (avoids doubling the
// blocker-search cost in the blend zone), so that call must NOT be swapped by mistake.

function readWgsl(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

describe("WebGPU spot-light shadows use PCSS", () => {
  const files = [
    "src/core/renderers/shaders/source/web_gpu/chunks/lighting.wgsl",
    "src/core/renderers/shaders/source/web_gpu/chunks/lighting_pbr.wgsl",
  ];

  for (const file of files) {
    it(`${file}: spot-light shadow call uses getShadowPCSS, not getShadowPCF`, () => {
      const source = readWgsl(file);
      expect(source).toContain(
        "getShadowPCSS(u_spotShadowMap, shadowSampler, shadowPos, j, global.spotShadowInfo[j].x)",
      );
      expect(source).not.toContain("getShadowPCF(u_spotShadowMap");
    });

    it(`${file}: directional cascade-blend sample stays on fixed PCF`, () => {
      const source = readWgsl(file);
      expect(source).toContain(
        "getShadowPCF(u_dirShadowMap, shadowSampler, shadowPosB, nextCascade, global.dirShadowInfo.x)",
      );
    });
  }
});
