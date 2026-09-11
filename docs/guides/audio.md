# Audio

Die Small World Engine liefert ein leichtgewichtiges `AudioSystem`, das die Web Audio API umhüllt: Sample-Laden und -Wiedergabe (global oder 3D-räumlich), einen kleinen Mixer (Master-/SFX-/Musik-Busse plus ein Send-Effekt-Reverb), kamerasynchronisierte Listener-Positionierung, und eine Reihe prozedural synthetisierter Soundeffekte, für die keinerlei Audio-Assets nötig sind.

## Zugriff auf das Audio-System

Wie das Render- und Physik-System ist `AudioSystem` instanzgebunden — jede `SmallWorld`-Anwendung bekommt ihr eigenes über `this.audio`, sodass mehrere Engine-Instanzen auf einer Seite (Editoren, Minimaps, Splitscreen) sich nie den Audio-Zustand teilen.

```typescript
// Innerhalb einer SmallWorld-Unterklasse
protected override async setupScene(): Promise<void> {
  await this.audio.load("./assets/explosion.wav", "explosion");
}
```

Da Browser den `AudioContext` bis zu einer Nutzergeste pausieren, rufe `this.audio.resume()` auf (oder spiele einfach einen Sound ab — jede Wiedergabemethode ruft es intern selbst auf) aus einem Click-/Keydown-Handler heraus, bevor Audio hörbar sein soll.

## Samples laden und abspielen

`load(url, name)` lädt und dekodiert eine Datei einmalig und cacht sie unter `name` für wiederholte Wiedergabe.

```typescript
await this.audio.load("./assets/explosion.wav", "explosion");

// Globale (nicht-räumliche) Wiedergabe
this.audio.play("explosion", /* loop */ false, /* volume */ 0.8);
```

Für Sounds, die mit der 3D-Position abgeschwächt und gepannt werden sollen, stattdessen `playSpatial` nutzen:

```typescript
this.audio.playSpatial("explosion", enemy.position, false, 1.0, /* refDistance */ 2.0, /* maxDistance */ 20.0);
```

`playSpatial` nutzt einen HRTF-`PannerNode` mit inversem Distanzabfall. Beide Methoden geben den zugrunde liegenden `AudioBufferSourceNode` zurück (und, bei räumlichen Sounds, den `PannerNode`), sodass die laufende Instanz selbst gestoppt oder anderweitig inspiziert werden kann — die Engine verfolgt aktive Stimmen nicht selbst nach.

## Der Mixer

Jeder Sound spielt über einen von zwei Gain-Bussen, beide in einen Master-Bus geroutet:

- `sfxGain` — Soundeffekte (`play`, `playSpatial`, und alle `SynthSFX`-Methoden außer `startDrone`).
- `musicGain` — Hintergrundmusik/Ambience.

Ein einzelnes prozedurales Reverb (ein fester 2-Sekunden-Decay-Impulse, beim Start generiert) ist als Send-Effekt am SFX-Bus verdrahtet. Pegel anpassen mit:

```typescript
this.audio.setMasterVolume(0.9);
this.audio.setSFXVolume(0.8);
this.audio.setMusicVolume(0.5);
this.audio.setReverbLevel(0.3); // 0 = trocken, höher = mehr Reverb-Send
```

::: tip Direkte API- & EventBus-Steuerung
Diese vier Setter konfigurieren direkt die Web-Audio-GainNodes der Instanz. Für UI-Steuerelemente verdrahte sie direkt mit deiner Einstellungs-UI oder höre auf eigene Events am `this.events`-Bus deiner Engine-Instanz.
:::

## Listener-Position (3D-Audio)

Räumliches Audio muss wissen, wo sich die "Ohren" befinden. Den Web-Audio-Listener einmal pro Frame mit der Kamera synchronisieren:

```typescript
protected override update(deltaTime: number): void {
  this.audio.updateListener(this.camera);
  // ...deine übrige Spiellogik
}
```

Das geschieht nicht automatisch — die Engine nimmt nicht an, dass Audio immer der Hauptkamera folgen soll (z. B. sollte eine Zuschauerkamera oder eine Minimap-Kamera den Listener nicht zwangsläufig bewegen), also explizit von dort aufrufen, wo sich die "Ohren" tatsächlich befinden.

## Prozedurale Soundeffekte (keine Assets nötig)

Für schnelles Prototyping, Retro-Feedback oder Ambience, die kein handgefertigtes Sample braucht, stellt `AudioSystem` auch eine Handvoll Web-Audio-synthetisierter Effekte bereit (implementiert in `SynthSFX`, einzeln importierbar, falls eigene gebaut werden sollen):

```typescript
this.audio.playTone(880, 0.15, 0.4, "square"); // Ein kurzer "Laser"-Blip
this.audio.playFootstep();
this.audio.playShoot();
this.audio.playHurt();
this.audio.startFire(torch.position, 0.4); // Loopendes Knistern an einer 3D-Position
this.audio.startDrone(); // Ambienter Subbass + Rausch-Bett, zum Musik-Bus geroutet
```

Das sind reine Oszillator-/Rausch-Graphen — kein Netzwerk-Request, kein Dekodier-Schritt, und sicher aufrufbar, bevor irgendein Asset geladen wurde.

## Einschränkungen

- Keine eingebaute Stimmenbegrenzung oder Pooling: schnelles wiederholtes Abspielen desselben Sounds (z. B. eine sehr schnelle Waffe) erzeugt pro Aufruf einen neuen `AudioBufferSourceNode`, ohne Obergrenze.
- Es existiert nur ein Reverb-Preset; es gibt keine API, um pro Raum eine andere Impulsantwort einzusetzen.
- Keine Musik-Crossfade-/Ducking-Hilfsmittel — Schichten oder Übergänge zwischen Musikstücken liegen in eigener Verantwortung (die beiden `GainNode`s manuell überblenden, oder über ein eigenes Zwischen-Gain routen).
