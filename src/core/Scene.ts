import { Object3D } from "./Object3D.js";

/**
 * Die Scene ist jetzt der Wurzelknoten (Root) deines Universums.
 * Sie muss nicht mehr händisch über Kinder iterieren, da updateMatrixWorld
 * rekursiv alle Ebenen der Hierarchie erreicht.
 */
export class Scene extends Object3D {
  constructor() {
    super("ROOT_SCENE");
  }

  public update(): void {
    // Berechnet die Welt-Matrizen für die gesamte Hierarchie
    this.updateMatrixWorld();
  }
}
