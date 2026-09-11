# EventBus & Game-Loop

In modernen 3D-Anwendungen erzeugt eine UI, die direkt an die 3D-Engine oder den Game-Loop gekoppelt ist, Spaghetticode und Performance-Engpässe. Die **Small World Engine** stellt einen eingebauten, typsicheren und zuweisungsfreien **EventBus** (`EventDispatcherImpl`) bereit, um Systeme sauber zu entkoppeln.

## Der Anwendungs-EventBus

Da Small World strikte Mehrfach-Instanziierung erzwingt (keine globalen Singletons), ist der EventBus an die eigene `SmallWorld`-Anwendungsinstanz angehängt.

Zugriff darauf über `app.events` (oder Übergabe via Konstruktor-Injektion):

```typescript
// Angenommen, `app` ist die eigene SmallWorld-Instanz
app.events.dispatchEvent("MyEvent", { data: 123 });
```

## Stark typisierte Events definieren

Um brüchige "magische Strings" und Tippfehler im gesamten Code zu vermeiden, sollten Events immer als strukturierte Konstanten (`as const`) oder `enums` definiert werden. Das liefert maximale Autovervollständigung und Typsicherheit.

```typescript
// Event-Definitionen (eigene, spielspezifische Registry)
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

::: tip Eingebaute AppEvents
Die Engine selbst liefert eine Referenz-Event-Registry, `AppEvents`, genutzt vom YAD-Showcase (z. B. `AppEvents.Yad.DAMAGE`, `AppEvents.Yad.SHOOT`). Für die Events des eigenen Spiels eine eigene Registry definieren (wie oben), statt die eingebaute zu erweitern.
:::

## Events auslösen

Statt das DOM-eigene `window.dispatchEvent` zu nutzen (das erheblichen Garbage-Collection-Overhead verursacht und nicht strikt typisiert ist), sollte die eingebaute `events`-Property der Engine genutzt werden, um Spiel-Events mit den eigenen typisierten Konstanten zu übertragen.

```typescript
takeDamage(amount: number) {
  this.health -= amount;

  // Auslösen über einen injizierten EventDispatcherImpl (z. B. this.events)
  this.events.dispatchEvent(MyGameEvents.PLAYER.DAMAGE, { amount: 15, source: "lava" });
}
```

## Auf Events lauschen

UI-Komponenten (z. B. ein HUD) oder andere entkoppelte Systeme können einfach das `Events`-Interface entgegennehmen und auf bestimmte Events aus der eigenen Registry lauschen.

```typescript
import { MyGameEvents } from "./events.js";

export function buildHUD(app: SmallWorld) {
  const healthLabel = document.createElement("div");

  // Die UI lauscht auf die Events auf Anwendungsebene
  app.events.addEventListener(MyGameEvents.PLAYER.DAMAGE, (e: Record<string, unknown>) => {
      const damage = e['amount'] as number;
      console.log(`Player took ${damage} damage!`);
      // Hier die UI aktualisieren...
    });
  }
```

## Warum keine nativen DOM-Events?

Native `CustomEvent`-Objekte im Browser sind tief an den DOM-Baum gebunden und belegen Speicher, den der Garbage Collector irgendwann bereinigen muss. Durch die Nutzung eines reinen, generischen TypeScript-`EventDispatcher` stellt die **Small World Engine** sicher, dass die Kernlogik von der Browser-Umgebung entkoppelt bleibt — das ermöglicht vorhersehbare Performance und potenziell die Ausführung der eigenen Logik in Web Workern.
