# EventBus & Gameloop

In modern 3D applications, coupling your UI directly to your 3D engine or gameloop creates spaghetti code and performance bottlenecks. The **Small World Engine** provides a built-in, type-safe, and zero-allocation **EventBus** (`EventDispatcherImpl`) to cleanly decouple your systems.

## The Application EventBus

Because Small World enforces strict multi-instancing support (no global singletons), the EventBus is attached to your `SmallWorld` application instance.

You can access it via `app.events` (or pass it via constructor injection):

```typescript
// Assuming `app` is your SmallWorld instance
app.events.dispatchEvent("MyEvent", { data: 123 });
```

## Defining Strongly-Typed Events

To avoid brittle "magic strings" and typos across your codebase, you should always define your events as structured constants (`as const`) or `enums`. This provides maximum autocomplete and type safety.

```typescript
// Event definitions (your own game-specific registry)
export const MyGameEvents = {
  PLAYER: {
    DAMAGE: "MyGameEvents:PLAYER:DAMAGE",
    HEAL: "MyGameEvents:PLAYER:HEAL",
  },
  WEAPON: {
    FIRE: "MyGameEvents:WEAPON:FIRE",
  }
} as const;
```

::: tip Built-in AppEvents
The engine itself ships a reference event registry, `AppEvents`, used by the YAD showcase (e.g. `AppEvents.Yad.DAMAGE`, `AppEvents.Yad.SHOOT`). Define your own registry (as above) for your game's events instead of extending the built-in one.
:::

## Emitting Events

Instead of using the DOM's `window.dispatchEvent` (which incurs heavy garbage collection overhead and is not strictly typed), you should use the engine's built-in `events` property to broadcast game events using your typed constants.

```typescript
takeDamage(amount: number) {
  this.health -= amount;

  // Dispatch via an injected EventDispatcherImpl (e.g. this.events)
  this.events.dispatchEvent(MyGameEvents.PLAYER.DAMAGE, { amount: 15, source: "lava" });
}
```

## Listening to Events

Your UI components (e.g., a HUD) or other decoupled systems can simply accept the `Events` interface and listen for specific events from your registry.

```typescript
import { MyGameEvents } from "./events.js";

export function buildHUD(app: SmallWorld) {
  const healthLabel = document.createElement("div");

  // The UI listens to the Application-level events
  app.events.addEventListener(MyGameEvents.PLAYER.DAMAGE, (e: Record<string, unknown>) => {
      const damage = e['amount'] as number;
      console.log(`Player took ${damage} damage!`);
      // Update your UI here...
    });
  }
```

## Why Not Native DOM Events?

Native `CustomEvent` objects in the browser are deeply tied to the DOM tree and allocate memory that the garbage collector must eventually clean up. By using a pure TypeScript generic `EventDispatcher`, the **Small World Engine** ensures your core logic remains decoupled from the browser environment, allowing for predictable performance and the potential to run your logic in Web Workers.
