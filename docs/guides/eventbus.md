# EventBus & Gameloop

In modern 3D applications, coupling your UI directly to your 3D engine or gameloop creates spaghetti code and performance bottlenecks. The **Small World Engine** provides a built-in, type-safe, and zero-allocation **EventBus** (`EventDispatcherImpl`) to cleanly decouple your systems.

## The Global EventBus

When you instantiate your game or app via the `SmallWorld` base class, it automatically initializes a global event dispatcher available as `this.events`.

```typescript
import { Application } from "small-world";

class MyGame extends Application {
  constructor() {
    super();
    // this.events is now available and ready to use!
  }
}
```

## Defining Strongly-Typed Events

To avoid brittle "magic strings" and typos across your codebase, you should always define your events as structured constants (`as const`) or `enums`. This provides maximum autocomplete and type safety.

```typescript
// Event definitions
export const AppEvents = {
  PLAYER: {
    DAMAGE: "AppEvents:PLAYER:DAMAGE",
    HEAL: "AppEvents:PLAYER:HEAL",
  },
  WEAPON: {
    FIRE: "AppEvents:WEAPON:FIRE",
  }
} as const;
```

## Emitting Events

Instead of using the DOM's `window.dispatchEvent` (which incurs heavy garbage collection overhead and is not strictly typed), you should use the engine's built-in `events` property to broadcast game events using your typed constants.

```typescript
// Inside a Behavior or Controller
this._options.events?.dispatchEvent(AppEvents.PLAYER.DAMAGE, { amount: 15, source: "lava" });
```

## Listening to Events

Your UI components (e.g., a HUD) or other decoupled systems can simply accept the `Events` interface and listen for specific events from your registry.

```typescript
import { Events } from "small-world/interfaces";
import { AppEvents } from "./events.js";

export class MyHud {
  private _events?: Events;

  constructor(events?: Events) {
    this._events = events;
    this._bindEvents();
  }

  private _bindEvents(): void {
    this._events?.addEventListener(AppEvents.PLAYER.DAMAGE, (e: Record<string, unknown>) => {
      const damage = e['amount'] as number;
      console.log(`Player took ${damage} damage!`);
      // Update your UI here...
    });
  }
}
```

## Why Not Native DOM Events?

Native `CustomEvent` objects in the browser are deeply tied to the DOM tree and allocate memory that the garbage collector must eventually clean up. By using a pure TypeScript generic `EventDispatcher`, the **Small World Engine** ensures your core logic remains decoupled from the browser environment, allowing for predictable performance and the potential to run your logic in Web Workers.
