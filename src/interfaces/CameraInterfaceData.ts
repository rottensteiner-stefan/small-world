/// src/interfaces/CameraInterfaceData.ts
import { AbstractProjection } from "../math/projections/AbstractProjection.js";
import { CameraStrategyType } from "../enums/CameraStrategyType.js";
import { Vector3D } from "../math/Vector3D.js";
import { CameraStrategy } from "./CameraStrategy.js";

export interface CameraInterfaceData {
  /** Die aktuell genutzte Kamera-Strategie */
  readonly strategy: CameraStrategy;
  /** Position der Kamera in der Welt */
  position: Vector3D;
  /** Punkt, auf den die Kamera schaut */
  target: Vector3D;
  /** Oben-Vektor (meistens 0, 1, 0) */
  up: Vector3D;

  /** Das Seitenverhältnis (z.B. für Window-Resizing) */
  aspect: number;

  /** Die aktive Projektionsart (Perspektive, Orthografisch, etc.) */
  projection: AbstractProjection;

  /** Rotationswinkel auf der X/Z-Ebene */
  theta: number;
  /** Neigungswinkel (hoch/runter) */
  phi: number;

  /** Gibt den Namen der aktuell genutzten Kamera-Strategie zurück */
  readonly activeStrategyType: string;

  /** Die kombinierte Matrix, die der Shader am Ende braucht (View * Projection) */
  viewProjectionMatrix: Float32Array;

  /** Wechselt das Steuerungsverhalten der Kamera */
  setStrategy(type: CameraStrategyType): void;

  /** Führt die Bewegung und Logik der aktiven Strategie aus */
  update(targetPos: Vector3D, dx: number, dy: number): void;

  /** Berechnet die Verzerrung (Perspektive oder Orthografisch) neu */
  updateProjectionMatrix(): void;

  /** Berechnet die Blickrichtung und Position neu */
  updateViewMatrix(): void;
}
