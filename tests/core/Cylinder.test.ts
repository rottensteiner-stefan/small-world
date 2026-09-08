import { describe, it, expect } from "vitest";
import { Cylinder } from "../../src/index.js";

describe("Cylinder Geometry", () => {
  it("generates caps by default when openEnded is false", () => {
    const closed = new Cylinder({
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      radialSegments: 8,
      heightSegments: 1,
      openEnded: false,
    });
    const geo = closed.getGeometryData();

    expect(closed.openEnded).toBe(false);
    expect(geo.indices).toBeDefined();
    expect(geo.indices!.length).toBeGreaterThan(8 * 2 * 3);
  });

  it("skips top and bottom caps when openEnded is true", () => {
    const closed = new Cylinder({
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      radialSegments: 8,
      heightSegments: 1,
      openEnded: false,
    });
    const open = new Cylinder({
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      radialSegments: 8,
      heightSegments: 1,
      openEnded: true,
    });

    const closedGeo = closed.getGeometryData();
    const openGeo = open.getGeometryData();

    expect(open.openEnded).toBe(true);
    expect(openGeo.vertices.length).toBeLessThan(closedGeo.vertices.length);
    expect(openGeo.indices!.length).toBeLessThan(closedGeo.indices!.length);
    expect(openGeo.indices!.length).toBe(8 * 2 * 3);
  });
});
