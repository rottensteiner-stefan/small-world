import { AbstractProjection } from "../math/projections/AbstractProjection.js";
import { Vector3D } from "../math/Vector3D.js";

export interface ICamera {
  /** Position der Kamera in der Welt */
  position: Vector3D;

  /** Das Seitenverhältnis (z.B. für Window-Resizing) */
  aspect: number;

  /** Die aktive Projektionsart (Perspektive, Orthografisch, etc.) */
  projection: AbstractProjection;

  /** Gibt den Namen der aktuell genutzten Kamera-Strategie zurück */
  readonly activeStrategyType: string;

  /** Die kombinierte Matrix, die der Shader am Ende braucht (View * Projection) */
  viewProjectionMatrix: Float32Array;

  /** Berechnet die Verzerrung (Perspektive oder Orthografisch) neu */
  updateProjectionMatrix(): void;

  /** Berechnet die Blickrichtung und Position neu */
  updateViewMatrix(): void;
}
