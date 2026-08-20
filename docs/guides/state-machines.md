# Finite State Machines (FSM)

Small World features a built-in, type-safe, and zero-allocation **Finite State Machine (FSM)** utility. This framework decouples actor logic, physics update ticks, and phase transitions into clean, isolated classes.

Each FSM callback (`onEnter`/`onUpdate`/`onExit`) receives a **State Data** object — the user-defined payload shared across all of that machine's states. Not to be confused with `Context Object` (the engine's constructor-injected dependency container) or `State` itself (the FSM's current mode, e.g. `"idle"`/`"patrolling"`) — State Data is a third, distinct concept: it's just the data a specific machine's states read and mutate.

## Features

- **Generic & Type-safe:** Restricts transitions and callbacks to predefined states `TState` and events `TEvent` via TypeScript generics.
- **Zero-Allocation Hot Path:** FSM transitions and state updates do not instantiate new objects or callbacks during run-time, minimizing Garbage Collection stutters during massive simulation ticks.
- **Behavior Integration:** Using the `StateMachineBehavior` adapter, state machines tick automatically when attached to any `Object3D`.

## State Machine Configuration

Below is an example of declaring states, configuring enter/update triggers, and mapping auto-transitions.

```typescript
import { StateMachine, StateMachineBehavior, Object3D } from "small-world";

// 1. Declare the FSM's State Data type
interface ActorStateData {
  object: Object3D;
  health: number;
}

// 2. Configure states and callbacks
const actor = new Object3D("Actor");
const stateData: ActorStateData = { object: actor, health: 100 };

const fsm = new StateMachine<"idle" | "patrolling" | "alert", ActorStateData, "SEE_PLAYER">(stateData);

// State: Idle (Transition to patrolling after 5 seconds)
fsm.addState("idle", {
  onEnter: (data, previousState) => {
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
  onUpdate: (data, deltaTime, stateDuration) => {
    // Zero-allocation update logic
    data.object.position.x += 1.0 * deltaTime;
  },
  transitions: {
    SEE_PLAYER: "alert",
  },
});

// State: Alert
fsm.addState("alert", {
  onEnter: (data) => {
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

1. **`onEnter(stateData, previousState)`**: Executed immediately after a transition occurs.
2. **`onUpdate(stateData, deltaTime, stateDuration)`**: Called every frame inside the behavior's tick.
3. **`onExit(stateData, nextState)`**: Called right before the state transitions to a new one.
4. **`autoTransition`**: Automatically initiates a transition to `nextState` once `stateDuration >= duration`.
