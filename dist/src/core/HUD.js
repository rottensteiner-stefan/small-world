/// src/core/HUD.ts
import { ENGINE_VERSION } from "./Engine.js";
import { AssetManager } from "../loaders/AssetManager.js";
/**
 * Handles the Head-Up Display (HUD) overlay.
 */
export class HUD {
    _enabled;
    _root = undefined;
    _elements = new Map();
    /**
     * Creates a new HUD.
     * @param _enabled Whether the HUD is enabled.
     */
    constructor(_enabled) {
        this._enabled = _enabled;
    }
    /**
     * Initializes the HUD by loading the template and binding elements.
     */
    async init() {
        if (!this._enabled) {
            return;
        }
        try {
            let html = await AssetManager.loadText("./resources/templates/hud.html");
            html = html.replace(/{sm-engine-version}/g, `v${ENGINE_VERSION}`);
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);
            this._root = document.getElementById("sw-hud-root") ?? undefined;
            const nodes = document.querySelectorAll("[data-hud]");
            nodes.forEach((node) => {
                const key = node.getAttribute("data-hud") ?? undefined;
                if (key) {
                    this._elements.set(key, node);
                }
            });
        }
        catch (e) {
            console.error("[HUD] Failed to load template:", e);
        }
    }
    /**
     * Sets the visibility of the HUD.
     * @param visible True to show the HUD.
     */
    setVisible(visible) {
        if (this._root) {
            this._root.style.display = visible ? "block" : "none";
        }
    }
    /**
     * Updates the HUD with the given data.
     * @param data A record of key-value pairs to update.
     */
    update(data) {
        if (!this._enabled || !this._root || this._root.style.display === "none") {
            return;
        }
        for (const key in data) {
            const el = this._elements.get(key);
            if (el) {
                const value = data[key];
                if (value !== undefined) {
                    el.textContent = value.toString();
                }
            }
        }
    }
}
//# sourceMappingURL=HUD.js.map