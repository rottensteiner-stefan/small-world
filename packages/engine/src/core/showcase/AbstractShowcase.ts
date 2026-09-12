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

/**
 * IDs of the actually-existing numbered showcases (`apps/showcases/<id>/`), in navigation order.
 * Not a contiguous 1..N range -- 25 was retired (absorbed into Showcase 10's Waterworld rebuild)
 * and the gap was intentionally kept instead of renumbering everything after it. Kept as an
 * explicit list (mirrors the showcase registries already hand-maintained in vite.config.ts and
 * scripts/check-showcases.js) so PREV/NEXT skips the gap instead of computing a dead ID.
 */
const VALID_SHOWCASE_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28,
  29, 30, 31, 32, 33, 34, 35, 36,
];

export abstract class AbstractShowcase extends SmallWorld {
  private _showcaseKeyDownHandler = (event: KeyboardEvent): void => this.onKeyDown(event);
  private _navButtons: HTMLButtonElement[] = [];

  /**
   * The constructor is passed to Application.
   * Also registers the global keyboard listener for showcases.
   */
  constructor(config: EngineOptions = {}) {
    const rendererTypeOverride = getRendererTypeFromQuery();
    super(rendererTypeOverride ? { ...config, rendererType: rendererTypeOverride } : config);
    window.addEventListener("keydown", this._showcaseKeyDownHandler);
    this._initShowcaseNavigation();
  }

  /**
   * Destroys the showcase instance, freeing resources and removing showcase-specific DOM/listeners.
   */
  public override destroy(): void {
    window.removeEventListener("keydown", this._showcaseKeyDownHandler);
    for (const btn of this._navButtons) {
      btn.remove();
    }
    this._navButtons = [];
    super.destroy();
  }

  /**
   * Initializes the NEXT/PREV pointers for numeric showcases.
   */
  private _initShowcaseNavigation(): void {
    const match = window.location.pathname.match(/\/apps\/showcases\/(\d+)\/?/);
    if (!match) return;

    const currentId = parseInt(match[1]!, 10);
    if (isNaN(currentId)) return;

    const currentIndex = VALID_SHOWCASE_IDS.indexOf(currentId);
    if (currentIndex === -1) return;

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
      this._navButtons.push(btn);
    };

    createButton("◀", "left", () => {
      const prevIndex = (currentIndex - 1 + VALID_SHOWCASE_IDS.length) % VALID_SHOWCASE_IDS.length;
      const nextId = VALID_SHOWCASE_IDS[prevIndex];
      const newPath = window.location.pathname.replace(
        /\/apps\/showcases\/\d+\/?(.*)/,
        `/apps/showcases/${nextId}/$1`,
      );
      window.location.href = newPath;
    });

    createButton("▶", "right", () => {
      const nextIndex = (currentIndex + 1) % VALID_SHOWCASE_IDS.length;
      const nextId = VALID_SHOWCASE_IDS[nextIndex];
      const newPath = window.location.pathname.replace(
        /\/apps\/showcases\/\d+\/?(.*)/,
        `/apps/showcases/${nextId}/$1`,
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
