# Log — And Now?

> Entwicklungslog für die "And Now?"-App (Arbeitstitel).

---

## 2026-08-21 — Gründungs-Pitch

**Prämisse:** X Jahre nachdem Europa durch einen nuklearen Schlag fast in die
Steinzeit zurückgeworfen wurde (Urheber ungeklärt — "Russland? Niemand weiß es
wirklich" — bewusst als ungelöstes Rätsel der Welt angelegt, nicht als
Autoren-Unentschlossenheit), wagt sich die erste Generation, die komplett
danach aufgewachsen ist, wirklich endgültig nach draußen.

**Setting:** Start in einem Vault/Bunker (Name noch offen) in **Wien** —
bewusst als realer geografischer Anker gewählt, damit die Spielwelt nicht
komplett kontextlos ("lost") wirkt. Wien liefert dafür reichlich konkrete
Spielfläche für die Erkundung nach dem Ausstieg: **U-Bahn**-Tunnelnetz
(naheliegende Verbindung zwischen Bunker und Oberfläche, bzw. weitere
unterirdische Routen), **Kirchen** (markante, einzeln wiedererkennbare
Landmarken), **Universitäten** (Wissen/Archiv-Orte), sowie **Donau und
Donaukanal** (Fluss/Kanal-Gebiet als eigene Zone mit anderer Bedrohungslage
als die Straßen/Tunnel).

**Ton/Referenz:** Explizit eine Mischung aus *Fallout* (Vault-Ausstieg,
Retro-vs-Zukunft-Ästhetik) und *Metro* (Tunnel/Bunker-Beklemmung, karges
Nachkriegs-Europa) — bewusst benannt, nicht verschleiert.

**Ziel (Phase 1):** Kein Kampf-/Fraktions-Fokus zum Einstieg. Zuerst geht es
ums **Überlegen und Erkunden** — die Geheimnisse der "neuen alten Welt"
draußen entdecken.

**Offene Fragen für die nächste Runde:**
- Name des Vaults/Bunkers und ggf. seiner Betreiber-Organisation.
- Wie konkret wird "X Jahre" — reicht vage, oder soll es sich an etwas
  Erlebbarem festmachen (Generationenwechsel, Verfallszustand der Technik)?
- Bleibt "wer hat zugeschlagen" dauerhaft ungeklärt (Weltgeheimnis) oder ist
  das ein Enthüllungsziel der Geschichte?
- Grobe Struktur: lineare Story mit festen Beats, oder offene
  Erkundung/Sandbox ab Verlassen des Vaults?
- Vokabular/Namensfindung (vgl. Neon Labyrinths "keine Grid/Recognizer"-Regel)
  — eigene Begriffe statt direkter Fallout/Metro-Leihbegriffe ("Vault",
  "Pip-Boy" etc. sind Platzhalter, kein Zielzustand).

**Nächste Schritte:** Grobskizze der Welt/Story weiter verdichten, dann
Concept-Dossier (`concept-dossier.html`) mit erster Palette/Bildsprache
befüllen.

---

## 2026-08-21 (Nacht-Session) — Massiver Worldbuilding- & System-Ausbau

**Fokus:** Detaillierte Ausarbeitung des Worldbuildings, der Fraktionen, Topographie, Waffen/Präparate und Begleitersysteme für das postapokalyptische Wien.

**Wichtigste Ergebnisse & Festlegungen:**
1. **Fraktions-Hierarchien (4 Kasten pro Fraktion):**
   - Jede Fraktion folgt der Struktur: *Anführung → Innerer Kreis → Handlanger → Schläger/Enforcer*.
   - Vollständig ausdefiniert für:
     - **Die Pompfinebrer** (Ober-Kondukteur, Protokollanten, Träger, „Schaufler“ mit Grabsteinen/Schrotflinten).
     - **Das Konsulat** (Doyen, Attachés, Kuriere, Personenschützer/Liquidatoren).
     - **Die Giftmischer** (Primar, Pharmazeuten, Apotheken-Boten, schmerzunempfindliche „Sanitäter“-Berserker).
     - **Das AZS** (Bunker-Kommandant, Sektionschefs, Sachbearbeiter, Ordnungsdienst/Schleusenwache).
     - **Das Ringelspiel-Syndikat** (Hutschmeister, Budenbesitzer/Croupiers, Rekommandeure, Kasperl-Clowns mit Nagel-Pritschen).

