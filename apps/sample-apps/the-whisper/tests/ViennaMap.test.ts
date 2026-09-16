import { describe, it, expect } from "vitest";
import { VIENNA_LOCATIONS, ViennaMapModal, type MapLocation } from "../ui/ViennaMapModal.js";

describe("ViennaMap & Locations Data Model", () => {
  it("should contain all key Vienna 2100 canonical locations", () => {
    const ids = VIENNA_LOCATIONS.map((loc) => loc.id);
    expect(ids).toContain("flakturm_arenberg");
    expect(ids).toContain("koje_42");
    expect(ids).toContain("bermudadreieck");
    expect(ids).toContain("prater_riesenrad");
    expect(ids).toContain("rossauer_kaserne");
    expect(ids).toContain("zentralfriedhof");
    expect(ids).toContain("safehouse_schellein");
    expect(ids).toContain("character_diorama");
  });

  it("should validate that all locations have valid coordinates and notes", () => {
    VIENNA_LOCATIONS.forEach((loc: MapLocation) => {
      expect(loc.xPercent).toBeGreaterThanOrEqual(0);
      expect(loc.xPercent).toBeLessThanOrEqual(100);
      expect(loc.yPercent).toBeGreaterThanOrEqual(0);
      expect(loc.yPercent).toBeLessThanOrEqual(100);

      expect(loc.title.length).toBeGreaterThan(3);
      expect(loc.district.length).toBeGreaterThan(2);
      expect(loc.grandfatherNote.length).toBeGreaterThan(10);
      expect(loc.transitText.length).toBeGreaterThan(10);
      expect(loc.faction.length).toBeGreaterThan(3);
    });
  });

  it("should correctly identify available travel targets", () => {
    const available = VIENNA_LOCATIONS.filter((l) => l.status === "available");
    expect(available.length).toBeGreaterThanOrEqual(2);

    available.forEach((loc) => {
      expect(loc.targetUrl).toBeDefined();
      expect(typeof loc.targetUrl).toBe("string");
    });
  });

  it("should toggle open and closed state on ViennaMapModal instance", () => {
    const modal = new ViennaMapModal("flakturm_arenberg");
    expect(modal.isOpen).toBe(false);

    modal.open();
    expect(modal.isOpen).toBe(true);

    modal.close();
    expect(modal.isOpen).toBe(false);

    modal.toggle();
    expect(modal.isOpen).toBe(true);

    modal.destroy();
  });
});
