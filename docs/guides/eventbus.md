# EventBus & Gameloop

In modern 3D applications, coupling your UI directly to your 3D engine or gameloop creates spaghetti code and performance bottlenecks. The **Small World Engine** provides a built-in, type-safe, and zero-allocation **EventBus** (`EventDispatcherImpl`) to cleanly decouple your systems.

## The Universal EventBus

Because Small World enforces a "1 Engine Instance per Page" architecture, the EventBus is implemented as a global singleton. This eliminates the need for tedious "prop-drilling" (passing the event bus through deeply nested constructors).

You can import and use `UniversalEventBus` anywhere in your application:

```typescript
import { UniversalEventBus } from "small-world/core";

// Use it directly!
UniversalEventBus.dispatchEvent("MyEvent", { data: 123 });
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
import { UniversalEventBus } from "small-world/core";

UniversalEventBus.dispatchEvent(AppEvents.PLAYER.DAMAGE, { amount: 15, source: "lava" });
```

## Listening to Events

Your UI components (e.g., a HUD) or other decoupled systems can simply accept the `Events` interface and listen for specific events from your registry.

```typescript
import { UniversalEventBus } from "small-world/core";
import { AppEvents } from "./events.js";

export class MyHud {
  constructor() {
    this._bindEvents();
  }

  private _bindEvents(): void {
    UniversalEventBus.addEventListener(AppEvents.PLAYER.DAMAGE, (e: Record<string, unknown>) => {
      const damage = e['amount'] as number;
      console.log(`Player took ${damage} damage!`);
      // Update your UI here...
    });
  }
}
```

## Why Not Native DOM Events?

Native `CustomEvent` objects in the browser are deeply tied to the DOM tree and allocate memory that the garbage collector must eventually clean up. By using a pure TypeScript generic `EventDispatcher`, the **Small World Engine** ensures your core logic remains decoupled from the browser environment, allowing for predictable performance and the potential to run your logic in Web Workers.