2. **Wiener Topographie & 17 Schlüssel-Schauplätze:**
   - Etabliert im [`Story-Grundgeruest-v9.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/Story-Grundgeruest-v9.md): Flakturm Arenberg, Stephansdom & Katakomben, Bermudadreieck, Kapuzinergruft, Karlskirche/TU Wien, Naschmarkt, Wienfluss-Tunnel, Hauptbahnhof, Neues AKH, Narrenturm (Altes AKH), U-Bahn-Netz (Knoten Karlsplatz etc.), Müllverbrennung Spittelau, Zentralfriedhof & Bestattungsmuseum, Prater & Riesenrad, Kahlenberg, Tiergarten & Schloss Schönbrunn, UNO-City/IAEA.

3. **Waffen-, Gifte- & Präparate-Profile:**
   - Jede Fraktion hat ein maßgeschneidertes Profil für Nahkampf, Fernkampf/Schusswaffen sowie Gifte/Präparate/Pyrotechnik (von Branntkalk-Nebel über Rizinus-Nadeln bis hin zu Neurotoxinen, Tränengas und Phosphor-Böllern).

4. **Gefährten & Begleiter (Wiener Archetypen):**
   - 5 spielerische und narrative Begleiter mit Persönlichkeit, Perks und persönlichen Quests:
     - Der grantige Fiaker / Totenkutscher (Tank & Karren-Packesel).
     - Die abtrünnige Pharmazeutin (Chemie, Heilung & Support).
     - Der Botschafts-Chauffeur (Stealth, Hacken & Scharfschütze).
     - „Strizzi“ – Der Donaukanal-Terrier (Spürnase & Festhalter).
     - Der gescheiterte Kasperl / Puppenspieler (Fallen, Lärm-Ablenkung & Täuschung).

5. **Mutierte Wiener Fauna & Tierwelt:**
   - Raubtiere (Schönbrunner Prachtkatzen, Donau-Panzernashörner, Dach-Paviane).
   - Urbane Plagen (Wienfluss-Biber/U-Bahn-Ratten, Pest-Tauben, Gift-Kröten).
   - Domestizierte Helfer (Lainzer Lasten-Keiler, Spür-Marder, Friedhofs-Rehe).

**Aktueller Hauptdokument-Stand:**
- Das lebende Dokument [`Story-Grundgeruest-v9.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/Story-Grundgeruest-v9.md) enthält die vollständige Synthese aller Bausteine.
- Das neue Dokument [`Story-Dramaturgie.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/Story-Dramaturgie.md) fixiert den kanonischen 4-Akte-Handlungsbogen („A schene Leich fürn Großvater“) von Bunker Arenberg über das Bermudadreieck und den Zentralfriedhof bis zur UNO-City.

---

## 2026-08-22 — Etablierung des Master-Handlungsbogens & System-Fundamente

**Fokus:** Verknüpfung sämtlicher Fraktionen, Schauplätze, Begleiter und persönlicher Motive zu einer kohärenten 4-Akte-Kampagne sowie Definition von Überlebens- und Identitäts-Systemen.

**Wichtigste Festlegungen:**
1. **Zeitleiste & Technologie (2050 ➔ 2100):**
   - *Schlag*: ~2050 (fortgeschrittenes Zeitalter mit KI-Protokollen, Robotik und Kybernetik).
   - *Spielzeit*: ~2100 (50 Jahre nach der Katastrophe; erste voll unterirdisch aufgewachsene Generation).
   - *KI-Relikte*: Fragmentierte KIs wie die bürokratische AZS-Sub-KI „Amtsrat 4.1“ auf dem Amts-Terminal oder verwaiste IAEA-Sicherheitssysteme.
2. **Freie Identität & Dynamische Besetzung:**
   - Spieler wählt Geschlecht/Identität frei und ohne Rollen-Einschränkungen.
   - Das biologische Geschlecht der NPCs und Begleiter wird prozessual/zufällig dynamisch bestimmt.
3. **Strahlungs- & Toxizitäts-System:**
   - Strahlung verringert kontinuierlich die maximalen HP (HP-Cap), stört das Zielen/Gehen und erfordert Jod, Blei-Einlagen, Schutzkaffee-Konzentrate oder Dekontamination.
4. **Vollständige Master-Dramaturgie (4 Akte) & 20 Schauplätze:**
   - Festhaltung in [`Story-Dramaturgie.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/Story-Dramaturgie.md).
   - Schauplatz 18: **Die Gürtelbögen (Stadtbahnbögen)** – das verruchte Rotlicht-, Kneipen-, Kleinkriminalitäts- und Live-Musik-Milieu Wiens (Hehlermärkte, illegaler „Gürtel-Fusel“, Bandenkriege).
   - Schauplatz 19: **Der Ölhafen Lobau (Tanklager in den Auen)** – gigantischer Industrie-Albtraum im Naturschutzgebiet; schwer umkämpftes Treibstoff-Mekka zwischen den fallenstellenden Aupacklern und Schmugglern. Explosionsgefahr bei Schusswechseln.
   - Schauplatz 20: **Das Haus des Meeres (Flakturm Esterházypark)** – 11-stöckiger vertikaler Beton-Dungeon mit geborstenen Haibecken, Tropensümpfen, mutierten Kiemen- und Amphibien-Kreaturen und Geier-Nestern auf den Geschützplattformen.
