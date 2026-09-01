import { Object3D } from "../../core/index.js";

export interface HierarchyCallbacks {
  /** `toggle` mirrors the click's Shift/Ctrl/Cmd modifier state -- add/remove `obj` from the
   * existing selection instead of replacing it wholesale. */
  onSelect(obj: Object3D, toggle: boolean): void;
  onReparent(obj: Object3D, newParent: Object3D): void;
}

const DRAG_MIME = "text/maker-uuid";

/**
 * A flat, indented outliner (not a nested DOM tree -- simpler to rebuild wholesale on every
 * structural change) with real drag-and-drop reparenting, replacing GadgetInspector's
 * read-only "jump to parent/child" buttons. Rebuilt from scratch on every `refresh()` -- fine
 * at Maker's expected scene sizes; a diffed update is a later-phase concern if it ever isn't.
 */
export class HierarchyPanel {
  constructor(
    private _container: HTMLElement,
    private _getRoot: () => Object3D,
    private _callbacks: HierarchyCallbacks,
    /** Editor-only helper meshes (selection highlight, transform gizmo) are real scene children
     * but shouldn't clutter the outliner -- excluded (subtree and all) by identity here. */
    private _isExcluded: (obj: Object3D) => boolean = () => false,
  ) {
    this._container.classList.add("maker-hierarchy");
    this._container.addEventListener("dragover", (e) => e.preventDefault());
    this._container.addEventListener("drop", (e) => {
      // Dropped on empty space below the last row -- reparent to the scene root.
      if (e.target !== this._container) return;
      e.preventDefault();
      const draggedUuid = e.dataTransfer?.getData(DRAG_MIME);
      const dragged = draggedUuid && this._findByUuid(this._getRoot(), draggedUuid);
      if (dragged) this._callbacks.onReparent(dragged, this._getRoot());
    });
  }

  private _selection: ReadonlySet<Object3D> = new Set();

  public setSelected(selection: ReadonlySet<Object3D>): void {
    this._selection = selection;
    this.refresh();
  }

  public refresh(): void {
    this._container.innerHTML = "";
    this._renderChildren(this._getRoot(), 0);
  }

  private _renderChildren(parent: Object3D, depth: number): void {
    for (const child of parent.children) {
      if (this._isExcluded(child)) continue;
      const row = document.createElement("div");
      row.className = "maker-hierarchy-row" + (this._selection.has(child) ? " selected" : "");
      row.style.paddingLeft = `${depth * 16 + 6}px`;
      row.textContent = child.name || child.constructor.name;
      row.draggable = true;

      row.addEventListener("click", (e) => {
        this._callbacks.onSelect(child, e.shiftKey || e.ctrlKey || e.metaKey);
      });
      row.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData(DRAG_MIME, child.uuid);
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedUuid = e.dataTransfer?.getData(DRAG_MIME);
        const dragged = draggedUuid && this._findByUuid(this._getRoot(), draggedUuid);
        if (dragged && dragged !== child && !this._isAncestorOf(dragged, child)) {
          this._callbacks.onReparent(dragged, child);
        }
      });

      this._container.appendChild(row);
      this._renderChildren(child, depth + 1);
    }
  }

  private _findByUuid(obj: Object3D, uuid: string): Object3D | undefined {
    if (obj.uuid === uuid) return obj;
    for (const child of obj.children) {
      const found = this._findByUuid(child, uuid);
      if (found) return found;
    }
    return undefined;
  }

  /** A node can never become its own descendant's child -- would create a cycle. */
  private _isAncestorOf(candidate: Object3D, obj: Object3D): boolean {
    let p: Object3D | undefined = obj.parent;
    while (p) {
      if (p === candidate) return true;
      p = p.parent;
    }
    return false;
  }
}
