/// src/interfaces/CameraInterfaceData.ts

import { AbstractProjection } from "../math/index.js";
import { CameraEffectType, CameraStrategyType } from "../enums/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { CameraStrategy } from "./CameraStrategy.js";
import { CameraConstraints } from "./CameraConstraints.js";
import { CameraEffect } from "./CameraEffect.js";

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

  /** Setzt oder entfernt Kamera-Constraints für die aktive Strategie */
  setConstraints(constraints?: CameraConstraints): void;

  /** Führt die Bewegung und Logik der aktiven Strategie aus */
  update(targetPos: Vector3D, dx: number, dy: number, deltaTime?: number): void;

  /** Fügt einen Effekt zur Kamera hinzu */
  addEffect(effect: CameraEffect): void;

  /** Erstellt und aktiviert einen Effekt über seinen Typ */
  applyEffect(type: CameraEffectType, intensity?: number, duration?: number): void;

  /** Berechnet die Verzerrung (Perspektive oder Orthografisch) neu */
  updateProjectionMatrix(): void;

  /** Berechnet die Blickrichtung und Position neu */
  updateViewMatrix(): void;
}