5. **Modulare Side-Quests & Skalierbare Schauplatz-Hierarchie:**
   - Nebenquests für Erfahrung, seltene Waffen, Drogen, Nahrung und Crafting-Materialien.
   - Schauplatz-Skalierung: Von Makro-Zonen (Prater, Zentralfriedhof) über Meso-Gebäude (Bögen-Kneipen, Narrenturm) bis zu Mikro-Orten (zerschossene rote Wiener Bushaltestelle, Würstelstand, Notausstiege).
   - Environmental Storytelling: Einzelne lebende und tote Gestalten als Träger seltener Puzzlesteine zur Geschichte des Großvaters und zum Atomschlag von ~2050.
6. **Die Degenerierten / Verwachsenen (Menschliche Strahlenfolgen - *Hills Have Eyes*-Vibe):**
   - *Aupackler*: Verwilderte, territoriale Schilf- und Auen-Sippe (Inzucht, Knochenbeile, Schlingfallen, Kannibalismus aus Hungersnot).
   - *Kellerkinder*: Blinde, lichtscheue Rudel in unbeleuchteten U-Bahn-Totstrecken (Klicklaute, Schleichangriffe).
   - *Ausgedingte*: Ausgebunkerte, verstrahlte Verstoßene der AZS-Bunker als tragische Zeugen und Questgeber.
7. **DLC- & Erweiterungs-Horizonte (Beyond Vienna):**
   - *DLC 1 („Das Flüstern des Wienerwalds“)*: Lainzer Tiergarten, Jagdschloss Hermesvilla, alter Buchenwald, Survival & Jagd.
   - *DLC 2 („Der Weiße Quell“ - Die Hausberge Wiens)*: Semmering (Südbahnhotel, Panhans-Festungen), Rax & Schneeberg (reines Alpenquellwasser) und die über 100 km lange **1. Wiener Hochquellenwasserleitung** als zermürbender, pechschwarzer Stollen-Highway aus den Bergen nach Wien.
8. **Das verwobene Fraktions-Ökosystem & Dynamische Side-Quests:**
   - Gegenseitige Abhängigkeiten & Hehlerei (Pompfinebrer ⮀ Alchimisten für Einbalsamierungsbalsam vs. Gruftzugänge; Alchimisten ⮀ Spittelau für Fernwärme vs. Schmelzkatalysatoren; Konsulat ⮀ AZS für Passierscheine vs. Coderätsel; Prater-Syndikat ⮀ Gürtelbögen für Lobau-Treibstoffschmuggel; Konsulat ⮀ Pompfinebrer für tote Briefkästen in Ehrengräbern).
   - Aus diesen Reibungen entspringen konkrete Nebenquests mit moralischen Entscheidungen (z.B. *„Die Grabräuber-Doktoren“*, *„Der kalte Entzug“*, *„Diplomatisches Gepäck“*, *„Panscher-Krieg“*, *„Letzte Depesche“*).
10. **Räumliche Kompression & Karten-Topologie (World-Scale Mapping):**
    - *Kompression 1:10 bis 1:15* (wie Boston in *Fallout 4*): Verdichtung generischer Wohnstraßen bei präziser Himmelsrichtungs-Treue der 20 Landmarken.
    - *3-Ebenen-Topologie*: Ebene +1 (Dächer & Otto-Wagner-Stadtbahnbögen), Ebene 0 (Ruinen & Barrikaden-Schluchten), Ebene -1 (U-Bahn-Netz, Wienfluss-Kanal & Katakomben).
    - *Barrikaden als Level-Channelling*: Eingestürzte Gründerzeit-Fassaden, Schuttkegel und Strahlensenken leiten den Spieler in spannende Korridore statt in leere Weiten.
11. **Visueller Art-Style („Morbid-Malerischer Graphic-Noir“):**
    - *Synthese*: **Dishonored** (stilisierte k.u.k.-Pinselstrich-Ästhetik, überzeichnete Charakter-Silhouetten), **Disco Elysium** (melancholische Ölfarb-Palette, malerische Dichte) und **Little Nightmares** (groteskes Chiaroscuro-Lichtspiel, wachsartige Texturen, Theaterkulissen-Vibe).
    - Zeitlos, ressourceneffizient für WebGPU/WebGL und ideal für die Symbiose aus morbider Eleganz und schwarzem Wiener Humor.
12. **Engine-Erweiterung: `OutlineElement` (Toon / Comic Ink Outline):**
    - Implementiert in der Post-Processing-Pipeline für WebGPU (`PostProcessPass.ts`, `PostProcess.frag.wgsl`) und WebGL (`PostProcessPassGL.ts`, `PostProcess.frag.glsl`).
    - Ermöglicht stufenlose Strichstärke (`thickness`), Kantensensitivität (`sensitivity`) und Kantenfarbe (`color`) für den perfekten Graphic-Novel-Look.
    - 395 Vitest-Tests grün.

**Nächste Schritte:**
- Detaillierung der Einstiegs-Szenen im Bunker Arenberg (Leveldesign, Props, PBR-Materialien, Beleuchtung).
- Ausgestaltung des visuellen `concept-dossier.html`.


