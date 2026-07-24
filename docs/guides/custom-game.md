# Building a Custom Game

The **Small World Engine** is designed to scale from simple rotating cubes to fully-fledged gameloops with custom logic, controllers, and UI.

## The Architecture of a Game

A typical project should be split into the following modular pieces:
1. **The App (`MyGameApp.ts`)**: Extends `SmallWorld`. It setups up the scene, loads textures, and initializes the camera and UI.
2. **The Level Builder**: Uses `GridLevelBuilder` or procedurally generates the scene graph.
3. **The Controller (`MyController.ts`)**: Extends `FirstPersonController` or `OrbitController`. This is the core input and movement logic.
4. **The UI (`MyHud.ts`)**: A decoupled HTML overlay that listens to `Events`.

## 1. Creating a Custom Controller

In Small World, controllers are simply `Behavior` components attached to a camera or object. You can extend the built-in controllers to add game-specific logic like shooting, raycasting, or item pickups.

```typescript
import { FirstPersonController, FirstPersonControllerOptions } from "small-world";
import { Keys } from "small-world";

export class MyController extends FirstPersonController {
  constructor(options: FirstPersonControllerOptions = {}) {
    super(options);
  }

  public override update(deltaTime: number): void {
    // 1. Let the base class handle WASD movement and collision
    super.update(deltaTime);

    // 2. Add your custom logic (e.g. Shooting)
    if (this._options.input.isPressed(Keys.SPACE)) {
       // Fire a bullet, do a raycast...
       console.log("Pew pew!");

       // Use the injected EventBus
       this.events.dispatchEvent("shoot-weapon", { ammoCost: 1 });
    }
  }
}
```

## 2. Bootstrapping the Application

Now we tie the Controller, the Scene, and the UI together in our `SmallWorld` subclass.

```typescript
import { SmallWorld } from "small-world";
import { MyController } from "./MyController.js";
import { MyHud } from "./MyHud.js";

export class MyGameApp extends SmallWorld {
  private _hud!: MyHud;

  protected async setupScene(): Promise<void> {
    // Initialize the UI – pass the event bus explicitly
    this._hud = new MyGameHUD(this.events);

    // Attach our custom controller to the camera as a Behavior.
    // The Behavior system handles the update loop automatically.
    this.camera.addBehavior(
      new MyController({
        scene: this.scene,
        input: this.input,
        moveSpeed: 15.0,
      })
    );
  }

  protected override update(deltaTime: number): void {
    // Game loop logic...
  }
}

// Start your game
const app = new MyGameApp();
app.start();
```

By structuring your code this way, you ensure that your Game Logic (Controller), Rendering Logic (App/Scene), and User Interface (HUD) remain completely independent and easy to test or refactor!

## Reference Implementation: YAD (Yet Another Dungeon)

The Small World Engine includes a complete, functional showcase called **YAD (Yet Another Dungeon)**. YAD is the canonical reference architecture for building a real game.

YAD demonstrates:
1. **Seamless Tool Integration:** How standalone tools (`Pixler`, `MapGenerator`, `Xtractor`) communicate with the game via `app.events` without interrupting the render loop – no Forge overlay required.
2. **Procedural Level Generation:** How the `GridLevelBuilder` extension parses an ASCII string map into 3D meshes, spawning `EnemyBehavior`-driven enemy sprites and pickup sprites.
3. **Enemy Logic:** How `EnemyBehavior` implements simple distance-based chase logic (detection range, chase, attack proximity). YAD does not use the engine's `StateMachine`/FSM module for enemies — but it's available (see [State Machines](./state-machines)) for cases where richer state logic is needed.
4. **Custom Controllers:** `YadController` inherits from `FirstPersonController`, adding footsteps (using an injected `AudioSystem` instance), weapon-sway animation (rendered by `YadHud`), and raycasted attacks.
5. **Decoupled UI (`YadHud`):** A strict HTML overlay that listens to `AppEvents` to update health bars and log chat messages.

When starting a new project, we highly recommend reading through `src/apps/yad` to understand how the architecture scales!
