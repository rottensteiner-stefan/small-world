# Finite State Machines (FSM)

Small World features a built-in, type-safe, and zero-allocation **Finite State Machine (FSM)** utility. This framework decouples actor logic, physics update ticks, and phase transitions into clean, isolated classes.

## Features

- **Generic & Type-safe:** Restricts transitions and callbacks to predefined states `TState` and events `TEvent` via TypeScript generics.
- **Zero-Allocation Hot Path:** FSM transitions and state updates do not instantiate new objects or callbacks during run-time, minimizing Garbage Collection stutters during massive simulation ticks.
- **Behavior Integration:** Using the `StateMachineBehavior` adapter, state machines tick automatically when attached to any `Object3D`.

## State Machine Configuration

Below is an example of declaring states, configuring enter/update triggers, and mapping auto-transitions.

```typescript
import { StateMachine, StateMachineBehavior, Object3D } from "small-world";

// 1. Declare the FSM Context type
interface ActorContext {
  object: Object3D;
  health: number;
}

// 2. Configure states and callbacks
const actor = new Object3D("Actor");
const context: ActorContext = { object: actor, health: 100 };

const fsm = new StateMachine<"idle" | "patrolling" | "alert", ActorContext, "SEE_PLAYER">(context);

// State: Idle (Transition to patrolling after 5 seconds)
fsm.addState("idle", {
  onEnter: (ctx, previousState) => {
    console.log(`Entered Idle from: ${previousState}`);
  },
  autoTransition: {
    duration: 5.0,
    nextState: "patrolling",
  },
  transitions: {
    SEE_PLAYER: "alert",
  },
});

// State: Patrolling
fsm.addState("patrolling", {
  onUpdate: (ctx, deltaTime, stateDuration) => {
    // Zero-allocation update logic
    ctx.object.position.x += 1.0 * deltaTime;
  },
  transitions: {
    SEE_PLAYER: "alert",
  },
});

// State: Alert
fsm.addState("alert", {
  onEnter: (ctx) => {
    console.warn("Player spotted!");
  },
});

// 3. Attach StateMachineBehavior to object
const fsmBehavior = new StateMachineBehavior(fsm);
actor.addBehavior(fsmBehavior);

// Start the machine
fsm.transitionTo("idle");
```

## Lifecycle Execution Flow

The FSM lifecycle callbacks are invoked as follows:

1. **`onEnter(context, previousState)`**: Executed immediately after a transition occurs.
2. **`onUpdate(context, deltaTime, stateDuration)`**: Called every frame inside the behavior's tick.
3. **`onExit(context, nextState)`**: Called right before the state transitions to a new one.
4. **`autoTransition`**: Automatically initiates a transition to `nextState` once `stateDuration >= duration`.
