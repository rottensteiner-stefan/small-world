# Small World Core Context

The foundational domain model for the Small World 3D engine. It defines the core architectural concepts for the hybrid WebGL2/WebGPU rendering and entity logic system.

## Language

**Behavior**:
An attachable logic component for entities (e.g., Cameras, Meshes) that encapsulates specific functionality or interaction rules.
_Avoid_: Script, Controller (as a standalone manager array)

**Context Object**:
An explicit dependency container passed through constructors or lifecycle methods to avoid global state.
_Avoid_: Global Singleton, Universal EventBus

**Material**:
A rendering definition that encapsulates both the visual properties (e.g., color, shininess) and the underlying shader logic for WebGL2/WebGPU.
_Avoid_: Shader Program (Material is the higher-level abstraction)

**Scene Graph**:
The hierarchical tree of 3D objects that defines spatial relationships, transformations, and rendering order.
_Avoid_: World Map, Entity List
