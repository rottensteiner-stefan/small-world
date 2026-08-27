import { SmallWorld } from "../index.js";
import { EngineOptions } from "../../interfaces/index.js";
import { Keys, RendererType } from "../../enums/index.js";
import { AssetManager } from "../../loaders/index.js";

/**
 * Reads a `?rendererType=` override from the page URL (e.g. `?rendererType=WEB_GL2`),
 * matched case-insensitively against `RendererType`'s members. Lets any showcase's
 * renderer be swapped from the address bar without touching its source.
 */
function getRendererTypeFromQuery(): RendererType | undefined {
  const raw = new URLSearchParams(window.location.search).get("rendererType");
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return (Object.values(RendererType) as string[]).includes(upper)
    ? (upper as RendererType)
    : undefined;
}

export abstract class AbstractShowcase extends SmallWorld {
  /**
   * The constructor is passed to Application.
   * Also registers the global keyboard listener for showcases.
   */
  constructor(config: EngineOptions = {}) {
    const rendererTypeOverride = getRendererTypeFromQuery();
    super(rendererTypeOverride ? { ...config, rendererType: rendererTypeOverride } : config);
    window.addEventListener("keydown", (event: KeyboardEvent): void => this.onKeyDown(event));
    this._initShowcaseNavigation();
  }

  /**
   * Initializes the NEXT/PREV pointers for numeric showcases.
   */
  private _initShowcaseNavigation(): void {
    const match = window.location.pathname.match(/\/showcases\/(\d+)\/?/);
    if (!match) return;

    const currentId = parseInt(match[1]!, 10);
    if (isNaN(currentId)) return;

    const totalShowcases = 34;

    const createButton = (
      text: string,
      position: "left" | "right" | "top-left",
      action: () => void,
    ): void => {
      const btn = document.createElement("button");
      btn.innerText = text;

      const style: Partial<CSSStyleDeclaration> = {
        position: "absolute",
        background: "rgba(0, 15, 25, 0.6)",
        border: "1px solid #b000ff",
        color: "#b000ff",
        padding: "8px 18px",
        borderRadius: "2px",
        cursor: "pointer",
        fontSize: "1.1rem",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "2px",
        zIndex: "1000",
        pointerEvents: "auto",
        transition: "all 0.3s ease",
        fontFamily: "inherit",
      };

      if (position === "left") {
        style.top = "24px";
        style.left = "20px";
      } else if (position === "right") {
        style.top = "24px";
        style.right = "20px";
      } else if (position === "top-left") {
        style.top = "20px";
        style.left = "20px";
      }

      Object.assign(btn.style, style);

      btn.onmouseenter = (): void => {
        btn.style.background = "#b000ff";
        btn.style.color = "#000";
        btn.style.boxShadow = "0 0 20px rgba(176, 0, 255, 0.8), 0 0 40px rgba(176, 0, 255, 0.4)";
      };
      btn.onmouseleave = (): void => {
        btn.style.background = "rgba(0, 15, 25, 0.6)";
        btn.style.color = "#b000ff";
        btn.style.boxShadow = "none";
      };

      btn.onclick = action;

      document.body.appendChild(btn);
    };

    createButton("◀", "left", () => {
      let nextId = currentId - 1;
      if (nextId < 1) nextId = totalShowcases;
      const newPath = window.location.pathname.replace(
        /\/showcases\/\d+\/?(.*)/,
        `/showcases/${nextId}/$1`,
      );
      window.location.href = newPath;
    });

    createButton("▶", "right", () => {
      let nextId = currentId + 1;
      if (nextId > totalShowcases) nextId = 1;
      const newPath = window.location.pathname.replace(
        /\/showcases\/\d+\/?(.*)/,
        `/showcases/${nextId}/$1`,
      );
      window.location.href = newPath;
    });
  }

  /**
   * Helper to wait for all currently loading assets to finish.
   * Useful to call at the end of setupScene.
   */
  protected async waitForAssets(): Promise<void> {
    if (!AssetManager.isLoaded) {
      await AssetManager.onLoaded();
    }
  }

  /**
   * Central keyboard control for all showcasess.
   * Inheriting classes can override this method and call super.onKeyDown(event).
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (Keys.B === event.code) {
      this.debug = !this.debug;
    }
  }

  /**
   * A hook method that is called when the canvas element is recreated.
   * By default, it binds the click event to request PointerLock. Inheriting classes can override this if needed.
   */
  protected onCanvasRecreated(): void {
    this.canvas.addEventListener("click", (event: MouseEvent): void => {
      // Wenn SHIFT gedrückt ist, ignorieren wir den PointerLock (damit der Inspector arbeiten kann)
      if (event.shiftKey) return;

      if (!this.input.isPointerLocked) {
        this.input.requestPointerLock(this.canvas);
      }
    });
  }

  /**
   * Default update method for examples. Subclasses can override this to implement custom logic.
   * @param _deltaTime Time elapsed since the last frame.
   */
  protected update(_deltaTime: number): void {
    // Default implementation does nothing
  }
}
