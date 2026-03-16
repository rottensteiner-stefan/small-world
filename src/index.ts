// --- Core ---
export { Application } from "./core/Application.js";
export { AssetManager } from "./loaders/AssetManager.js";
export { Camera } from "./core/Camera.js";
export { ENGINE_VERSION, DEFAULT_RENDERER } from "./core/Engine.js";
export { HUD } from "./core/HUD.js";
export { Input } from "./core/Input.js";
export { Object3D } from "./core/Object3D.js";
export { ObjLoader } from "./loaders/ObjLoader.js";
export { Scene } from "./core/Scene.js";
export { SmallWorld, type WorldConfig } from "./core/SmallWorld.js";

// --- Textures ---
export { CubeTexture } from "./core/textures/CubeTexture.js";
export { SkyboxLoader } from "./loaders/SkyboxLoader.js";
export { Skybox } from "./core/Skybox.js";
export { Texture } from "./core/textures/Texture.js";

// --- Enums ---
export { CameraStrategyType } from "./enums/CameraStrategyType.js";
export { Keys } from "./enums/Keys.js";
export { LightType } from "./enums/LightType.js";
export { MaterialType } from "./enums/MaterialType.js";
export { ProjectionType } from "./enums/ProjectionType.js";
export { RendererType } from "./enums/RendererType.js";
export { TextureFilter } from "./enums/TextureFilter.js";
export { TextureWrap } from "./enums/TextureWrap.js";

// --- Math ---
export { AbstractProjection } from "./math/projections/AbstractProjection.js";
export { Matrix4 } from "./math/Matrix4.js";
export { OrthographicProjection } from "./math/projections/OrthographicProjection.js";
export { PerspectiveProjection } from "./math/projections/PerspectiveProjection.js";
export { Vector2D } from "./math/Vector2D.js";
export { Vector3D } from "./math/Vector3D.js";

// --- Colors ---
export { Color } from "./core/colors/Color.js";
export { ColorUtils } from "./core/colors/ColorUtils.js";

// --- Geometries ---
export { Cube } from "./geometry/Cube.js";
export { Cylinder } from "./geometry/Cylinder.js";
export { Grid } from "./geometry/Grid.js";
export { Plane } from "./geometry/Plane.js";
export { Pyramid } from "./geometry/Pyramid.js";
export { Sphere } from "./geometry/Sphere.js";
export { Torus } from "./geometry/Torus.js";
export { Circle } from "./geometry/Circle.js";
export { Triangle } from "./geometry/Triangle.js";
export { Line } from "./geometry/Line.js";
export { ModelGeometry } from "./geometry/ModelGeometry.js";
export { Terrain, TerrainStrategies, type TerrainHeightStrategy } from "./geometry/Terrain.js";
export { HeightmapGenerator } from "./utils/HeightmapGenerator.js";

// --- Materials ---
export { AbstractMaterial } from "./core/materials/AbstractMaterial.js";
export { BasicMaterial } from "./core/materials/BasicMaterial.js";
export { LambertMaterial } from "./core/materials/LambertMaterial.js";
export { PhongMaterial } from "./core/materials/PhongMaterial.js";
export { SkyboxMaterial } from "./core/materials/SkyboxMaterial.js";
export { TerrainMaterial } from "./core/materials/TerrainMaterial.js";
export { WireframeMaterial } from "./core/materials/WireframeMaterial.js";

// --- Lights ---
export { AmbientLight } from "./core/lights/AmbientLight.js";
export { DirectionalLight } from "./core/lights/DirectionalLight.js";
export { AbstractLight } from "./core/lights/AbstractLight.js";
export { PointLight } from "./core/lights/PointLight.js";
export { SpotLight } from "./core/lights/SpotLight.js";
export { AreaLight } from "./core/lights/AreaLight.js";

// --- Physics & Utils ---
export { BoundingBox } from "./physics/BoundingBox.js";
export { BoundingSphere } from "./physics/BoundingSphere.js";
export { Collision } from "./physics/Collision.js";
export { FrustumCuller } from "./core/FrustumCuller.js";
export { TextureGenerator } from "./utils/TextureGenerator.js";

// ---  Events ---
export { EventDispatcher } from "./core/events/EventDispatcher.js";
export { EventType } from "./enums/EventType.js";

// ---  Loaders ---
export { ImageLoader } from "./loaders/ImageLoader.js";
export { AbstractLoader } from "./loaders/AbstractLoader.js";
export { ShaderLoader } from "./loaders/ShaderLoader.js";
export { TextLoader } from "./loaders/TextLoader.js";
