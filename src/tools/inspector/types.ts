/** Minimal shape shared by Tweakpane binding APIs — only what this file actually calls. */
export interface RefreshableBinding {
  refresh(): void;
}

/** Minimal shape shared by Tweakpane blade APIs (buttons, bindings, ...) that support disposal. */
export interface DisposableBlade {
  dispose(): void;
}

export interface AxesSettings {
  showWorldAxes: boolean;
  showObjectAxes: boolean;
  axesScale: number;
}

export interface InspectorStats {
  renderer: string;
  resolution: string;
  fps: number;
  objects: number;
  visible: number;
}
