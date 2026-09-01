# Commercial Indie Game Roadmap & Publisher Strategy

> **Small World Engine Guide:** Vom atmosphärischen Prototyp zum kommerziellen Release auf Steam, PlayStation & Xbox — speziell ausgelegt für Solo-Entwickler und kleine Indie-Teams.

---

## 1. Das Sweet-Spot-Kalkül: Spielzeit & Bepreisung

Für einen Solo-Entwickler mit Day-Job ist die Wahl der Spielzeit die wichtigste strategische Weichenstellung des gesamten Projekts.

```
+---------------------------------------------------------------------------------------+
|  SPIELZEIT-SWEET-SPOT: 1.5 BIS 3.5 STUNDEN (MAXIMAL: 4 STUNDEN)                      |
|                                                                                       |
|  [ 10 Min. Vertical Slice ] -> [ 1.5 Std. Kernspielzeit ] -> [ 3.0 Std. Meisterwerk ] |
|  - Gebaut mit Maker          - Handplatzierte Beleuchtung    - Keine künstliche Längen|
|  - Pitch-Demo / Next Fest    - Hohe Wiederspielbarkeit       - 60 FPS auf Standard-PCs|
+---------------------------------------------------------------------------------------+
```

### Warum 1,5 bis 3,5 Stunden der mathematische Optimum-Punkt sind:
1. **Das „Steam 2-Stunden-Rückgabe-Paradoxon“:**  
   Steam erlaubt bedingungslose Rückgaben bei unter 2 Stunden Spielzeit. Anfänger fürchten das oft. Die Realität moderner Indie-Erfolge: Wenn ein Spiel 2,5 bis 3 Stunden dauert, eine fesselnde Lichtstimmung besitzt und emotional berührt, refundiert fast niemand. Spieler loben stattdessen in den Reviews: *"Endlich ein Spiel, das meine Zeit respektiert und keinen künstlichen 40-Stunden-Grind erzwingt."*
2. **Qualitätsdichte schlägt Streckung:**  
   1 Stunde hochkarätige Atmosphäre, handplatzierte Lichtstimmung (im **Maker**-Editor) und fehlerfreie Rätsel/Mechaniken schlagen 15 Stunden generische Copy-Paste-Welten um Längen.
3. **Aufwandskalkulation für Solo-Entwickler:**  
   - 1 Stunde poliertes 3D-Gameplay = ca. 200–350 Netto-Arbeitsstunden (Level-Design, Sound, Pacing, QA).
   - Ein 2,5-Stunden-Spiel ist mit 600–900 Arbeitsstunden in 12–18 Monaten nebenberuflich realistisch und gesund abschließbar.

### Erfolgreiche Referenz-Titel im Vergleich:
| Titel | Team-Größe | Spielzeit | Verkaufspreis | Rezeption & Verkäufe |
|---|---|---|---|---|
| ***A Short Hike*** | 1 Entwickler | 1,5 – 2,0 Std. | ~7,99 € | > 1 Mio. Verkäufe, 99% Positive Reviews, IGF Grand Prize |
| ***Inside*** (Playdead) | Kleines Indie-Team | 3,0 – 3,5 Std. | ~19,99 € | Globales Meisterwerk, > 50 Awards |
| ***Journey*** (thatgamecompany) | Kleines Team | 2,0 Std. | ~14,99 € | Eines der einflussreichsten Spiele der Dekade |
| ***Chants of Sennaar*** | 2 Entwickler | 4,0 – 5,0 Std. | ~19,99 € | Überwältigender Indie-Hit 2023 |
| ***Limbo*** | Kleines Team | 3,0 Std. | ~9,99 € | Millionenfach verkauft, Vorbild für modernes Pacing |
| ***Stray*** | Kleines Kernteam | 4,5 – 5,0 Std. | ~27,99 € | Indie-GotY-Kandidat, Benchmark für Atmosphäre |

