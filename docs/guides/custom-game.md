# Building a Custom Game

The **Small World Engine** is designed to scale from simple rotating cubes to fully-fledged gameloops with custom logic, controllers, and UI.

## The Architecture of a Game

A typical project should be split into the following modular pieces:
1. **The App (`MyGameApp.ts`)**: Extends `Application`. It setups up the scene, loads textures, and initializes the camera and UI.
2. **The Level Builder**: Uses `GridLevelBuilder` or procedurally generates the scene graph.
3. **The Controller (`MyController.ts`)**: Extends `FirstPersonController` or `OrbitController`. This is the core input and movement logic.
4. **The UI (`MyHud.ts`)**: A decoupled HTML overlay that listens to `Events`.

## 1. Creating a Custom Controller

In Small World, controllers are simply `Behavior` components attached to a camera or object. You can extend the built-in controllers to add game-specific logic like shooting, raycasting, or item pickups.

```typescript
import { FirstPersonController, FirstPersonControllerOptions } from "small-world/core/behaviors";
import { Input, Keys } from "small-world/core";

export class MyController extends FirstPersonController {
  constructor(options: FirstPersonControllerOptions = {}) {
    super(options);
  }

  public override update(deltaTime: number): void {
    // 1. Let the base class handle WASD movement and collision
    super.update(deltaTime);

    // 2. Add your custom logic (e.g. Shooting)
    if (Input.isPressed(Keys.SPACE)) {
       // Fire a bullet, do a raycast...
       console.log("Pew pew!");
       
       // Tell the HUD that we shot a weapon
       this._options.events?.dispatchEvent("shoot-weapon", { ammoCost: 1 });
    }
  }
}
```

## 2. Bootstrapping the Application

Now we tie the Controller, the Scene, and the UI together in our `Application` class.

```typescript
import { Application } from "small-world";
import { MyController } from "./MyController.js";
import { MyHud } from "./MyHud.js";

export class MyGameApp extends Application {
  private _hud!: MyHud;

  protected async setupScene(): Promise<void> {
    // Initialize the UI and pass the global EventBus
    this._hud = new MyHud(this.events);

    // Attach our custom controller to the camera, passing the EventBus and Scene for collisions
    this.camera.addBehavior(
      new MyController({
        scene: this.scene,
        events: this.events,
        moveSpeed: 15.0
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
1. **Seamless Tool Integration:** How the `Forge` and tools like `Pixler` and `MapGenerator` run concurrently over the game canvas, communicating via the `EventBus` without interrupting the game loop.
2. **Procedural Level Generation:** How the `GridLevelBuilder` extension parses an ASCII string array into 3D meshes and instantiates `YadEnemy` and `YadPickup` behaviors.
3. **Custom State Machines:** How enemies use the built-in FSM (Finite State Machine) to manage states (`IDLE`, `CHASE`, `ATTACK`, `DIE`).
4. **Custom Controllers:** `YadController` inherits from `FirstPersonController`, adding head-bobbing, footsteps via `AudioSystem`, and raycasted attacks.
5. **Decoupled UI (`YadHud`):** A strict HTML overlay that listens to `AppEvents` to update health bars and log chat messages.

When starting a new project, we highly recommend reading through `src/apps/yad` to understand how the architecture scales!
