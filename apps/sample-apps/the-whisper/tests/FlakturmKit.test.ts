import { describe, it, expect } from "vitest";
import { FlakturmKit } from "../builder/FlakturmKit.js";
import { Vector3D, PointLight } from "@small-world/engine";

describe("FlakturmKit Prop & Material Builder", () => {
  it("creates a caged industrial fluorescent lamp with light source", () => {
    const lamp = FlakturmKit.createFluorescentLamp({
      name: "BunkerHallLamp",
      length: 1.5,
      caged: true,
      intensity: 2.0,
    });

    expect(lamp.name).toBe("BunkerHallLamp");
    expect(lamp.children.length).toBeGreaterThan(5);

    const pointLight = lamp.children.find((c) => c instanceof PointLight) as PointLight | undefined;
    expect(pointLight).toBeDefined();
    expect(pointLight?.intensity).toBe(2.0);

    const housing = lamp.children.find((c) => c.name === "Housing");
    expect(housing).toBeDefined();
    expect(housing?.scale.z).toBe(1.5);
  });

  it("creates an uncaged bare fluorescent lamp", () => {
    const lamp = FlakturmKit.createFluorescentLamp({
      caged: false,
      length: 1.0,
    });

    expect(lamp.name).toBe("FluorescentLamp");
    const cageHoop = lamp.children.find((c) => c.name.startsWith("CageHoop"));
    expect(cageHoop).toBeUndefined();
  });

  it("creates modular electrical conduit wiring with junction boxes", () => {
    const conduit = FlakturmKit.createConduitRun([
      {
        start: new Vector3D(0, 2.0, 0),
        end: new Vector3D(2.0, 2.0, 0),
        junctionAtStart: true,
        junctionAtEnd: true,
      },
      {
        start: new Vector3D(2.0, 2.0, 0),
        end: new Vector3D(2.0, 1.0, 0),
        junctionAtEnd: true,
      },
    ]);

    expect(conduit.name).toBe("ConduitRun");
    expect(conduit.children.length).toBeGreaterThan(4);

    const startBox = conduit.children.find((c) => c.name === "JunctionBox_Start_0");
    const endBox = conduit.children.find((c) => c.name === "JunctionBox_End_0");
    expect(startBox).toBeDefined();
    expect(endBox).toBeDefined();
  });

  it("creates a procedural rubble and rebar debris cluster", () => {
    const debris = FlakturmKit.createDebrisCluster(6, 0.8);
    expect(debris.name).toBe("DebrisCluster");
    expect(debris.children.length).toBeGreaterThanOrEqual(6);

    const rebarHook = debris.children.find((c) => c.name.startsWith("RebarHook"));
    expect(rebarHook).toBeDefined();
  });

  it("creates a wall-mounted ventilation hatch with mesh door", () => {
    const hatch = FlakturmKit.createVentHatch({
      name: "CorridorVentHatch",
      width: 0.9,
      height: 1.0,
      openAngle: Math.PI / 3,
    });

    expect(hatch.name).toBe("CorridorVentHatch");
    const collar = hatch.children.find((c) => c.name === "WallCollar");
    const hinge = hatch.children.find((c) => c.name === "DoorHinge");
    expect(collar).toBeDefined();
    expect(hinge).toBeDefined();
    expect(hinge?.rotation.y).toBeCloseTo(Math.PI / 3);
  });
});