---

## 2. Technischer Pfad: Von TypeScript/WebGPU zu Steam & Konsolen

Small World ist in **TypeScript** für **WebGPU / WebGL 2** gebaut. Wie gelangt dieser Code als native `.exe` auf Steam und auf die Konsolen?

```
                              [ Small World Game Code ]
                               (TypeScript / WebGPU / PBR)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [ PC / Steam / Mac ]                          [ PS5 / Xbox / Switch ]
                 │                                               │
           Tauri v2 / CEF                               WebAssembly / Native C++
   (Rust Core + Steamworks SDK)                        (Publisher Porting Partner)
                 │                                               │
                 ▼                                               ▼
         Steam Store Launch                            Sony / Microsoft DevNet
```

### A. Steam Release (PC, Mac, Linux & Steam Deck)
Dieser Weg ist **sofort und ohne Drittanbieter** umsetzbar:
1. **Wrapper-Framework: [Tauri v2](https://v2.tauri.app/):**
   - Tauri nutzt einen extrem schlanken Rust-Core und die hardwarebeschleunigte Webview des Betriebssystems (oder integriertes Chromium via CEF).
   - Die Binary-Größe liegt oft unter 15 MB (im Vergleich zu >150 MB bei Electron).
   - Volle Unterstützung für WebGPU, WebGL 2, Gamepad-API und AudioContext.
2. **Steamworks SDK Integration (`steamworks.rs`):**
   - Rust-seitige Anbindung an Valves natives C++ SDK für Achievements (Errungenschaften), Steam Cloud Saves, Leaderboards und Steam Overlay.
3. **Steam Deck Verifizierung:**
   - Steam Deck läuft unter Proton / SteamOS (Arch Linux).
   - Voraussetzungen für den grünen "Deck Verified"-Badge: Sauberes Gamepad-Mapping (Xbox/Deck-Layout), automatische On-Screen-Tastatur bei Textfeldern, lesbare UI-Schriftgrößen und stabile 60 FPS bei 1280×800.

### B. Konsolen-Release (PlayStation 5, Xbox Series X/S, Nintendo Switch)
Konsolen führen keinen Browser als Spiel-App aus. Hier greifen drei bewährte Industrie-Strategien:
1. **Strategie 1: Publisher-Porting-Partner (Der Standard-Weg für Indies):**
   - Wenn du mit einem Publisher zusammenarbeitest (z.B. Raw Fury, Devolver, Team17, Thunderful), übernehmen deren spezialisierte In-House- oder Partner-Studios (wie *BlitWorks* oder *Abstraction Games*) die Konsolen-Portierung und Zertifizierung.
2. **Strategie 2: WebAssembly & Embedded Runtime:**
   - TypeScript/JS-Logik und Shader-Calls werden über C++-Embedding (z.B. V8-Embedded, QuickJS oder Wasmtime) nativ gegen die Grafik-APIs der Konsolen (DirectX 12 für Xbox, GNM/GNMX/AGC für PlayStation) gemappt.
3. **Strategie 3: Xbox UWP Developer Mode:**
   - Xbox Series X/S unterstützt über das Microsoft Partner Center UWP-Apps mit modernem Edge/Chromium-Webview-Container und direktem Controller-Passthrough.

---

## 3. Publisher-Strategie: Was Indie-Publisher wirklich suchen

Indie-Publisher erhalten wöchentlich 50 bis 100 Pitches. Sie suchen nicht nach dem nächsten 200-Millionen-Dollar-MMO, sondern nach **risikoarmen, unverwechselbaren Perlen**.

### Die Top-Publisher für atmosphärische Indie-Titel:
- **Annapurna Interactive** (*Stray*, *What Remains of Edith Finch*, *Outer Wilds*)
- **Raw Fury** (*Sable*, *Call of the Sea*, *Norco*)
- **Devolver Digital** (*Inscryption*, *Gris*, *Loop Hero*)
- **Kepler Interactive** (*Pacific Drive*, *Clair Obscur*)
- **Fellow Traveller** (*Citizen Sleeper*, *Paradise Killer*)
- **Team17** (*Dredge*, *Blasphemous*)
- **Finji** (*Tunic*, *Chicory*)
- **Thunderful Games** (*Planet of Lana*, *SteamWorld*)

### Was im Pitch-Deck (max. 10–12 Slides) stehen muss:
1. **Der 5-Sekunden-Hook ("Elevator Pitch"):**
   - *Negativ:* "Ein schönes 3D-Erkundungsspiel mit Rätseln und Physik." (Gibt es 10.000 Mal).
   - *Positiv (wie Stray):* "Du bist eine streunende Katze in einer von Robotern bewohnten Cyberpunk-Metropole und musst deinen Weg nach Hause finden."
2. **Der „Vertical Slice“ (10–15 Minuten spielbare Perfektion):**
   - Ein einziger, mit **Maker** atemberaubend ausgeleuchteter Raum/Level.
   - Perfektes Sounddesign, eine funktionierende Kernmechanik, null Bugs, locked 60 FPS.
   - Publisher investieren nicht in Konzepte auf Papier, sondern in **bewiesene Ausführungsqualität**.
3. **Der asymmetrische Budget-Vorteil:**
   - Ein Pitch, der **40.000 € bis 80.000 €** (für Audio-Buyouts, Lokalisierung, QA und etwas Lebenshaltung) anfragt, ist für Publisher ein No-Brainer-Mikro-Investment mit extrem schnellem ROI im Vergleich zu 2-Millionen-Euro-Großprojekten.

---

## 4. Die großen blinden Flecken: Die 1000 Fragen vor dem Launch

Viele Erstlings-Projekte scheitern an bürokratischen oder technischen Hürden kurz vor der Ziellinie. Hier ist die Checkliste der kritischen Bereiche:

### A. Technische Zertifizierung & Plattform-Regeln (TRCs / XRRs)
Plattform-Inhaber (Sony TRC, Microsoft XRR, Nintendo Lotcheck) verlangen strikte Verhaltensweisen:
- **Controller-Trennung:** Zieht der Spieler das Gamepad ab oder geht der Akku leer, **muss** das Spiel sofort pausieren und einen Dialog einblenden.
- **Savegame-Sicherheit:** Wird das Spiel während eines Schreibvorgangs hart beendet (Stromausfall), darf der vorherige Spielstand unter keinen Umständen korrumpiert sein (Atomic Savegame Swapping via `.tmp` $\rightarrow$ `.json`).
- **Ladezeit:** Startzeit von Klick bis interaktivem Hauptmenü meist $\le 10$ Sekunden.

### B. Savegame-Architektur & Cloud Sync
- Trenne den Spielstand strikt in ein **reines, serialisierbares State-JSON** (Position, Inventory, Quest-Flags).
- Baue von Tag 1 an eine Schema-Versionierung ein:
  ```typescript
  interface SavegameV1 {
    version: 1;
    player: { x: number; y: number; z: number };
    inventory: string[];
  }
  ```
- Schreibe automatische Migrations-Funktionen (`migrateSavegame(data)`), damit Spielstände nach Updates nicht unbrauchbar werden.

### C. Lokalisierung (i18n)
- **Mindest-Standard für Steam:** **EFIGS + CJK** (Englisch, Französisch, Italienisch, Deutsch, Spanisch + vereinfachtes Chinesisch, Japanisch, Koreanisch).
- Chinesisch und Japanisch machen auf Steam bis zu **30–45% aller Verkäufe** aus.
- Niemals Text in Texturen oder Shader einbacken. Alle UI- und Dialogtexte müssen über String-Key-Tabellen (`i18n.t("ui.door_locked")`) referenziert werden.

### D. Audio & Musik-Rechte
- Musik und Geräuschkulisse tragen **50% der emotionalen Atmosphäre**.
- **100% geklärte Lizenzen:** Jeder Soundeffekt und jeder Musiktrack benötigt einen schriftlichen **Total-Buyout-Vertrag** (weltweit, unbegrenzt, kommerziell, frei von Verwertungsgesellschaften wie GEMA/BMI/ASCAP), um Urheberrechts-Strikes und DMCA-Takedowns zu verhindern.

### E. Rechtliches, Steuern & Unternehmensform
- **Haftungsbeschränkung:** Niemals als Privatperson mit Valve, Sony oder Publishern Verträge schließen. Vor Release: Gründung einer haftungsbeschränkten Gesellschaft (z.B. **UG haftungsbeschränkt** oder **GmbH** in Deutschland/Österreich).
- **US-Quellensteuer (Withholding Tax):** Valve sitzt in den USA. Über das Steuerformular **W-8BEN-E** wird das Doppelbesteuerungsabkommen genutzt, um 30% automatischen US-Steuereinbehalt zu vermeiden.
- **Altersfreigaben (IARC):** Über den kostenlosen, im Steam-Backend integrierten IARC-Fragebogen erhält das Spiel in 15 Minuten offizielle USK-, ESRB- und PEGI-Einstufungen.

### F. Das Steam-Wishlist-Gesetz & Marketing-Timing
- **Die magische Schwelle:** Ein Spiel benötigt **7.000 bis 10.000 Steam-Wishlists** vor dem Release-Tag.
- **Warum?** Erst ab dieser Schwelle stuft der Steam-Algorithmus das Spiel am Launch-Tag als relevant ein und platziert es auf der globalen Steam-Startseite unter *„Beliebt und bald verfügbar“* bzw. *„Neuerscheinungen“*.
- **Steam Next Fest:** Das mächtigste Marketing-Tool für Indies. Eine 15-minütige spielbare Web-/Tauri-Demo während des Next Fests generiert oft 3.000 bis 8.000 Wishlists in nur einer Woche.

---

## 5. Der 3-Phasen-Aktionsplan für Solo-Entwickler

```
+---------------------------------------------------------------------------------------+
| PHASE 1: VERTICAL SLICE (Monate 1–4)                                                  |
| - Kernmechanik & einzigartiges Vibe etablieren.                                       |
| - 1 Level komplett in Maker ausleuchten & mit Sound hinterlegen (10–15 Min. Spielzeit)|
| - 60-Sekunden-Gameplay-Teaser für Social Media / Reddit aufnehmen.                    |
+---------------------------------------------------------------------------------------+
                                           │
                                           ▼
+---------------------------------------------------------------------------------------+
| PHASE 2: ANKÜNDIGUNG & PITCHING (Monate 5–8)                                          |
| - Steam "Coming Soon"-Seite live schalten (Trailer + Screenshots).                    |
| - 10-Slide Pitch-Deck an Publisher (Annapurna, Raw Fury, Devolver etc.) senden.       |
| - Teilnahme am Steam Next Fest mit spielbarer Demo.                                   |
+---------------------------------------------------------------------------------------+
                                           │
                                           ▼
+---------------------------------------------------------------------------------------+
| PHASE 3: PRODUKTION & LAUNCH (Monate 9–15)                                            |
| - Vollendung der 2.5 bis 3.5 Stunden Spielzeit via Maker-Prefab-Baukasten.             |
| - Lokalisierung (EFIGS + CJK) & Audio-Mastering.                                      |
| - Verpackung via Tauri v2 (Steam) bzw. Übergabe an Publisher-Porting (Konsolen).      |
| - Release-Tag: Launch mit >7.000 Wishlists.                                           |
+---------------------------------------------------------------------------------------+
```

---

*Dieses Dokument ist Teil der Small World Developer Guides (`docs/guides/commercial-indie-roadmap.md`).*
