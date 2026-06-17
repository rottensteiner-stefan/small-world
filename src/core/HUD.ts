/// src/core/HUD.ts

import { ENGINE_VERSION } from "./SmallWorld.js";
import { AssetManager } from "../loaders/AssetManager.js";

/**
 * Handles the Head-Up Display (HUD) overlay.
 */
export class HUD {
  private _root: HTMLElement | undefined = undefined;
  private _elements: Map<string, HTMLElement> = new Map<string, HTMLElement>();

  /**
   * Creates a new HUD.
   * @param _enabled Whether the HUD is enabled.
   */
  constructor(private _enabled: boolean) {}

  /**
   * Initializes the HUD by loading the template and binding elements.
   */
  public async init(): Promise<void> {
    if (!this._enabled) {
      return;
    }
    try {
      let html: string = await AssetManager.loadText("./resources/templates/hud.html");

      html = html.replace(/{sm-engine-version}/g, `v${ENGINE_VERSION}`);

      const container: HTMLDivElement = document.createElement("div");
      container.innerHTML = html;
      document.body.appendChild(container);

      this._root = document.getElementById("sw-hud-root") ?? undefined;

      const nodes: NodeListOf<Element> = document.querySelectorAll("[data-hud]");
      nodes.forEach((node: Element) => {
        const key: string | undefined = node.getAttribute("data-hud") ?? undefined;
        if (key) {
          this._elements.set(key, node as HTMLElement);
        }
      });
    } catch (e: unknown) {
      console.error("[HUD] Failed to load template:", e);
    }
  }

  /**
   * Sets the visibility of the HUD.
   * @param visible True to show the HUD.
   */
  public setVisible(visible: boolean): void {
    if (this._root) {
      this._root.style.display = visible ? "block" : "none";
    }
  }

  /**
   * Updates the HUD with the given data.
   * @param data A record of key-value pairs to update.
   */
  public update(data: Record<string, string | number>): void {
    if (!this._enabled || !this._root || this._root.style.display === "none") {
      return;
    }

    for (const key in data) {
      const el: HTMLElement | undefined = this._elements.get(key);
      if (el) {
        const value: string | number | undefined = data[key];
        if (value !== undefined) {
          el.textContent = value.toString();
        }
      }
    }
  }
}
