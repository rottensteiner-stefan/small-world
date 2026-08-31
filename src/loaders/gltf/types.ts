export type TypedArray = Uint8Array | Uint16Array | Uint32Array | Float32Array;

export interface GltfJson {
  buffers?: { uri?: string }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
  accessors?: {
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
  }[];
  meshes?: {
    name?: string;
    primitives: {
      attributes: { [key: string]: number };
      indices?: number;
      material?: number;
    }[];
  }[];
  skins?: {
    inverseBindMatrices?: number;
    skeleton?: number;
    joints: number[];
    name?: string;
  }[];
  animations?: {
    name?: string;
    channels: {
      sampler: number;
      target: {
        node?: number;
        path: "translation" | "rotation" | "scale" | "weights";
      };
    }[];
    samplers: {
      input: number;
      output: number;
      interpolation?: "LINEAR" | "STEP" | "CUBICSPLINE";
    }[];
  }[];
  nodes?: {
    name?: string;
    children?: number[];
    matrix?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: number;
    skin?: number;
    extensions?: {
      KHR_lights_punctual?: { light: number };
      [key: string]: unknown;
    };
  }[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
  extensions?: {
    KHR_lights_punctual?: {
      lights: {
        type: "point" | "directional" | "spot";
        color?: number[];
        intensity?: number;
        range?: number;
        name?: string;
      }[];
    };
  };
  materials?: {
    pbrMetallicRoughness?: {
      baseColorFactor?: number[];
      baseColorTexture?: { index: number };
      metallicFactor?: number;
      roughnessFactor?: number;
      metallicRoughnessTexture?: { index: number };
    };
    normalTexture?: { index: number; scale?: number };
    occlusionTexture?: { index: number; strength?: number };
    emissiveTexture?: { index: number };
    emissiveFactor?: number[];
    alphaMode?: "OPAQUE" | "MASK" | "BLEND";
    alphaCutoff?: number;
    doubleSided?: boolean;
    extensions?: {
      KHR_materials_emissive_strength?: {
        emissiveStrength?: number;
      };
      [key: string]: unknown;
    };
  }[];
  textures?: { source?: number; sampler?: number }[];
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
}

export interface GltfData {
  json: GltfJson;
  buffers: ArrayBuffer[];
}
