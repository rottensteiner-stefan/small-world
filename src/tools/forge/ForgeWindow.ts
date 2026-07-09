import { ForgeTool } from "./ForgeTool.js";

export class ForgeWindow {
  private _windowEl: HTMLDivElement;
  private _contentEl: HTMLDivElement;
  private _tool: ForgeTool | null = null;
  private _onClose?: () => void;
  private _title: string;

  constructor(title: string, parent: HTMLElement, x: number = 10, y: number = 10) {
    this._title = title;
    this._windowEl = document.createElement("div");
    this._windowEl.className = "swf-window";
    this._windowEl.style.left = `${x}px`;
    this._windowEl.style.top = `${y}px`;

    // Header
    const header = document.createElement("div");
    header.className = "swf-window-header";

    const titleEl = document.createElement("span");
    titleEl.textContent = title;

    const closeBtn = document.createElement("span");
    closeBtn.className = "swf-close-btn";
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

    // Resize Handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "swf-window-resize-handle";
    this._windowEl.appendChild(resizeHandle);

    parent.appendChild(this._windowEl);

    // Bring to front on click
    this._windowEl.addEventListener("mousedown", () => {
      if (this._windowEl.parentNode) {
        this._windowEl.parentNode.appendChild(this._windowEl);
      }
    });

    this._bindDrag(header);
    this._bindResize(resizeHandle);
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

  public get isVisible(): boolean {
    return this._windowEl.style.display !== "none";
  }

  public toggleVisibility(): void {
    if (this.isVisible) {
      this._windowEl.style.display = "none";
    } else {
      this._windowEl.style.display = "flex";
      // Bring to front
      if (this._windowEl.parentNode) {
        this._windowEl.parentNode.appendChild(this._windowEl);
      }
    }
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
      this._windowEl.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  private _bindResize(handle: HTMLElement): void {
    let isResizing = false;
    let startX = 0,
      startY = 0;
    let startWidth = 0,
      startHeight = 0;

    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = this._windowEl.offsetWidth;
      startHeight = this._windowEl.offsetHeight;
      e.stopPropagation(); // prevent window dragging or other events
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this._windowEl.style.width = `${startWidth + dx}px`;
      this._windowEl.style.height = `${startHeight + dy}px`;
    });

    window.addEventListener("mouseup", () => {
      isResizing = false;
    });
  }
}
