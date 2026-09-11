# Zustandsautomaten (FSM)

Small World bietet ein eingebautes, typsicheres, allokationsfreies **Finite-State-Machine(FSM)**-Werkzeug. Dieses Framework entkoppelt Akteur-Logik, Physik-Update-Ticks und Phasenübergänge in saubere, isolierte Klassen.

Jeder FSM-Callback (`onEnter`/`onUpdate`/`onExit`) erhält ein **State-Data**-Objekt — die selbst definierte Payload, die sich alle Zustände dieses Automaten teilen. Nicht zu verwechseln mit dem `Context Object` (dem per Konstruktor injizierten Abhängigkeits-Container der Engine) oder dem `State` selbst (dem aktuellen Modus des FSM, z.B. `"idle"`/`"patrolling"`) — State Data ist ein drittes, eigenständiges Konzept: einfach die Daten, die die Zustände eines bestimmten Automaten lesen und verändern.

## Merkmale

- **Generisch & typsicher:** Beschränkt Übergänge und Callbacks über TypeScript-Generics auf vordefinierte Zustände `TState` und Ereignisse `TEvent`.
- **Allokationsfreier Hot Path:** FSM-Übergänge und Zustands-Updates instanziieren zur Laufzeit keine neuen Objekte oder Callbacks, was Garbage-Collection-Stotterer bei massiven Simulations-Ticks minimiert.
- **Behavior-Integration:** Über den `StateMachineBehavior`-Adapter ticken Zustandsautomaten automatisch, sobald sie an ein beliebiges `Object3D` gehängt werden.

## Zustandsautomaten-Konfiguration

Unten ein Beispiel, wie man Zustände deklariert, Enter-/Update-Trigger konfiguriert und Auto-Übergänge zuordnet.

```typescript
import { StateMachine, StateMachineBehavior, Object3D } from "small-world";

// 1. Den State-Data-Typ des FSM deklarieren
interface ActorStateData {
  object: Object3D;
  health: number;
}

// 2. Zustände und Callbacks konfigurieren
const actor = new Object3D("Actor");
const stateData: ActorStateData = { object: actor, health: 100 };

const fsm = new StateMachine<"idle" | "patrolling" | "alert", ActorStateData, "SEE_PLAYER">(stateData);

// Zustand: Idle (Übergang zu patrolling nach 5 Sekunden)
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

// Zustand: Patrolling
fsm.addState("patrolling", {
  onUpdate: (data, deltaTime, stateDuration) => {
    // Allokationsfreie Update-Logik
    data.object.position.x += 1.0 * deltaTime;
  },
  transitions: {
    SEE_PLAYER: "alert",
  },
});

// Zustand: Alert
fsm.addState("alert", {
  onEnter: (data) => {
    console.warn("Player spotted!");
  },
});

// 3. StateMachineBehavior an das Objekt hängen
const fsmBehavior = new StateMachineBehavior(fsm);
actor.addBehavior(fsmBehavior);

// Den Automaten starten
fsm.transitionTo("idle");
```

## Lebenszyklus-Ablauf

Die FSM-Lebenszyklus-Callbacks werden wie folgt aufgerufen:

1. **`onEnter(stateData, previousState)`**: Wird unmittelbar nach einem Übergang ausgeführt.
2. **`onUpdate(stateData, deltaTime, stateDuration)`**: Wird jeden Frame innerhalb des Behavior-Ticks aufgerufen.
3. **`onExit(stateData, nextState)`**: Wird direkt vor dem Übergang des Zustands zu einem neuen aufgerufen.
4. **`autoTransition`**: Löst automatisch einen Übergang zu `nextState` aus, sobald `stateDuration >= duration`.
