import { TextLoader } from "./TextLoader.js";

export class ShaderLoader extends TextLoader {
  // Aktuell macht der ShaderLoader genau dasselbe wie der TextLoader.
  // Er ist aber ein eigener Typ, falls wir später WebGPU-Shader-Code
  // direkt hier validieren oder parsen möchten!
}
