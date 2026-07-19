import { ForgeTool } from "./ForgeTool.js";

export class ForgeWindow {
  public static _maxZIndex: number = 10;
  private _windowEl: HTMLDivElement;
  private _contentEl: HTMLDivElement;
  private _tool: ForgeTool | null = null;
  private _onClose?: () => void;
  private _title: string;
  private _persistenceKey: string;

  constructor(
    title: string,
    parent: HTMLElement,
    x: number = 10,
    y: number = 10,
    // Persistence uses a stable key instead of the display title, so renaming a
    // window's title (or two windows sharing a title) doesn't collide or orphan
    // previously saved visibility state.
    persistenceKey: string = title,
  ) {
    this._title = title;
    this._persistenceKey = persistenceKey;
    this._windowEl = document.createElement("div");
    this._windowEl.className = "swf-window";
    this._windowEl.style.left = `${x}px`;
    this._windowEl.style.top = `${y}px`;

    // Header
    const header = document.createElement("div");
    header.className = "swf-window-header";

    const titleEl = document.createElement("span");
    titleEl.className = "swf-window-title";
    titleEl.textContent = title;

    const closeBtn = document.createElement("button");
    closeBtn.className = "swf-window-close";
    closeBtn.textContent = "✖";
    closeBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.close();
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    this._windowEl.appendChild(header);

    // Content
    this._contentEl = document.createElement("div");
    this._contentEl.className = "swf-window-content";
    this._windowEl.appendChild(this._contentEl);

    // Resize Handles
    const directions = ["nw", "ne", "sw", "se"] as const;
    directions.forEach((dir) => {
      const handle = document.createElement("div");
      handle.className = `swf-window-resize-handle swf-resize-${dir}`;
      this._windowEl.appendChild(handle);
      this._bindResize(handle, dir);
    });

    parent.appendChild(this._windowEl);

    // Bring to front on click
    this._windowEl.addEventListener("mousedown", (e) => {
      this.bringToFront();
      e.stopPropagation();
    });
    this._windowEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });
    this._windowEl.addEventListener("touchstart", (e) => {
      e.stopPropagation();
    });
    this._windowEl.addEventListener("wheel", (e) => {
      e.stopPropagation();
    });
    // Prevent context menu (right click) from leaking
    this._windowEl.addEventListener("contextmenu", (e) => {
      e.stopPropagation();
    });

    this._bindDrag(header);
  }

  public mountTool(tool: ForgeTool): void {
    this._tool = tool;
    tool.mount(this._contentEl);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this._tool) {
          const { width, height } = entry.contentRect;
          this._tool.resize(width, height);
        }
      }
    });
    ro.observe(this._contentEl);
  }

  public get title(): string {
    return this._title;
  }

  public get tool(): ForgeTool | null {
    return this._tool;
  }

  public getElement(): HTMLDivElement {
    return this._windowEl;
  }

  public get isVisible(): boolean {
    return this._windowEl.style.display !== "none";
  }

  public toggleVisibility(forceState?: boolean): void {
    const nextState = forceState !== undefined ? forceState : !this.isVisible;
    if (!nextState) {
      this._windowEl.style.display = "none";
    } else {
      this._windowEl.style.display = "flex";
      this.bringToFront();
    }
    localStorage.setItem(`swf_win_${this._persistenceKey}`, nextState ? "1" : "0");
  }

  public restoreState(): void {
    const state = localStorage.getItem(`swf_win_${this._persistenceKey}`);
    if (state === "1") {
      this.toggleVisibility(true);
    } else {
      this.toggleVisibility(false);
    }
  }

  public bringToFront(): void {
    ForgeWindow._maxZIndex++;
    this._windowEl.style.zIndex = ForgeWindow._maxZIndex.toString();
  }

  public setOnClose(cb: () => void): void {
    this._onClose = cb;
  }

  // We change close() to just hide the window, so it acts like minimizing!
  public close(): void {
    this.toggleVisibility();
    if (this._onClose) this._onClose();
  }

  public destroy(): void {
    if (this._tool) {
      this._tool.unmount();
    }
    if (this._windowEl.parentNode) {
      this._windowEl.parentNode.removeChild(this._windowEl);
    }
    if (this._onClose) this._onClose();
  }

  private _bindDrag(header: HTMLElement): void {
    let isDragging = false;
    let startX = 0,
      startY = 0;
    let initialLeft = 0,
      initialTop = 0;

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = parseInt(this._windowEl.style.left || "0", 10);
      initialTop = parseInt(this._windowEl.style.top || "0", 10);
      // Bring to front logic could go here
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this._windowEl.style.left = `${initialLeft + dx}px`;

      let newTop = initialTop + dy;
      if (newTop < 0) newTop = 0; // Prevent dragging out of the top bounds
      this._windowEl.style.top = `${newTop}px`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  private _bindResize(handle: HTMLElement, direction: "nw" | "ne" | "sw" | "se"): void {
    let isResizing = false;
    let startX = 0,
      startY = 0;
    let startWidth = 0,
      startHeight = 0;
    let startLeft = 0,
      startTop = 0;

    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = this._windowEl.offsetWidth;
      startHeight = this._windowEl.offsetHeight;
      startLeft = parseInt(this._windowEl.style.left || "0", 10);
      startTop = parseInt(this._windowEl.style.top || "0", 10);
      e.stopPropagation(); // prevent window dragging or other events
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (direction === "se") {
        this._windowEl.style.width = `${startWidth + dx}px`;
        this._windowEl.style.height = `${startHeight + dy}px`;
      } else if (direction === "sw") {
        this._windowEl.style.width = `${startWidth - dx}px`;
        this._windowEl.style.left = `${startLeft + dx}px`;
        this._windowEl.style.height = `${startHeight + dy}px`;
      } else if (direction === "ne") {
        this._windowEl.style.width = `${startWidth + dx}px`;
        let newTop = startTop + dy;
        let newHeight = startHeight - dy;
        if (newTop < 0) {
          newHeight = startHeight + startTop;
          newTop = 0;
        }
        this._windowEl.style.height = `${newHeight}px`;
        this._windowEl.style.top = `${newTop}px`;
      } else if (direction === "nw") {
        this._windowEl.style.width = `${startWidth - dx}px`;
        this._windowEl.style.left = `${startLeft + dx}px`;
        let newTop = startTop + dy;
        let newHeight = startHeight - dy;
        if (newTop < 0) {
          newHeight = startHeight + startTop;
          newTop = 0;
        }
        this._windowEl.style.height = `${newHeight}px`;
        this._windowEl.style.top = `${newTop}px`;
      }
    });

    window.addEventListener("mouseup", () => {
      isResizing = false;
    });
  }
}
