/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TerminalModal, DEFAULT_TERMINAL_DATA } from "../ui/TerminalModal.js";

describe("TerminalModal Component", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should initialize and render modal container in DOM", () => {
    const modal = new TerminalModal();
    expect(modal).toBeDefined();
    expect(modal.isOpen).toBe(false);

    const root = document.getElementById("terminal-modal-root");
    expect(root).not.toBeNull();
    expect(root?.style.display).toBe("none");
  });

  it("should open and close correctly", () => {
    const modal = new TerminalModal();
    modal.open("case");
    expect(modal.isOpen).toBe(true);

    const root = document.getElementById("terminal-modal-root");
    expect(root?.style.display).toBe("flex");

    const content = document.getElementById("terminal-screen-content");
    expect(content?.innerHTML).toContain(DEFAULT_TERMINAL_DATA.deceasedName);
    expect(content?.innerHTML).toContain("Pollak");
    expect(content?.innerHTML).toContain("Brandstätter");

    modal.close();
    expect(modal.isOpen).toBe(false);
    expect(root?.style.display).toBe("none");
  });

  it("should switch tabs to logbook and diagnostics", () => {
    const modal = new TerminalModal();
    modal.open("logbook");
    const content = document.getElementById("terminal-screen-content");
    expect(content?.innerHTML).toContain("AUTO-JOURNAL");
    expect(content?.innerHTML).toContain("INFILTRATION SEKTOR 0");

    modal.open("diagnostics");
    expect(content?.innerHTML).toContain("SYSTEM-STATUS &amp; DOSIMETRIE");
    expect(content?.innerHTML).toContain("Freudenau");
  });

  it("should trigger onClose callbacks", () => {
    const modal = new TerminalModal();
    const onCloseSpy = vi.fn();
    modal.onClose(onCloseSpy);

    modal.open();
    modal.close();
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });
});
