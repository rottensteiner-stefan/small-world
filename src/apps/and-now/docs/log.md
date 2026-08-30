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
13. **Perspektiven-Architektur: Das „Wiener Guckkasten-Prinzip“ (Dualer Kamera-Hybrid):**
    - *Oberwelt / Ruinen*: Isometrischer / Top-Down-Blick (*Disco Elysium*-Stil) für Orientierung, weite Plätze, NPC-Dialoge und Straßen-Erkundung.
    - *Innenräume / Bunker / Katakomben*: 2.5D Theaterbühnen-Schnittmodell (*Little Nightmares*-Stil) für beklemmende Chiaroscuro-Schleichpassagen, Klettereien und intime Raum-Rätsel.
    - *Nahtloser Kameraschwenk (Seamless Transition)*: Butterweiche Kamera-Interpolation von Schrägdraufsicht auf Augenhöhe beim Betreten von Bunkern/Gebäuden, während Fassaden wie Theaterprospekte transparent werden. Maximale visuelle Dichte bei minimalem Modellierungsaufwand.
14. **Diverses, kontextsensitives Rätsel-System (*The 7th Guest* / *Gabriel Knight 2* / *Myst*-Philosophie):**
    - Konsequente Absage an Copy-Paste-Minigames (wie die immer gleichen Terminals in *Fallout*).
    - 6 handgefertigte, im Wiener Setting verwurzelte Rätselklassen:
      1. *Mechanik/Physik*: Flaschenzüge, Dampfventile, Wasserpegel-Schotts.
      2. *Bürokratie/Chiffren*: Amtsstempel-Kombinatorik für Passierschein 7b, Lochkarten, Klapptafeln.
      3. *Akustik/Frequenzen*: Oszilloskop-Wellenabgleich, Zahlensender Kahlenberg, Safe-Knacken nach Gehör.
      4. *Alchimie/Chemie*: pH-Titration, Reagenzgläser, Säureschlösser im Bermudadreieck.
      5. *Sakral/Uhrwerk*: Sonnen-Schattenwurf auf kaiserliche Adelswappen, Orgelpfeifen-Resonanzen, Zifferblätter.
      6. *Prater-Kuriositäten*: Riesenrad-Zahnradkaskaden, Sequenz-Schießbuden-Trigger.
15. **Design-Mandat: Befreiung von Shooter- & Fetch-Quest-Monotonie:**
    - Weg von stumpfen Botengängen („Bringe 5 Dosen Bohnen von A nach B“) und sinnlosen Baller-Orgien.
    - Stattdessen echter Detektiv- & Abenteuer-Geist: Entschlüsseln von Welt-Hinweisen, moralische Verhandlungen, Deeskalation, Schleichen und das Finden alternativer Lösungswege (z.B. Bestechung vs. Hacken vs. physikalisches Umgehen).
16. **Das taktile Werkzeug- & Waffen-Arsenal (Klasse statt Masse & Modding):**
    - Konsequente Absage an Loot-Spam (keine 20 belanglosen Schwerter/Pistolen mit +2% Werten).
    - 4 seltene, charakterstarke Grundstücke: *Dienstpistole des Großvaters*, *Schaufler-Querflinte*, *modifiziertes Kirmes-Luftgewehr* und das multifunktionale Brechwerkzeug (*„Wiener Hebel“*).
    - Tiefes, mechanisches Modding an Werkbänken (Laserpointer aus TU-Optiken, Granitsplitt-Chokes, Gift-Injektoren, Schalldämpfer).
    - Gadgets & Köpfchen im Fokus: Alchimisten-Schlafgase in Lüftungsschächten, aufziehbare Spieluhren als akustische Lockvögel, Säure-Ampullen für Schlösser.
17. **Visuelle Konzept-Skizzen & Interaktives Concept Dossier:**
    - Alle 5 Graphic-Noir-Skizzen lokal im Projekt verankert (`src/apps/and-now/docs/assets/`).
    - Vollständige Ausgestaltung von [`concept-dossier.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/concept-dossier.html) mit Galerie, den 3 Spielarchitektur-Säulen (*Guckkasten-Prinzip*, *Myst-Rätsel*, *Taktiles Arsenal*) und den 5 Wiener Fraktionen (inkl. der *Hundertwasser-Gilde* von Spittelau).
18. **Das Großvater-Mysterium & Die Kaffeedosen-Urne (*The Last of Us*-Dramaturgie):**
    - *Bürokratische Vertuschung*: KI „Amtsrat 4.1“ vermeldet Alterstod; die Akte ist mit Sperrvermerk Stufe 3 belegt.
    - *Infiltration Sektor 0*: Auffinden der Leiche in Kältekammer-Fach K-42; Einstichwunde am Hals (Bittermandel-/Blausäuregeruch der Giftmischer); geraubtes Medaillon; umklammerte D-Wagen-Fahrkarte mit Kapuzinergruft-Koordinaten.
    - *Wiener Relikt-Urne*: Heimliche Einäscherung im Bunker-Ofen (gegen das Massengrab/Komposter) und Abfüllung in eine antike, geprägte Messing-Kaffeedose als ständiger Reisebegleiter im Rucksack.
19. **Die Familie Novotny (Böhmisch-Wienerische Identität):**
    - Kanonischer Familienname: **František Novotny** (Großvater, Vorkriegsgeneration mit böhmischen Wurzeln), **Fritz Novotny** (Vater, Wiener Bunker-Zwischengeneration) und die Spielfigur (*[Vorname & Geschlecht frei wählbar] Novotny*).
    - In-Game-Ansprache: NPCs, Akten und die KI „Amtsrat 4.1“ sprechen die Figur stilecht mit *„Novotny“*, *„Bürger/in Novotny“* oder dem gewählten Vornamen an.
    - Verwurzelt in der reichen böhmisch-mährischen Einwanderungsgeschichte Wiens (die klassischen „Ziegelböhm“ und k.u.k.-Handwerker) – verleiht der Familie sofort bodenständigen Wiener Charme.
20. **Das Schicksal der Eltern (Ungeschminkte Endzeit-Hintergründe):**
    - *Elena Novotny (Mutter)*: Früher Tod an der Bunkergrippe/Lungenfäule durch feuchte, unzureichende Umluftfilter – bittere Bunkeralltag-Realität ohne Melodram.
    - *Fritz Novotny (Vater)*: Verschollen in den 2080ern als AZS-Kanalspäher bei einer Tunnel-Erkundung Richtung Stadtpark/Wienfluss.
    - *Environmental Lore*: Keine aktiven Suchquests; Details und Erinnerungen existieren nur als optionale vergilbte Tagebucheinträge, Audiologs und alte Späherberichte in der Spielwelt.
21. **Profil der Spielfigur (Anfang 20 / Generation 2100):**
    - Alter: **~22 bis 24 Jahre** (geb. ca. 2076–2078 tief im Flakturm Arenberg).
    - Physisch agil, lernfähig, aber ohne jede Oberflächenerfahrung – ein unbeschriebenes Blatt mit jugendlicher Neugier und emotionaler Bindung an die Erzählungen des Großvaters.
22. **Dialog-System & Intelligentes Amts-Logbuch (Zero-Pen-and-Paper):**
    - *Wiener Dialoge*: Multiple-Choice mit Wiener Schmäh, k.u.k.-Bürokratie, Verhandlungsgeschick und Deeskalation.
    - *Auto-Journaling*: Alle gehörten/gelesenen Passwörter, Tresor-Kombinationen, Frequenzen und Gesprächsfetzen werden **automatisch im AZS-Handgerät protokolliert**.
    - *Kontext-Transfer*: Steht der Spieler vor einem Schloss oder Terminal, wird der passende Code aus dem Logbuch automatisch eingeblendet/eingefügt.
    - *Františeks Tagebuch*: Archivierte Skizzen, alte U-Bahn-Pläne und Notizen des Großvaters im Gerät.
23. **Der interaktive 60-Sekunden-Prolog (Unsichtbares Tutorial & Mystery-Zündung):**
    *   *Phase 1 (Dialog-Tutorial)*: Blockwart Hawelka schiebt Františeks Handgerät herein. Spieler wählt intuitiv 2 aus 3 Fragen (über den Fundort, die Halsflecken, die Kanzlei).
    *   *Spannungs-Abbruch*: Stiefeldröhnen der AZS-Wachen im Gang – Hawelka flieht panisch (*„Ich war nie hier!“*).
    *   *Phase 2 (UI & Auto-Journal-Tutorial)*: First-Person-Nahansicht des Röhren-Screens. Anschalten per Drehschalter, Rattern der Sterbemeldung (KI „Amtsrat 4.1“), sichtbares Auto-Archivieren von *„Fach K-42“* und *„Kühlstrang“* im Logbuch.
    *   *Nahtloser Übergang*: Rückkehr in den 2.5D-Bühnenschnitt – volle Bewegungsfreiheit zur Infiltration von Sektor 0.
24. **Interaktiver 60-Sekunden-Cinematic-Prototyp:**
    *   Vollständig lauffähiger interaktiver Storyboard-Player erstellt (`prologue-preview.html`).
    *   Enthält Echtzeit-Timeline, CRT-Scanline-Filter, Szenenwechsel zwischen 2.5D-Wohnkoje und First-Person-Terminal sowie interaktive Multiple-Choice-Verzweigung mit Hawelka.
25. **Gerendertes 60-Sekunden-Cinematic-Video (MP4 mit Kamera-Fahrten):**
    *   Mit FFmpeg als Full-HD-Video (`1920x1080 @ 25fps`) gerendert (`prologue_cinematic_preview.mp4`).
    *   Enthält fließende Zoom-Pan-Kameradynamik von der 2.5D-Bühnenszene zur Terminal-Nahaufnahme.
    *   Liegt dauerhaft unter `src/apps/and-now/docs/assets/prologue_cinematic_preview.mp4`.
26. **Echtzeit-3D-Prolog-Szene in Small World Engine (`src/apps/and-now/scenes/prologue/`):**
    *   Vollständige 3D-Implementierung des 2.5D-Bühnenschnitts in TypeScript ([`PrologueScene.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/prologue/PrologueScene.ts)) und HTML ([`index.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/prologue/index.html)).
    *   *Features*: Animierte aufschwingende Panzertür, dynamischer Flurlicht-Spotkegel, schwebende Staubpartikel, Stockbett, Messing-Kaffeemühle, flackerndes CRT-Terminal mit First-Person-Kamerafahrt und interaktive Multiple-Choice-Abfrage mit Hawelka.
    *   Nutzt die PostProcessing-Pipeline (*Outline*, *Bloom*, *Vignette*, *Grain*, *ToneMapping*).

**Nächste Schritte:**
- Detaillierung der Einstiegs-Szenen im Bunker Arenberg (Leveldesign, Props, PBR-Materialien, Beleuchtung im 2.5D-Bühnenschnitt).
- Spezifikation des AZS-Handgeräts („Amts-Terminal 2100“) und der KI „Amtsrat 4.1“.



## 27. Bugfix: CORS und Rendering des Prologs (2026-08-22)
- **Problem:** Dev-Server / Caddy spielten die Prolog-Szene aufgrund verwaister Vite-Build-Pfade und fehlerhafter Kamera-Projektion nicht ab. Zudem fehlte der UI Play-Button im HTML der Szene.
- **Lösung:** 
  - Prolog-Szene architektonisch sauber nach `showcases/31/` verschoben, um Vite's internes Routing für Showcases out-of-the-box zu nutzen.
  - Kamera-Projektions-Überschreibung entfernt (nutzt jetzt die standardmäßige, Resize-robuste AbstractShowcase Kamera).
  - Fehlende HTML-UI für die Timeline mit dem Play-Button eingefügt.
  - Lichtstimmung kurzfristig hochgeschraubt zur Fehleranalyse, danach wieder auf Original "Graphic Noir"-Level zurückgesetzt.
- **Status:** Szene 100% funktionsfähig im Build (Caddy).

## 28. "And Now?" Infrastruktur (2026-08-22)
- **Struktur:** Prolog-Szene von `showcases/31` zurück nach `src/apps/and-now/scenes/prologue/` verschoben.
- **Hub:** Neue Startseite (`src/apps/and-now/index.html`) als zentrales Hub für alle "Wien" Szenen gebaut.
- **Vite:** Routing in `vite.config.ts` (`andNowHub`, `andNowPrologue`) stabilisiert, so dass die App-Struktur als native Multi-Page-App im Build und Dev-Server out-of-the-box funktioniert.

## 29. Lore-Update: Die Vertuschung und der erste Heist (2026-08-22)
- **Problem behoben:** Es war unlogisch, dass die pedantische AZS-Bürokratie dem Großvater bei der Katalogisierung das D-Wagen-Ticket in der Hand gelassen und den Mord übersehen hätte.
- **Neue Wendung:** Das AZS steckt voll in der Vertuschung! Offiziell ein "natürlicher Tod", doch die Leiche weist in der Kältekammer K-42 einen Einstich (Blausäure) auf. 
- **Neuer Gameplay-Loop:** Die Leiche hat nichts mehr bei sich. Die gesamte Habe wurde in die AZS-Asservatenkammer gebracht. Novotny muss dort einbrechen ("Der erste Heist"), um das Medaillon und den D-Wagen-Passierschein zurückzuholen. (In `story.md` übernommen).

## 30. Meilenstein: Akt II - IsoExplore Setup (2026-08-22)
- **Umsetzung:** Die Infrastruktur für die erste spielbare isometrische Szene (Flakturm Gänge) wurde hochgezogen.
- **Dateien:** `src/apps/and-now/scenes/iso-explore/isoExplore.ts` und `index.html` erstellt. Vite-Config und App-Hub wurden aktualisiert, um die Szene zu verlinken.
- **Aktueller Stand:** Eine rohe Szene mit düsterer "Diablo"-Kameraperspektive und einem roten Platzhalter-Block (Novotny) steht.
- **Nächster Schritt:** Implementierung eines isometrischen Movement-Controllers für Novotny.

## 31. Lore-Konsistenzpass: Františeks Alter & Der persönliche Antagonist (2026-08-23)
- **Anlass:** Konsistenz-Review der aktuellen Story-Dokumente (`story.md`, `concept-dossier.html`, `log.md`) auf Widersprüche im Zusammenspiel von Fraktionen, Figuren, Orten und Handlung.
- **Fix 1 (Alter):** Františeks Geburtsjahr war mit „~2042" rechnerisch unmöglich für seine eigene Biografie (8 Jahre alt beim Schlag ~2050, aber als etablierter Erwachsener mit Vorkriegs-Erinnerungen und -Karriere beschrieben). Auf **~2005** korrigiert – Mitte 40 beim Schlag, knapp 95 bei seinem Tod 2100. Macht ihn zum letzten lebenden Zeitzeugen der echten alten Welt, was den Verlust noch schwerer wiegen lässt.
- **Fix 2 (Mordfaden zusammengeführt):** Der Mordfaden aus dem Prolog (Gift, geraubtes Medaillon, D-Wagen-Fahrkarte zur Kapuzinergruft) drohte ins Leere zu laufen, seit `Story-Dramaturgie.md` (mit der ursprünglich geplanten IAEA-Keycard-Enthüllung am Grab) aus dem Kanon entfernt wurde. Statt den Faden fallen zu lassen, neu verankert:
  - **Hofrat Brandstätter** (neuer Eintrag bei Fraktion D/AZS, „Der persönliche Antagonist") hat den Mord in Auftrag gegeben und die Vertuschung als „natürlicher Tod" persönlich abgesegnet – ein hochrangiger Beamter aus der Rossauer-Kaserne-Zentrale, nicht die lokale Bunkerleitung Arenberg. Wird als wiederkehrender persönlicher Widersacher über mehrere Kapitel angelegt, sobald er von Novotnys Diebstahl aus der Asservatenkammer erfährt.
  - **Das Medaillon** ist kein reines Erbstück mehr, sondern birgt ein verborgenes technisches Innenleben unbekannter Funktion – bewusst offen gelassen als laufendes Mysterium statt sofort aufgelöst, um die Geschichte nicht zu überladen.
  - *Bewusst nicht entschieden*: Ob über Brandstätter hinaus noch eine weitere Ebene (wer/was steht hinter ihm) existiert, bleibt vorerst offen für spätere Sessions.
- **Status:** Beide Fixes in `story.md` eingearbeitet (Familie-Novotny-Abschnitt, AZS-Fraktion, Prolog-Bullets „Infiltration Sektor 0" bis „Aufbruch").

## 32. Lore-Konsistenzpass Teil 2: Fraktionsname & Kapuzinergruft (2026-08-23)
- **Fix 3 (Namensinkonsistenz Spittelau):** Für dieselbe Gruppe kursierten drei Namen parallel: „Die Wächter von Spittelau" (`story.md` Fraktions-Geflecht, `concept-dossier.html`-Galerie), „Die Aschenbrenner" (`story.md`-Ortsbeschreibung Spittelau) und „Hundertwasser-Gilde" (Dossier-Untertitel, `log.md` Eintrag 17). **„Die Aschenbrenner"** als kanonischer Name festgelegt (passt zum knappen Substantiv-Namensmuster der anderen Fraktionen), „Hundertwasser-Gilde" bleibt als Spottname wegen der Fassade erhalten. In `story.md` (Fraktions-Geflecht + Ortsbeschreibung) und `concept-dossier.html` (Fraktions-Galerie) vereinheitlicht.
- **Fix 4 (AZS fehlte im Dossier):** Die Fraktions-Galerie in `concept-dossier.html` zeigte nur 5 Karten (Pompfinebrer, Giftmischer, Konsulat, Ringelspiel-Syndikat, Aschenbrenner) – die AZS als zentrale Antagonisten-Fraktion fehlte komplett. Karte ergänzt (inkl. Verweis auf die Vertuschung), Sektions-Überschrift auf „6 Fraktionen" korrigiert.
- **Fix 5 (Kapuzinergruft-Orphan):** Die Kapuzinergruft (Schauplatz 4) war seit jeher nur mit einer vagen, nie genutzten Rivalität zwischen Pompfinebrern und „Kaisertreuen/Grabkultisten" beschrieben, obwohl die D-Wagen-Fahrkarte aus dem Heist explizit ihre Koordinaten trägt. Rollenbeschreibung um diesen Bezug ergänzt (Ziel der Fahrkarte, offene Frage was František dort vorhatte); die Kaisertreuen/Grabkultisten explizit als Kulisse/kleines Hindernis markiert, nicht als eigene, noch auszuarbeitende Fraktion – um keine unerfüllte Erwartung einer 7. Fraktion zu wecken.

## 33. Meilenstein: Architektur-Proof 2.5D & WebGL Bug-Safari (2026-08-23)
- **Architektur-Shift:** Erfolgreicher Konzept-Test für den "2.5D Matte Painting" Workflow (`pipeline_2_5d.md`). 3D Charaktere bewegen sich vor statischen AI-Hintergründen. Die `isoExplore` Szene wurde aus Kompatibilitätsgründen aus der verschachtelten App-Struktur in den robusteren Pfad `showcases/andNowIso` verschoben und in der Haupt-`index.html` verlinkt.
- **Die große Bug-Safari:** Ein massiver Fehler-Marathon brachte die Engine zum Absturz (`program not linked` und `INVALID_ENUM`). Die Ursache war ein vermeintlich einfaches "Low Poly" Sketchfab-Modell des Detektivs.
  - Auf WebGL2 sprengte das viel zu komplexe PBR-Material des Modells in Kombination mit PointLights das harte Hardware-Limit von 16 Textur-Einheiten (`MAX_TEXTURE_IMAGE_UNITS(16)`).
  - Auf dem Fallback (WebGL1) stürzte die Engine ab, weil das Modell mit 32-Bit Indices (>65k Vertices) exportiert wurde, was WebGL1 standardmäßig ohne Extension (`OES_element_index_uint`) nicht lesen kann.
- **Lösungen & Heutiger Abschluss:**
  - CSS für das Canvas (`100vw/vh`) gepatcht, um Resize-Fehler zu beheben.
  - Den Hintergrund auf extrem ressourcenschonendes `BasicMaterial` mit `diffuseMap` umgestellt.
  - Das toxische GLB-Modell wurde im Code auskommentiert (und testweise mit leerem `LambertMaterial` überschrieben), um den Absturz zu beenden.
  - Die Szene lädt nun problemlos auf dem `BEST` Renderer (WebGL2).
- **Nächster Schritt (Restart):** Ein neues, absolut sauberes GLB-Modell (8.2k Triangles, ohne fette PBR Texturen) wurde vom User gefunden. Beim nächsten Start der Session binden wir dieses Modell ein und platzieren es korrekt vor dem Flakturm-Hintergrund!

## 35. Skeletales GPU-Skinning & GLTF-Animationssystem (2026-08-24)
- **Meilenstein:** Vollständiges, hardwarebeschleunigtes Skeletal Skinning & Keyframe-Animationssystem im Engine-Core (`main` Branch) implementiert.
- **Core-Klassen & Datenstrukturen (`src/core/animation/`):**
  - [`Bone`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/Bone.ts): Hierarchischer Skelettknoten (erweitert `Object3D`) mit `inverseBindMatrix`.
  - [`Skeleton`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/Skeleton.ts): Verwaltung der Knochenhierarchie, globale Transformation und Berechnung der `Float32Array` Bone-Matrizenpalette.
  - [`SkinnedMesh`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/SkinnedMesh.ts): Mesh mit Bindung an ein `Skeleton` und automatischer Aktualisierung der Bone-Matrizen im Render-Cycle.
  - [`KeyframeTrack`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/KeyframeTrack.ts), [`AnimationClip`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/AnimationClip.ts), [`AnimationAction`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/AnimationAction.ts), [`AnimationMixer`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/AnimationMixer.ts): Vollständiges Animations-Playback-System mit linearer Translation/Scale-Interpolation und Quaternion-Slerp für Rotationen.
- **GLTF/GLB-Pipeline (`src/loaders/GltfLoader.ts`):**
  - Automatisches Parsen von GLTF-Skins (`JOINTS_0`, `WEIGHTS_0`, `inverseBindMatrices`), Instanziieren von `Bone`-Knoten und `SkinnedMesh`.
  - Parsen eingebetteter GLTF-Animationen sowie neue Methode `loadAnimations(url)` zum Laden separater Animationsdateien (z. B. `idle.glb`).
- **Shader & WebGL2-Renderer (`WebGL2Renderer.ts`, GLSL Shaders):**
  - Vertex-Shader (`base_vertex_header.vert.glsl`, `base_vertex_main.vert.glsl`) transformieren Vertices und Normalen im Vertex-Shader per GPU Skinning (`USE_SKINNING` Preprocessor-Flag).
  - VBOs für `jbo` (Joints) und `wbo` (Weights) in [`Mesh.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/Mesh.ts) integriert.
- **Showcase-Integration & Verifikation:**
  - In [`showcases/andNowIso/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowIso/showcase.ts) wird `mannequin.glb` mit der separaten Mixamo-Animation `idle.glb` über den `AnimationMixer` in Echtzeit wiedergegeben.
  - Alle 73 Testsuiten und 399 Unit Tests laufen 100% grün.
## 36. Shader-Contract Validation & UBO/Sampler-Budget Parity (2026-08-24)
- **Shader-Paritäts- & Link-Fixes:**
  - **UBO `GlobalUniforms` Synchronisation:** Das `layout(std140) uniform GlobalUniforms`-Layout in `base_vertex_header.vert.glsl` wurde exakt an `lights.frag.glsl` angeglichen (`u_tileSizePx`, `u_clusterDims`), um Field-Number-Mismatch-Linkfehler zu verhindern.
  - **16-Sampler-Budget Hardware-Wächter:** Optionale Material-Texturen in `StandardMaterial`, `PhongMaterial`, `LambertMaterial` und `base_fragment_header.frag.glsl` werden nun strikt mit Preprocessor-Flags (`USE_NORMAL_MAP`, `USE_SPECULAR_MAP`, `USE_METALLIC_MAP`, `USE_IBL` etc.) bedarfsgesteuert kompiliert, wodurch alle Materialien das Apple Silicon Limit (`MAX_TEXTURE_IMAGE_UNITS(16)`) sicher einhalten.
  - **Chunk-Regex-Fix:** GLSL-Array-Größen (`pcssTaps`) kollidieren nicht mehr mit der `[CHUNK_NAME]`-Syntax des `ShaderRegistry`-Parsers.
- **Automatisierte Testsuite (`tests/core/renderers/shaders/ShaderValidation.test.ts`):**
  - Prüft alle 13 Core-Materialien auf vollständige Chunk-Auflösung ohne verwaiste Platzhalter.
  - Verifiziert die exakte Feld-Gleichheit des `GlobalUniforms` UBOs im AST-Vergleich zwischen VS und FS.
  - Simuliert den GLSL-Präprozessor und sichert das Sampler-Budget $(\le 16)$ für jedes Material ab.
- **Status:** 74 Testsuiten mit 426 Unit Tests 100% grün (`npm run test`, `npm run lint:fix`, `npm run build:lib`).

## 37. Die große Entwirrung: 2.5D-Bühnen-Architektur & Szenen-Struktur (2026-08-25)
- **Klärung der Dual-Perspektive:**
  - Trennung zwischen dem echten isometrischen Modus (Erkundung der Oberwelt/Straßen) und dem 2.5D-Bühnenmodus (Bunker-Schnittmodelle & Kammerszenen).
- **Bereinigung des 2.5D-Bühnensystems:**
  - `StageZone` und `StageMovementBehavior` arbeiten nun auf reinen 2D-Bildkoordinaten `(u, v)` (0..1) ohne künstliche 3D-Unprojektionen oder Kamera-Horizon-Abhängigkeiten.
  - Zonen-Sliding und lokale Bewegungsachsen laufen direkt im 2D-Polygon-Raum.
- **Szenen-Umbenennung:**
  - `showcases/andNowIso` wurde sauber nach `showcases/andNowScene2` umbenannt (Klasse `AndNowScene2`).
  - Die Eröffnungsszene (Großvaters Tod in Koje 42) ist als `andNowScene1` (Prolog) im Hub verankert.
- **Status:** Build und Testsuite laufen 100% grün (75 Testdateien, 439 Unit Tests).

## 38. Charakter-Design & Kleidungskonzept Novotny (2026-08-25)
- **Kanonischer Look & Physis:** *„Der Schacht-Trench & Loop-Hoodie“*.
  - **Statur & Physis:** Anfang zwanzig, schlank/hager und drahtig (keine Muskelmassen – geprägt von 20 Jahren kargem Bunkerleben). Melancholisch-suchende Ausstrahlung („a armer Hund im Bunker“).
  - **Basisschicht & Mundschutz:** Dunkler **Hoodie mit Kapuze** + dicker Woll-**Loop-Schal (Schlauchschal / Snood)**, der flexibel als textiler Staub- und Kälteschutz über Mund und Nase hochgezogen wird.
  - **Mantel & Kleidung:** Dunkelgrauer, gewachster Arbeits-Trenchcoat aus Loden mit hochgeschlagenem Kragen über robuster dunkelgrauer **Cargohose mit Blasebalgtaschen** und angeschnallten **Motorrad-Knieschützern** (Schutz beim Kriechen in Schächten).
  - **Ausrüstung:** Breite Lederkoppel, fingerlose Arbeitshandschuhe, feste Schachtstiefel, Messing-Sturmlaterne.
  - **3 Trage-Modi:** 1) Staubschutz-Modus (Kapuze auf + Loop-Schal hoch), 2) Bunker-Modus (Kapuze ab + Schal als Kragenwärmer), 3) Sektor-0-Modus (mit aufgesetzter Gasmaske).
  - **Weibliche Variante:** Anatomisch leicht angepasst und dezent tailliert, bei 100%iger Beibehaltung der wetterfesten, abgewetzten Bunker-Funktionalität.
- **Dokumentation & Skizzen:** In [`story.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/story.md), [`concept-dossier.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/concept-dossier.html) und `novotny_character_concepts.md` eingepflegt.

## 39. Core-Feature: `AxesHelper` & Inspector Gizmo Integration (2026-08-26)
- **Feature:** [`AxesHelper`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/helpers/AxesHelper.ts) als universelles 3D-Koordinatenkreuz im Engine-Core implementiert.
  - **Farbcodierung:** Neon-Rot (+X / Rechts mit "X"-Label), Neon-Grün (+Y / Oben mit "Y"-Label), Neon-Blau (+Z / Z-Achse mit "Z"-Label).
  - **Aufbau:** Zylinder-Schaft, Konus-Pfeilspitze und automatische kameraausgerichtete Billboard-Labels (`Sprite` + `TextTexture`).
- **GadgetInspector Integration:**
  - `showWorldAxes` (Welt-Koordinatenkreuz am Ursprung) und `showObjectAxes` (automatisches Mitwandern am ausgewählten Objekt/Bone) im Inspector unter „Helpers & Gizmos“ integriert.
  - In [`showcases/andNowScene2/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts) via `enableInspector: true` aktiviert.
- **Status:** 76 Testsuiten mit 444 Unit Tests 100% grün.

## 40. Laternen-Ausrichtung & Inspector UX-Refinement (2026-08-26)
- **Laternen-Ausrichtung auf Hand-Bone:**
  - `mixamorig:LeftHand` Bone-Ausrichtung analysiert: Rotation um $Z$ (`Math.PI / 2`) angewendet, sodass der Laternenkörper senkrecht nach unten (+X des Hand-Bones) hängt.
  - Griffpunkt (`LanternHandle`) um ~9cm vom Handgelenk-Pivot nach vorne direkt in die Handfläche/Finger positioniert (`position.set(0.01, 0.09, 0.02)`).
  - Punktlicht (`PointLight`) direkt im Laternenkörper zentriert.
- **Inspector UX-Verbesserungen:**
  - `🎯 Selected Object` fest als oberster Bereich im Scene-Tab verankert mit automatischer Aufklapp- und Scroll-Funktion bei Selektion.
  - Scene Outliner standardmäßig eingeklappt, um UI-Überladung zu vermeiden.
  - Doppelklick- und Klick-Auswahl auf jedes 3D-Mesh im Viewport.
- **Status:** 100% verifiziert, alle 444 Tests und Builds grün.

## 41. Asset-Bereinigung & Trennung von Laufzeit- vs. Rohdaten (2026-08-26)
- **Laufzeit-Bereinigung (`public/assets/and-now/`):**
  - Radikal bereinigt: Enthält nur noch die 5 tatsächlich zur Laufzeit im Browser benötigten Dateien (`flakturm_bg.webp`, `novotny-female.glb`, `idle_torch.glb`, `standing_torch_walk_forward.glb`, `ascending_stairs.glb`).
  - Redundante `concepts/`-Kopie aus `public/` entfernt.
- **Roh- und Autorendaten (`src/apps/and-now/raw/mannequin/`):**
  - Alle DCC-Quelldaten (`.fbx`, `.obj`, `.mtl`, `.zip`, `.fbm/`, alte Dummy-Mannequins) in den nicht-öffentlichen App-Quellordner verschoben.
- **Konzept- & Dokumentationskonsolidierung (`src/apps/and-now/docs/`):**
  - Sämtliche Konzeptgrafiken, T-Pose-Referenzen und Markdown-/HTML-Dossiers zentral unter `docs/` und `docs/assets/`.
- **Status:** 100% verifiziert, alle 444 Tests und Builds grün.

## 42. Character-Pipeline Skill & Tripo3D Vorbereitung (2026-08-26)
- **Skill-Erstellung:** Neuer offizieller Leitfaden [`.agents/skills/character-pipeline/SKILL.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md) etabliert (2D-Skizzen, Image-to-3D, Auto-Rigging, `.glb`-Konvertierung, Bone-Attachment, AnimationMixer).
- **Referenzen:** [`REFERENCES.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/REFERENCES.md) aktualisiert (`AxesHelper`, Novotny Rig & Motion Clips, Mixamo Mannequin).
- **Tripo3D Integration:** `tripo-cli` installiert und vorbereitet für zukünftige automatisierte 3D-Generierung, Auto-Rigging (`animate_rig`) und direkten GLB-Export.
- **Status:** 100% verifiziert, alle 444 Tests und Builds grün.

## 43. Tripo3D API & CLI Pipeline Automation (2026-08-26)
- **Skill-Update:** [`.agents/skills/character-pipeline/SKILL.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md) von manuellen Web-UI-Schritten vollständig auf die skriptbare `tripo-cli` & API umgestellt:
  - Rekonstruktion: `tripo make` für Multi-View Orthographics & Text-Prompts (`--for game-mobile`).
  - Skeletal Auto-Rigging: `tripo anim rig` mit `--spec mixamo` für 100% Small-World-kompatible Bone-Hierarchien.
## 44. Novotny (Männlich) Asset-Ingestion & Showcase-Integration (2026-08-27)
- **Asset-Pipeline:**
  - 3 T-Pose-Turnarounds (Front, Profil, Back mit exakter Symmetrie, sichtbarem Gesicht, herabhängender Kapuze und Schal um den Hals) erzeugt (`src/apps/and-now/docs/assets/`).
  - Tripo-generiertes 3D-Modell mit 41-Joint Biped Rig als [`public/assets/and-now/mannequin/novotny-male.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/novotny-male.glb) und Rohdaten in [`src/apps/and-now/raw/mannequin/`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/) integriert.
- **Showcase & Scene 2:**
  - [`showcases/andNowScene2/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts) lädt `novotny-male.glb` standardmäßig (bzw. `novotny-female.glb` via URL-Query `?char=female`).
  - Hand-Bone-Auflösung für die Laterne auf Multi-Skeleton-Support (`LANTERN_HAND_BONE_NAMES`) erweitert.
  - Textur-Mapping unterstützt sowohl eingebettete GLB-PBR-Maps als auch externe Textur-Overlays.
## 45. Vollautomatisierte Tripo3D API Pipeline & Web-Optimierung (2026-08-27)
- **End-to-End API Ausführung:**
  - 3D-Rekonstruktion via `tripo make` aus den 3 Orthographics mit PBR-Texturatlas und Game-Mobile Preset (`src/apps/and-now/raw/mannequin/tripo-male/`).
  - Skelett-Generierung via `tripo anim rig --spec mixamo` erzeugt 67-Joint Rig (`novotny-male.glb`).
  - Modell liegt fertig geriggt und texturiert in [`public/assets/and-now/mannequin/novotny-male.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/novotny-male.glb).
- **Skill-Vorgaben (`character-pipeline`):**
  - Strikte Web-Performance-Regeln verankert: `--for game-mobile`, `--param face_limit=15000`, 2K Textur-Standard (`--param texture_quality=standard`), **strikt kein 4K/8K** für VRAM-Schonung im Browser.
  - Metrische 1.8x-Skalierung für normalisierte Tripo-Modelle in Small World dokumentiert.
## 46. Upgrade des Character-Pipeline Skills auf Studio-Standard (2026-08-27)
- **5 Profi-Optimierungen verankert ([`character-pipeline`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md)):**
  1. *Albedo-First Mandat:* Verpflichtend reine Albedo-Farbfelder in 2D-Prompts ohne gebackene Richtungs-Schatten.
  2. *A-Pose (45°) Standard:* Empfehlung der A-Pose für reduzierte Deltoid-Verzerrung und saubere Achsel-Edge-Loops.
  3. *3-in-1 Model-Sheet:* 16:9 Multi-View-Sheet zur Garantie absoluter Detail- und Proportionskonsistenz.
  4. *Shared Motion Library:* Strukturierung geteilter In-Place-Clips unter `public/assets/shared/animations/`.
  5. *Semantic Sockets:* Standardisiertes Knochen-Mapping und Socket-System für Requisiten/Ausrüstung.
## 47. Kanonische Ausrüstung: Laterne rechts, Maske rechts vorne (2026-08-27)
- **Vereinheitlichung für beide Figuren (Female & Male):**
  - Laterne wird in der **rechten Hand** getragen (`mixamorig:RightHand` / `R_Hand` / `tripo::0_Right_Limb_2`).
  - [`showcases/andNowScene2/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts): `LANTERN_HAND_BONE_NAMES` bindet die Laterne an den rechten Hand-Bone.
  - Atemschutzmaske ist am Gürtel **rechts vorne** befestigt.
  - Dokumentation in [`novotny_tpose_reference_prompts.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/novotny_tpose_reference_prompts.md) und [`character-pipeline`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md) verankert.
## 48. 3-Stufen Schutzkleidung (Gear States) & Skizzen-Katalog (2026-08-27)
- **Die 3 kanonischen Schutzzustände für Female & Male:**
  1. *State 1: BASE (Gute Luft / Erkundung):*
     - Gesicht voll sichtbar (unbedeckt).
     - Kapuze abgesetzt auf den Schultern, Haare/Kopfform frei.
     - Schlauchschal locker als Kragen um den Hals.
     - Gasmaske am Gürtel rechts vorne eingehängt, Laterne in rechter Hand.
  2. *State 2: DUST PROTECTION (Staub- & Rußzone):*
     - Schlauchschal über Mund & Nase als Staubfilter hochgezogen.
     - Kapuze über den Kopf aufgesetzt.
     - Gasmaske bleibt am Gürtel rechts vorne eingehängt, Laterne in rechter Hand.
     - Referenz: [`novotny_hoodie_male.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_hoodie_male.jpg).
  3. *State 3: TOXIC HAZARD (Giftgas / Schächte):*
     - Vollständige Atemschutzmaske aufgesetzt und festgezurrt.
     - Kapuze über den Kopf aufgesetzt.
     - Masken-Halterung am Gürtel rechts vorne ist leer, Laterne in rechter Hand.
- **6-Skizzen Matrix für Artwork & Produktion:**
  - `novotny_female_state1_base.jpg` / `novotny_male_state1_base.jpg`
  - `novotny_female_state2_dust.jpg` / `novotny_male_state2_dust.jpg`
  - `novotny_female_state3_toxic.jpg` / `novotny_male_state3_toxic.jpg`
- **AAA Skin & Movement Paradigma:**
  - Verhalten (`StageMovementBehavior`), Sockets, Animationsclips (`idle`, `walk`, `jump_trench`, `climb_ladder`) sind zu 100% identisch zwischen männlich und weiblich.
  - Der Charakter ist lediglich der austauschbare Skin (`novotny-female.glb` vs. `novotny-male.glb`), Gear-Zustände werden über modulare Sub-Mesh-Toggles zur Laufzeit geschaltet.
- **Status:** 76 Testsuiten mit 444 Tests und Library-Build 100% grün.

## 49. Kompletter Re-Run der Character-Pipeline für Novotny M & W (2026-08-27)
- **Pipeline-Ausführung:**
  - **Female Novotny:** Vollständige Rekonstruktion aus [`novotny_female_tpose_front.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_female_tpose_front.jpg), [`novotny_female_tpose_right.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_female_tpose_right.jpg), [`novotny_female_tpose_back.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_female_tpose_back.jpg) via `tripo make --for game-mobile` und geriggt via `tripo anim rig --spec mixamo`.
  - **Male Novotny:** Vollständige Rekonstruktion aus [`novotny_male_tpose_front.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_male_tpose_front.jpg), [`novotny_male_tpose_right.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_male_tpose_right.jpg), [`novotny_male_tpose_back.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_male_tpose_back.jpg) via `tripo make --for game-mobile` und geriggt via `tripo anim rig --spec mixamo`.
- **Harmonisierung:**
  - Beide Figuren verfügen über identische Knochenstrukturen (`mixamorig:RightHand`, `mixamorig:Hips`, etc.), 1.80m Normalisierungsskalierung und integrierte PBR-Texturen.
  - Runtime-Assets: [`public/assets/and-now/mannequin/novotny-female.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/novotny-female.glb) und [`public/assets/and-now/mannequin/novotny-male.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/novotny-male.glb).
  - Rohdaten: [`src/apps/and-now/raw/mannequin/tripo-female/`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/tripo-female/) und [`src/apps/and-now/raw/mannequin/tripo-male/`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/tripo-male/).
- **Live-Charakterwechsel:**
  - [`showcases/andNowScene2/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts): Ermöglicht nahtloses Wechseln im laufenden Spiel mit Taste `[C]` sowie URL-Query `?char=female|male` unter Beibehaltung der Bühnenposition, des Animationsstatus und des Laternen-Sockets.
- **Status:** 90 Testsuiten mit 513 Tests und Library-Build 100% grün.

## 50. Tripo3D Animation Presets Integration (Idle, Walk, Climb) (2026-08-27)
- **Animation Retargeting via Tripo API:**
  - Für beide geriggten Charaktere (`novotny-female.glb` und `novotny-male.glb`) wurden die bipedalen Animations-Presets via `tripo anim retarget --animation preset:idle preset:walk preset:climb --animate-in-place` berechnet und direkt in die Runtime-GLBs integriert.
  - `preset:idle`: Lebendiges Stehen / Atmen (ohne starres Einfrieren).
  - `preset:walk`: Bipedales Gehen in-place.
  - `preset:climb`: Treppensteigen / Stufensteigen in-place.
- **Showcase Integration ([`showcases/andNowScene2/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts)):**
  - Automatisches Auslesen der eingebetteten Animations-Tracks aus der geladenen GLB.
  - Dynamischer Zonen-Trigger: In Zone A & B wird `preset:walk` abgespielt, beim Betreten von Zone C (Treppenaufgang/Schleuse) blendet der Mixer automatisch auf `preset:climb` über. Im Stillstand läuft `preset:idle`.
  - [`BasicMaterial`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/materials/BasicMaterial.ts) mit übertragener DiffuseMap garantiert optimale Sichtbarkeit im Graphic-Noir-Stil.
- **Status:** 90 Testsuiten mit 513 Tests und Library-Build 100% grün.

## 51. Reaktivierung der Studio-Torch-Animationen & Knochen-Aliasing (2026-08-27)
- **Problem & Analyse:**
  - Die generischen AI-Presets (`preset:walk`/`preset:idle`) führten zu unkontrolliertem Torkeln mit wild schwingenden Armen, wodurch die Hand-gebundene Laterne unruhig taumelte und falsch ausgerichtet war.
- **Lösung & Reaktivierung der Studio-Clips:**
  - Zurück auf die kuratierten Studio-Motion-Clips: [`idle_torch.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/idle_torch.glb), [`standing_torch_walk_forward.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/standing_torch_walk_forward.glb) und [`ascending_stairs.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/ascending_stairs.glb).
  - In diesen Clips ist die rechte Hand stabil in Fackel-/Laternen-Tragehaltung fixiert.
- **Engine-Verbesserung ([`src/core/animation/AnimationMixer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/AnimationMixer.ts)):**
  - Robustes Knochen-Aliasing (`mixamorig:`, `mixamorig1:`, etc.) aufgelöst, sodass alle Mixamo-Clips unabhängig von Präfix-Nummerierungen nahtlos auf die Biped-Skelette binden.
- **Status:** 90 Testsuiten mit 513 Tests und Library-Build 100% grün.

## 52. Novotny Original-Skins, Linke Hand Laterne & Asset-Bereinigung (2026-08-27)
- **Texture / Skin:**
  - Reine Graphic-Noir-Texturen aus den Original-Skizzen [`novotny_hoodie_male.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_hoodie_male.jpg) und [`novotny_hoodie_female.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_hoodie_female.jpg) für beide Figuren via [`BasicMaterial`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/materials/BasicMaterial.ts) aktiv.
- **Laternen-Haltung (Linke Hand):**
  - Socket bindet prioritär an die **linke Hand** (`mixamorig:LeftHand` / `mixamorig1:LeftHand`).
  - Der Griff liegt in der linken Handfläche, der Laternenkörper hängt exakt senkrecht nach unten in Richtung Boden.
- **Bewegung & Animationen:**
  - Verwendung der 3 Studio-Clips: `idle_torch.glb` (Ruhiger Stand), `standing_torch_walk_forward.glb` (Gehen mit Laterne) und `ascending_stairs.glb` (Treppe).
  - Tasten-Toggle `[C]` schaltet zur Laufzeit nahtlos zwischen weiblichem und männlichem Novotny um.
- **Asset-Bereinigung:**
  - Alle nicht mehr benötigten T-Pose-Zwischenskizzen aus `docs/assets/` sowie temporäre Retarget-Ordner restlos entfernt.
- **Status:** 90 Testsuiten mit 513 Tests und Library-Build 100% grün.

## 53. Retrospektive: Grenzen des Tripo3D Auto-Riggings & Studio-Pipeline Erkenntnisse (2026-08-27)

### 1. Die Probleme des rein automatisierten Auto-Riggings (Tripo3D)
- **Fehlerhafte Knochen-Hierarchien:**
  - Trotz des Parameters `--spec mixamo` liefert das AI-Auto-Rigging von Tripo keine verlässliche Mixamo-Standard-Struktur. Insbesondere bei komplexeren Silhouetten (Hoodie, Schal, weite Kleidung) werden Gliedmaßen falsch geschachtelt (z. B. Armknochen als direkte Kinder von `tripo::Root` oder Kopfknochen unter Arm-Segmenten) und mit internen Platzhalternamen (`bone_XX`) belegt.
  - Dadurch greifen standardisierte Motion-Clips (`idle_torch.glb`, `standing_torch_walk_forward.glb`) ins Leere, was zu unbewegten, eingefrorenen oder verzerrten Gliedmaßen führt.
- **AI-Retargeting Presets sind ungeeignet für Game-Props:**
  - Die von Tripo generierten Retarget-Clips (`preset:idle`, `preset:walk`, `preset:climb`) sind generische, unkontrollierte Ragdoll-Bewegungen mit starkem Schlingern und wild schwingenden Armen.
  - Für Spielfiguren mit getragener Ausrüstung (Laterne, Waffe, Fackel) sind diese Presets unbrauchbar, da die Hand unkontrolliert durch den Körper wandert und die Laterne wild taumelt.
- **PBR-Shader vs. 2.5D Comic/Noir Lighting:**
  - Tripo exportiert PBR-Materialien mit hohen Metallic-/Roughness-Faktoren, die ohne vollständiges Image-Based-Lighting (IBL/HDRI) in einer 2.5D-Bühnenszene als komplett schwarze Silhouette rendern. Erst ein explizites Überschreiben mit [`BasicMaterial`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/materials/BasicMaterial.ts) stellt die Texturen sichtbar dar.
- **Altlasten bei Texturen:**
  - Bei schnellen Asset-Iterationen bestanden noch Reste der alten Mannequin-Textur (z. B. weiße Haarsträhne des Ch36-Dummies). Texturen müssen immer dediziert aus den kanonischen Skizzen isoliert und validiert werden.

## 54. Root-Cause-Fix: Rig/Animation-Mismatch, Retargeting-Presets doch nutzbar, 64-Bone-GPU-Limit (2026-08-28)

**Anlass:** Anschluss an Eintrag 53 — die Figuren waren weiterhin sichtbar kaputt (Gliedmaßen reißen während Idle/Walk/Stairs). Root-Cause-Analyse per GLB-Bone-Dump statt Spekulation.

**Konkreter Befund:**
- Das deployte `novotny-male.glb` hatte `mixamorig:`-Namen, aber zusätzliche Twist-Hilfsknochen (`L_CalfTwist01/02` etc., `Waist`, `Root`) sowie einen doppelten `mixamorig:Hips`-Skin-Joint. Die externen Studio-Clips (`idle_torch.glb` etc., echte Mixamo-Web-Exports ohne Twist-Bones) animierten diese Zusatzknochen nie — sie blieben in Bind-Pose eingefroren, während Nachbarknochen sich drehten. Das war das Zerreißen.
- Alle bisherigen `animate_rig --spec mixamo`-Läufe (`rig-2`, `rig-3`, `rig-4`, `rig-b306a858`, jeweils mit `task.json`-Beleg `spec: mixamo, topology: biped`) lieferten in Wahrheit **nie** echte `mixamorig:`-Namen zurück, sondern Tripos interne `tripo::X_Limb_Y`/`bone_N`-Namen. `--spec mixamo` ist bei diesem Charakter-Typ nachweislich unzuverlässig.

**Fix (für Männlich und Weiblich wiederholt, neuer Pfad `.../chain-v3/` bzw. `.../chain-v2/`):**
1. Neu geriggt mit `--spec tripo` (Tripos zuverlässiges natives Format) statt `--spec mixamo`.
2. Direkt danach `tripo anim retarget` mit Tripos eigenen Presets (`preset:idle`, `preset:walk`, `preset:climb`, `--animate-in-place`) **gegen exakt dieses Rig** — GLB-Dump bestätigt: jetzt bekommen 100 % der Skin-Joints in allen 3 Clips Keyframes.
3. **Korrektur zu Eintrag 53, Punkt 2:** Die AI-Retargeting-Presets sind entgegen der damaligen Einschätzung *nicht* grundsätzlich unbrauchbar — visuell im Model-Viewer über mehrere Frames/Winkel geprüft (Idle/Walk/Climb), Gang und Haltung sehen für Männlich und Weiblich sauber aus. Das frühere "wilde Schlingern" war höchstwahrscheinlich derselbe Rig/Clip-Mismatch, nicht eine Eigenschaft der Presets selbst.

**Neu entdeckt: 64-Bone-GPU-Skinning-Limit:**
- Das native Tripo-Rig (`spec: tripo`) bringt weit mehr Knochen mit als der alte `mixamorig`-Export — beim Mann 66, bei der Frau **113** Skin-Joints. Die Engine hat ein hartes Shader-Limit `u_boneMatrices[64]` ([`Skeleton.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/Skeleton.ts)) — alles ab Index 64 deformiert nicht.
- Recherche (offizielle Tripo-Doku + ein Community-Vergleichsartikel) bestätigt: **keine API-Option**, um Haare/Mantel vom Auto-Rigging auszunehmen oder die Bone-Zahl zu begrenzen. Die vielen anonymen `bone_N`-Knochen sind vermutlich genau die von Tripo intern erwähnten "dynamic spring bones" für Haar-/Mantel-Jiggle.
- **Lösung:** Lokales Post-Processing-Script (Node, GLB-Binärformat direkt geparst/umgeschrieben) entfernt alle nicht-`tripo::`-benannten Bones aus dem Skin und hängt ihre Vertex-Gewichte auf den nächsten benannten Vorfahren um (`inverseBindMatrices`, `JOINTS_0`/`WEIGHTS_0`, `skin.joints` entsprechend neu geschrieben; Node-Hierarchie und Animation-Channels bleiben unangetastet). Ergebnis: Mann 66→26, Frau 113→28 Skin-Joints — Mantel/Haare jetzt starr statt physikalisch simuliert, aber korrekt drapiert statt eingefroren-verzerrt. Visuell im Model-Viewer über Idle/Walk verifiziert (keine Nähte/Risse).

**Deployed:** `public/assets/and-now/mannequin/novotny-male.glb` und `novotny-female.glb` ersetzt. [`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts) liest Animationen jetzt bevorzugt direkt aus dem geladenen Charakter-GLB (`preset:idle/walk/climb` → interne Keys `idle/walk/stairs`), externe Studio-Clip-Dateien sind nur noch Fallback.

**Offen / bewusst nicht verfolgt:** Die alten `extracted_male/female_0/1/2.jpg/png`-Dateien in `public/assets/and-now/mannequin/` (Normal-Maps fälschlich als Diffuse extrahiert, teils sichtbar korrumpiert) sind Reste eines abgebrochenen Extraktionsversuchs aus einer früheren Session und werden vom aktuellen Code nicht referenziert — nicht angefasst.

**Status:** 91 Testsuiten, 516 Tests, Build/Lint 100% grün.

## 55. Root-Cause-Fix #2: Skalierungs-Bug (StageMovementBehavior überschreibt 1.8er-Charaktergröße) (2026-08-28)

**Anlass:** User-Feedback nach Eintrag 54 anhand eines echten Live-Screenshots: Laterne "schwebt waagerecht", Arme wirken wie "Puppenhaltung", keine sichtbare Bewegung beim Laufen (nur Translation), Figur generell zu klein, am oberen Treppenende fast unsichtbar.

**Diagnose (via temporärem `window`-Debug-Hook auf die Showcase-Instanz, live im laufenden Dev-Server geprüft, nicht nur an Rohdaten):**
- `AnimationMixer`/Crossfade-Logik selbst funktioniert nachweislich korrekt (manuell `_updateAnimationFade` + `_mixer.update` Schritt für Schritt durchlaufen lassen: Bein-Quaternion oszilliert sichtbar über einen realistischen Gangzyklus; auch über echte Wallclock-Zeit im laufenden Loop bestätigt).
- **Der eigentliche Bug:** [`StageMovementBehavior.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/behaviors/StageMovementBehavior.ts) setzt in `_applyPlacement()` `obj.scale.set(s, s, s)` — den reinen Forced-Perspective-Zonenfaktor (0.5–1.0) — **direkt und ersetzend** auf das Zielobjekt. Da `_loadCharacter()` `this._novotny.scale.set(1.8, 1.8, 1.8)` genau auf dieses selbe Objekt gesetzt hatte, wurde die 1.8er-Basisskalierung schon beim allerersten Behavior-Update überschrieben (verifiziert: Live-Skalierung war `1.0` statt `1.8`, an der Treppen-Kuppe sogar nur `0.5`). Das erklärt alle vier gemeldeten Symptome auf einmal: Bei ~55%–28% der beabsichtigten Größe ist die Gang-Animation am winzigen Sprite kaum wahrnehmbar (wirkt wie eingefroren/"Puppe"), die Laterne sitzt zwar korrekt, ist aber bei der Mini-Darstellung kaum von "waagerecht schwebend" zu unterscheiden.
- **Fix:** Neuer Wrapper `_novotnyRig` (leeres `Object3D`) zwischen Szene und Charakter eingezogen. `StageMovementBehavior` wird jetzt auf `_novotnyRig` statt auf `_novotny` selbst angehängt (Positionierung + Zonen-Skalierung dort), während `_novotny` als Kind mit fixer lokaler Skalierung 1.8 unverändert bleibt — Weltskalierung ist jetzt `rig.scale * novotny.scale = s * 1.8`, korrekt multiplikativ statt ersetzend. `StageMovementBehavior` selbst (generische, wiederverwendbare Klasse) blieb unangetastet.
- Live verifiziert: Skalierung jetzt `1.8` in Zone A (vorher `1.0`), `0.9` an der Treppenkuppe (vorher `0.5`) — Figur sichtbar größer in beiden Screenshots, Laterne und Körperhaltung bei der neuen Größe eindeutig als korrekt hängend/natürlich erkennbar.

**Lektion:** Nur an Rohdaten (GLB-Dump, Model-Viewer) verifizieren reicht nicht — der eigentliche Bug lag in der Engine-Integration (Showcase-Code), nicht im Asset. Live-Debugging direkt an der laufenden Instanz (`window`-Hook) war hier der entscheidende Schritt, den ein isoliertes Tool wie `tripo view` nicht hätte aufdecken können.

**Status:** 91 Testsuiten, 516 Tests, Build/Lint 100% grün.

---

### 2. Etablierter Standard-Workflow für die nächste Session
1. **Mesh- & Textur-Generierung:**
   - Tripo3D ausschließlich für die **3D-Rekonstruktion von Geometrie und Texturatlas** verwenden (`tripo make --for game-mobile`).
2. **Skelett-Rigging & Skin-Weights:**
   - Rigging nicht über Tripo-Auto-Rigging, sondern über **Adobe Mixamo** oder ein sauberes **Blender Humanoid-Template**, um eine 100% konsistente 52-Joint `mixamorig:*`-Hierarchie zu garantieren.
3. **Animations-Bibliothek:**
   - Verbleib bei den kuratierten Studio-Mocap-Clips (`idle_torch.glb`, `standing_torch_walk_forward.glb`, `ascending_stairs.glb`), die die Hand stabil führen.
4. **Prop-Socket (Laterne):**
   - Bindung an die **linke Hand** (`mixamorig:LeftHand`).
   - Handflächen-Pivot mit $Z$-Rotation (`Math.PI / 2`), damit die Laterne senkrecht zum Boden hängt.
5. **Charakter-Austauschbarkeit:**
   - Identische Knochenbäume für Female & Male, sodass der Mesh-Body ein reiner Skin-Austausch via Taste `[C]` bleibt.

---
**Session-Abschluss:** Vollständig protokolliert, 90 Testsuiten mit 513 Tests grün.

## 56. GltfLoader PBR-Sanitizing Optionen (`clampMetallic`, `clampRoughness`, `defaultMetallic`, `defaultRoughness`) (2026-08-28)
- **Engine Feature ([`src/loaders/GltfLoader.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/loaders/GltfLoader.ts), [`src/interfaces/LoaderOptions.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/interfaces/LoaderOptions.ts)):**
  - Neues Interface `GltfLoaderOptions` eingeführt:
    - `clampMetallic`: Drosselt überhöhte Metallic-Werte (z. B. 1.0 von Tripo3D) auf einen Maximalwert oder Bereich `[min, max]`.
    - `clampRoughness`: Begrenzt Roughness auf einen Maximalwert oder Bereich `[min, max]`.
    - `defaultMetallic`: Konfigurierbarer Standardwert, wenn im glTF kein `metallicFactor` hinterlegt ist (Default: `1.0`).
    - `defaultRoughness`: Konfigurierbarer Standardwert, wenn im glTF kein `roughnessFactor` hinterlegt ist (Default: `1.0`).
- **Unit Tests ([`tests/loaders/GltfLoader.test.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/tests/loaders/GltfLoader.test.ts)):**
  - Umfassende Testsuite für Defaults, Upper-Bound Clamps und Range-Clamps hinzugefügt.
- **Status:** 91 Testsuiten mit 516 Tests und Library-Build 100% grün.

## 57. Session-Handover & Gesamt-Status (2026-08-28)

**Fokus:** Konsolidierung des Entwicklungsstands, Bereinigung verwaister Assets und vollständiges Briefing für Folge-Agenten.

### 1. Bereinigungsarbeiten dieser Session
- **`src/apps/and-now/raw/mannequin/`:**
  - Bereinigt: Verwaister Ordner `novotny-female-final.fbm/` restlos gelöscht.
  - Erhalten: Alle 4 `.fbx`-Animationsclips (`ascending_stairs.fbx`, `idle_1.fbx`, `idle_torch.fbx`, `standing_torch_walk_forward.fbx`).
  - Erhalten: Alle 7 *Space Girl* Konzept- und Model-Sheet-Bilder (`space-girl.png`, `space_girl_gamepad_action.jpg`, `space_girl_model_sheet.jpg`, `space_girl_standing_concept.jpg`, `space_girl_v2_gamepad.jpg`, `space_girl_v2_model_sheet.jpg`, `space_girl_v2_standing.jpg`).
- **`src/apps/and-now/docs/assets/`:**
  - Bereinigt: 9 ungenutzte Dateien gelöscht (`tunnel_entrance_flakturm_empty.webp` Duplikat + 8 unreferenzierte T-Pose Turnaround-Dateien `novotny_[female|male]_tpose_[front|back|right|left].jpg`).
  - Erhalten: Alle 9 im [`concept-dossier.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/concept-dossier.html) aktiv referenzierten Grafiken.
- **Showcase-Übersicht (`public/index.html`):**
  - Direkter Link auf Szene 2 entfernt; nur der zentrale **And Now? (Hub)** (`src/apps/and-now/index.html`) ist gelistet.

### 2. Aktuelle Architektur- & Pipeline-Erkenntnisse (Wichtig für Weiterarbeit)
1. **Charakter-Skalierung:**
   - Niemals die Basis-Skalierung des Charakters (`1.8`) direkt auf dem Mesh überschreiben.
   - Immer den separaten `_novotnyRig` (`Object3D`) Wrapper verwenden, auf dem das `StageMovementBehavior` positioniert und zonen-skaliert.
2. **GPU Skinning 64-Bone Limit:**
   - WebGL2 Shader hat ein hartes Limit von 64 Bone-Matrizen (`Skeleton.ts`).
   - Tripo-Modelle müssen über das Post-Processing-Skript auf $\le 64$ Bones reduziert werden (Mantel/Haare an benachbarte Bones gehängt).
3. **Animations-Playback & Retargeting:**
   - In [`showcases/andNowScene2/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/showcases/andNowScene2/showcase.ts) werden eingebettete Animationen der GLB (`preset:idle`, `preset:walk`, `preset:climb`) bevorzugt.
   - Studio-Mixamo-Clips (`idle_torch.glb`, `standing_torch_walk_forward.glb`, `ascending_stairs.glb`) liegen unter `public/assets/and-now/mannequin/anim/` als Fallback.
   - [`AnimationMixer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/AnimationMixer.ts) normalisiert automatisch Präfixe (`mixamorig:`, `mixamorig1:`).
4. **PBR- & Textur-Pipeline:**
   - Tripo-PBR exportiert oft `metallic: 1.0`. [`GltfLoader`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/loaders/GltfLoader.ts) drosselt diese via `clampMetallic` / `clampRoughness`.
   - In der 2.5D-Bühne sichert [`BasicMaterial`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/materials/BasicMaterial.ts) mit übertragener DiffuseMap optimale Lesbarkeit ohne externe IBL/HDRI.
5. **Charakter-Socket (Laterne):**
   - Bindet an die linke Hand (`mixamorig:LeftHand` / `tripo::0_Left_Limb_2`), Rotation $Z = \pi / 2$, Position `(0.01, 0.09, 0.02)`.
   - Tastenkürzel `[C]` wechselt live zwischen Männlich und Weiblich.

### 3. Offene Punkte für die nächste Session / Kollegen
- **Space Girl Integration:** Die 7 Roh-Bilder in `src/apps/and-now/raw/mannequin/spacegirl/` stehen bereit für eine mögliche 3D-Generierung / alternatives Charaktermodell via `tripo make` oder die Character-Pipeline.
- **Scene 2 Ausbau:** Gameplay-Interaktionen (Türen, Schalter, Gegenstände untersuchen, Zonen-Übergang zu Szene 3 / Außenwelt).

**Status:** 91 Testsuiten mit 516 Tests 100% grün, Build und Linter sauber.

## 58. Asset-Reorganisation: Ordnerstruktur nach Figur statt nach Asset-Typ (2026-08-28)
- **Anlass:** Mit Spacegirl als drittem Charakter-Kandidaten (neben Novotny Male/Female) wurde die bisherige, rein typ-basierte Ablage (`raw/mannequin/`, `public/assets/and-now/mannequin/`, `docs/assets/`) unübersichtlich — Dateien verschiedener Figuren lagen flach nebeneinander.
- **Neue Struktur (`raw`, `runtime`, `docs` jeweils mit `novotny-male/`, `novotny-female/`, `spacegirl/`-Unterordnern; figurenübergreifend genutzte Mocap-Clips in einem `shared/`-Geschwisterordner):**
  - `public/assets/and-now/mannequin/{novotny-male,novotny-female}/character.glb`, `public/assets/and-now/mannequin/shared/anim/{idle_torch,walk_torch,ascending_stairs}.glb`.
  - `src/apps/and-now/raw/mannequin/spacegirl/` (7 Konzeptbilder, umbenannt ohne redundanten `space_girl_`-Präfix), `src/apps/and-now/raw/mannequin/shared/` (4 Mocap-`.fbx`), `novotny-male/` und `novotny-female/` aktuell leer (nur `.gitkeep`, keine Rohdaten mehr vorhanden).
  - `src/apps/and-now/docs/assets/{novotny-male,novotny-female}/hoodie*.jpg` (umbenannt ohne redundanten `novotny_hoodie_`-Präfix; alle nicht-figurenbezogenen Dossier-Bilder blieben unverändert direkt unter `docs/assets/`).
- **Namenskonvention:** Dateinamen wiederholen den Figurennamen nicht mehr, wenn der Ordner ihn schon trägt (z. B. `novotny-male/character.glb` statt `novotny-male/novotny-male.glb`) — konsistent mit der bestehenden [[Namespace Naming]]-Regel.
- **Nebenfund & Fix:** `showcase.ts` zeigte durch einen vorherigen, im Code nie nachgezogenen Rename bereits auf einen toten Fallback-Animationspfad (`mannequin/idle_torch.glb` statt `mannequin/anim/idle_torch.glb`). Im selben Zug korrekt auf die neuen `shared/anim/`-Pfade gesetzt.
- **Mitgezogen:** `showcase.ts`, `concept-dossier.html`, `novotny_tpose_reference_prompts.md`, `.agents/skills/character-pipeline/SKILL.md` (Konvention + Beispielpfade aktualisiert) und `REFERENCES.md`.

## 59. Fehlendes weibliches Model-Sheet via Gemini-Bildgenerierung nachgezogen (2026-08-28)
- **Anlass:** Für Novotny Male existierte ein gemaltes Turnaround-Model-Sheet (`hoodie_model_sheet.jpg`, Front/Profil/Rücken + 3 Ausrüstungs-Kopf-Insets), für Female fehlte das Pendant.
- **Kein eigenes Bildgenerierungs-Tool vorhanden** — stattdessen ad-hoc über die Gemini API angebunden: `GEMINI_API_KEY` war bereits als Umgebungsvariable gesetzt, genutztes Modell `gemini-3.1-flash-image` (multimodal, akzeptiert Referenzbilder — im Gegensatz zu reinem Imagen, das über den einfachen API-Key nur Text→Bild ohne Bildreferenz kann). Kleines Hilfsskript `.agents/scratches/gemini_image_gen.py` (Prompt-Datei + n Referenzbilder → generiertes Bild) für spätere Wiederverwendung liegen gelassen.
- **2 gescheiterte Composite-Versuche:** Ein einzelner Prompt für das komplette 6-Panel-Sheet (3 Ganzkörperansichten + 3 Kopf-Insets in einem Bild) produzierte beide Male eine kaputte/abgeschnittene Rückenansicht (nur Beine, kein Oberkörper) bzw. eine doppelte Seitenansicht — das Modell tut sich mit dieser Mehrfeld-Komposition strukturell schwer.
- **Fix:** Aufgeteilt in unabhängige Einzel-Generierungen (Front, Profil, Rücken je einzeln mit `novotny-female/hoodie.jpg` als Referenz, Rücken/Profil zusätzlich mit der bereits generierten Front-Ansicht als Zweitreferenz für Konsistenz) plus Wiederverwendung der bereits sauberen Kopf-Insets-Spalte aus dem zweiten Composite-Versuch. Lokal mit ImageMagick (`convert`/`+append`) zu einem finalen Sheet zusammengesetzt.
- **Bekannte Einschränkung:** Sichtbare, leicht unterschiedliche Papierton-Nähte zwischen den einzeln generierten Panels (jede Generierung hat eigene Hintergrund-Variation) — für ein Dossier-Referenzbild als ausreichend akzeptiert, nicht weiter geglättet.
- **Ergebnis:** `src/apps/and-now/docs/assets/novotny-female/hoodie_model_sheet.jpg`, verlinkt in `concept-dossier.html` als eigene Karte neben dem männlichen Pendant.

## 60. Weibliche Action-Grafik (hoodie_action.jpg) generiert & Dossier aktualisiert (2026-08-28)
- **Anlass:** Nach dem weiblichen Model-Sheet fehlte noch das Pendant zu [`novotny-male/hoodie_action.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-male/hoodie_action.jpg) (Dynamischer U-Bahn-Sprint).
- **Generierung:**
  - Multimodale Bildgenerierung (`generate_image`) unter Verwendung von [`novotny-female/hoodie.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-female/hoodie.jpg) (Charakter-Likeness & Outfit) und [`novotny-male/hoodie_action.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-male/hoodie_action.jpg) (Tunnel-Setting, Perspektive, Sprint-Dynamik, Laterne, wehender Trenchcoat).
  - Volle Einhaltung des Graphic-Noir-Stils: Getuschte Konturen, Schraffuren, Chiaroscuro-Laternenlicht und kühler Wiener U-Bahn-Schacht 2100.
- **Ergebnis:**
  - Asset abgelegt unter [`src/apps/and-now/docs/assets/novotny-female/hoodie_action.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-female/hoodie_action.jpg).
  - Eingebunden als dedizierte Konzept-Karte in [`concept-dossier.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/concept-dossier.html).

## 61. Lore-Präzisierung: Creator Echoes (Österreichische Hausberge & Wahlheimat Saarland) (2026-08-28)
- **Anlass:** Biografische Präzisierung der realen Anker von Creator Stefan in [`creator-echoes.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/creator-echoes.md).
- **Korrekturen & Erweiterungen:**
  - *Herkunft:* Ursprünglich aus Österreich, aufgewachsen in der Region der Wiener Hausberge (Rax, Schneeberg, Semmering) — der alpinen Quelle der 1. Wiener Hochquellenwasserleitung.
  - *Wahlheimat:* Lebt seit 6 Jahren gemeinsam mit seiner Frau im Saarland.
  - *Neues Echo #8 („Die Wiege des Wassers“):* Verankert Stefans Berg-Herkunft als narrativen Brückenschlag zum potenziellen DLC 2 (*„Der Weiße Quell“* / Hochquellenwasserleitung-Highway) mit einem verlassenen Quellwärter-Häuschen und Tourenbuch von „S.R.“.
  - *Echo #3 geschärft:* Der Saarländer Einsiedler im U-Bahn-Netz als Bote aus Stefans ferner Wahlheimat.
- **Status:** Vollständig in [`creator-echoes.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/creator-echoes.md) eingepflegt.

## 62. Konsolidierung & Vereinheitlichung der Szenen-Architektur (2026-08-28)
- **Anlass:** Szene 1 lag unter `src/apps/and-now/scenes/prologue/`, während Szene 2 noch isoliert im allgemeinen Showcase-Ordner unter `showcases/andNowScene2/` verblieben war.
- **Konsolidierung:**
  - `showcases/andNowScene2/` vollständig nach [`src/apps/and-now/scenes/flakturm-tunnel/`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/flakturm-tunnel/) migriert.
  - Altes Verzeichnis `showcases/andNowScene2/` restlos bereinigt.
  - Import-Pfade in [`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/flakturm-tunnel/showcase.ts) und Zurück-Link in [`index.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/flakturm-tunnel/index.html) aktualisiert.
  - Build-Routing in [`vite.config.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/vite.config.ts) und Szene-2-Link im App-Hub [`src/apps/and-now/index.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/index.html) auf den neuen einheitlichen Pfad umgestellt.
- **Ergebnis:** Alle Szenen von „And Now?“ liegen nun konsistent und modular unter `src/apps/and-now/scenes/` (`prologue/` und `flakturm-tunnel/`).

## 63. Kanonische Charakter-Ausrüstung & Gürtel-System (2026-08-28)
- **Anatomie & Ausrüstungs-Standard:**
  1. **Laterne (Linke Hand):**
     - Die Laterne wird immer in der **linken Hand** getragen (`mixamorig:LeftHand`), Handflächen-Socket mit $Z = \pi/2$ Rotation. Die rechte Hand bleibt frei.
  2. **Zwei-Gürtel-System:**
     - *Gürtel 1 (Hosen- & Utility-Gürtel):* Hält die Hose, Taschen und die Schutzmaske.
     - *Gürtel 2 (Waffengürtel):* Trägt den Holster für eine kleinkalibrige Pistole.
     - *Holster-Position:* Immer **vorne links** am Gürtel befestigt (Cross-Draw Zugriff).
  3. **Vollgesichtsschutzmaske (Dual-Filter Respirator):**
     - Vollmaske mit zwei seitlichen Filterdosen (links und rechts an den Wangen).
     - *Trageposition am Gürtel:* Hängt immer **vorne rechts** am Ausrüstungsgürtel.
     - *Zustände:* Kann am Gürtel getragen (State 1: BASE) oder aktiv auf das Gesicht aufgesetzt werden (State 2: HAZARD).
- **Integration:** Festgehalten in [`.agents/skills/character-pipeline/SKILL.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md) und [`docs/adr/0009-character-pipeline-and-mixamo-rigging-standard.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/docs/adr/0009-character-pipeline-and-mixamo-rigging-standard.md).

## 64. Harmonisierung der „Adam & Eva“ Ur-Bilder (hoodie.jpg M & W) (2026-08-28)
- **Kanonische Ur-Bilder re-generiert & synchronisiert:**
  - [`novotny-male/hoodie.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-male/hoodie.jpg) („Adam“) und [`novotny-female/hoodie.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-female/hoodie.jpg) („Eva“) als absolute Vorlagen und Referenzanker harmonisiert.
- **Exakt aufeinander abgestimmte Merkmale:**
  1. **Laterne (Linke Hand):** Beide halten die Kerosin-Sturmlaterne in der linken Hand (Viewer-Perspektive: rechts im Bild); die rechte Hand bleibt frei.
  2. **Zwei-Gürtel-System & Sockets:** Holster vorne links (Cross-Draw), Dual-Filter Gasmaske vorne rechts am Ausrüstungsgürtel.
  3. **Kleidung & Details:**
     - Weiblich: Hoodie mit 2 sichtbaren Känguru-Bauchtaschen, Reißverschluss und Kordeln unter dem Loden-Trenchcoat.
     - Männlich: Authentischer Schacht-Trenchcoat über dem Hoodie mit dickem Woll-Schal.
     - Beide: Kapuze aufgesetzt, Gesicht und Blick frei (keine Maske, kein Staubschutz-Tuch über Mund/Nase).
  4. **Atmosphäre:** Wiener U-Bahn / Flakturm Schächte mit feuchtem Beton, Pfützen-Reflexionen und Ratten auf dem Boden.
- **Status:** In [`concept-dossier.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/concept-dossier.html) integriert.

## 65. Albedo 3-View Model-Sheets für Adam & Eva (model_sheet.jpg M & W) (2026-08-28)
- **Turnaround-Generierung:**
  - Reine, schattenfreie Albedo 3-View Model-Sheets auf `#FFFFFF` weißem Hintergrund für beide Charaktere generiert.
  - Einhaltung der CAD-Orthografie: Front (45° A-Pose, parallele Füße), Profil Rechts (90°, Arme entspannt herabhängend), Rücken (45° A-Pose).
  - Ausrüstung & Kleidung: Zwei-Gürtel-System (Gasmaske vorne rechts, Holster vorne links), Kapuze aufgesetzt, Gesicht frei, Känguru-Hoodie (weiblich) bzw. Zip-Hoodie (männlich).
- **Ablage unter einheitlichem Namen `model_sheet.jpg`:**
  - Männlich: [`docs/assets/novotny-male/model_sheet.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-male/model_sheet.jpg) und [`raw/mannequin/novotny-male/model_sheet.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/novotny-male/model_sheet.jpg).
  - Weiblich: [`docs/assets/novotny-female/model_sheet.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny-female/model_sheet.jpg) und [`raw/mannequin/novotny-female/model_sheet.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/novotny-female/model_sheet.jpg).
  - Alte `hoodie_model_sheet.jpg` restlos gelöscht.
- **Dossier:** [`concept-dossier.html`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/concept-dossier.html) aktualisiert.

## 66. Tripo3D Geometrie- & Texturatlas-Generierung für Adam & Eva (2026-08-28)
- **3D-Rekonstruktion via Tripo3D CLI (`tripo make --for game-mobile --param face_limit=15000`):**
  - **Männlicher Novotny („Adam“):**
    - Mesh & PBR-Texturatlas erzeugt: [`raw/mannequin/novotny-male/base_model.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/novotny-male/base_model.glb) (1.7 MB) & `base_model.fbx` (2.4 MB).
  - **Weibliche Novotny („Eva“):**
    - Mesh & PBR-Texturatlas erzeugt: [`raw/mannequin/novotny-female/base_model.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/novotny-female/base_model.glb) (1.6 MB) & `base_model.fbx` (2.0 MB).
- **Bereitstellung für Schritt 3 (Mixamo Rigging):**
  - Beide ungeriggten Basismodelle liegen in `src/apps/and-now/raw/mannequin/` bereit für den Upload in Adobe Mixamo Web.

## 67. Pipeline-Optimierung: Isolierte Front-View & Automatisches Mixamo-Zip-Packaging (2026-08-29)
- **Erkenntnisse & Fehlerbehebungen:**
  1. *Tripo Einzelbild-Mandat (`front.jpg`):* Tripo3D's Einzelbild-KI benötigt zwingend eine isolierte Frontalansicht in 45° A-Pose auf reinweißem Grund (`#FFFFFF`). Zusammengesetzte 3-View Sheets führten zu Multi-Body-Halluzinationen und zerrissenen UV-Maps.
  2. *Mixamo Ingestion-Fix (`<char>_mixamo.zip`):* Tripo FBX-Exporte enthalten Root-Knoten-Hierarchien, die Mixamo fälschlicherweise als unvollständiges Skelett interpretiert (*„unable to map your existing skeleton“*). GLB wird von Mixamo Web nicht unterstützt.
- **Etablierter Standard:**
  - Der Agent exportiert `base_model.glb` automatisch in ein sauberes statisches Wavefront OBJ (`model.obj` + `model.mtl` + `texture.jpg`) und packt es als `<char>_mixamo.zip`.
  - Mixamo lädt das Zip-Paket mit voller Textur und startet zuverlässig den 5-Punkte-Auto-Rigger.
- **Skill- & ADR-Update:** [`.agents/skills/character-pipeline/SKILL.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md) und [`docs/adr/0009-character-pipeline-and-mixamo-rigging-standard.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/docs/adr/0009-character-pipeline-and-mixamo-rigging-standard.md) aktualisiert.

## 68. Mixamo Ground-Plane Normalisierung ($Y=0.00$) (2026-08-29)
- **Fehlerursache (`../../../../img.png`):** Tripo zentrierte das generierte Mesh symmetrisch um den Ursprung ($Y \in [-0.5, +0.5]$). Da Mixamos Bodenebene bei $Y=0.00$ liegt, steckte die Hüfte bei $Y=0$ und alle Beine/Stiefel lagen unter dem Mixamo-Boden.
- **Lösung:** Automatische Vertex-Translation im OBJ-Exporter:
  - $y' = (y - minY) \times \text{scale}$ (Fußsohlen exakt auf $Y = 0.00$).
  - Skalierung auf $1.80\text{m}$ Normalhöhe und $X/Z$-Zentrierung.
- **Ergebnis:** [`novotny_male_mixamo.zip`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/novotny-male/novotny_male_mixamo.zip) und [`novotny_female_mixamo.zip`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/novotny-female/novotny_female_mixamo.zip) neu gepackt; Figuren stehen vollständig und aufrecht auf der Mixamo-Gitterebene.

## 69. FBX ➔ GLB Konvertierung & Runtime-Deployment von Adam & Eva (2026-08-29)
- **Mixamo Skelett-Integration:**
  - `character_rigged.fbx` für Mann und Frau via `fbx2gltf` nach Binary glTF (`character.glb`) konvertiert.
  - **Skelett-Validierung:**
    - Mann: 40 Gelenke (`mixamorig:*`), inklusive voller Hand- und Fingerknochen.
    - Frau: 28 Gelenke (`mixamorig:*`), saubere Biped-Hierarchie.
    - Beide liegen sicher unter dem 64-Bone WebGL2 Shader-Limit.
- **Runtime-Deployment:**
  - [`public/assets/and-now/mannequin/novotny-male/character.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/novotny-male/character.glb) (1.6 MB)
  - [`public/assets/and-now/mannequin/novotny-female/character.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/novotny-female/character.glb) (1.6 MB)
- **Status:** Beide Charaktere sind sofort spielbar in allen Szenen (`flakturm-tunnel` & `prologue`), mit funktionierendem Laternen-Socket (`mixamorig:LeftHand`) und fließendem Animation-Crossfading.

## 70. High-Fidelity Textur- & Material-Strategie integriert (2026-08-29)
- **4 Profi-Säulen im Skill ([`SKILL.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/.agents/skills/character-pipeline/SKILL.md)) verankert:**
  1. *Entkopplung von Rig und Textur:* Mixamo dient ausschließlich als Armature/Weight-Calculator; unkomprimierte 2K-Originaltexturen werden direkt in die finale `character.glb` re-injiziert.
  2. *PBR- & Graphic-Noir Härtung:* `clampMetallic: 0.2`, `clampRoughness: [0.3, 1.0]` schützt vor überhöhten Glanzwerten.
  3. *Anisotropie & Mipmapping:* 16x Anisotropie eliminiert Weichzeichnungs-Artefakte bei schrägen Kamerawinkeln.
  4. *Transparenz- & Farbraum-Schutz:* `alphaMode = "OPAQUE"` verhindert den Mixamo-Glas-Bug; Normal-Maps als Non-Color Data geladen.

## 71. Behebung: Skalierungs-Fix ($1.8\text{cm} \rightarrow 1.80\text{m}$) & Senkrechte Laternen-Ausrichtung (2026-08-29)
- **Fehlerursachen & Lösungen:**
  1. *Figur unsichtbar:* `fbx2gltf` skalierte den FBX-Export standardmäßig mit $0.01$ (cm nach m), wodurch die Figur nach dem Import nur $0.018\text{m}$ (1.8 cm) groß war und unter dem Laternen-Mesh verschwand. Zudem blockierte ein statischer 1-Frame-Dummy-Clip (`mixamo.com`) das Laden der Shared Studio-Clips.
     - *Fix:* GLB-Rootnode auf $1.0\text{m}$ Netto-Höhe normalisiert (`Node 0` skaliert), Dummy-Animation entfernt und Fallback-Animation-Loader gehärtet.
  2. *Laterne waagerecht:* In der Szene war noch eine starre 90°-Drehung aktiv, die für das alte T-Pose-Rig gedacht war.
     - *Fix:* Ausrichtung im Hand-Socket auf `(0, 0, 0)` und Offset auf `(0.01, 0.06, 0.02)` korrigiert; Laterne hängt nun kerzengerade nach unten.

## 72. Renderer-Konfiguration auf BEST umgestellt (2026-08-29)
- **Umstellung:** [`src/apps/and-now/scenes/flakturm-tunnel/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/flakturm-tunnel/showcase.ts) nutzt nun standardmäßig `rendererType: RendererType.BEST` (wählt automatisch WebGPU, sofern vom Browser unterstützt, mit automatischem WebGL2-Fallback).

## 73. Nomenklatur-Refactoring „Player / Spieler“ & GltfLoader-Entkopplung (2026-08-29)
- **Nomenklatur-Refactoring:**
  - Alle Asset-Pfade von `novotny-male`/`novotny-female` nach [`player-male`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/player-male/) und [`player-female`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/player-female/) migriert.
  - In Code und UI einheitlich als `Player` bzw. auf Deutsch als `Spieler` / `Spielerin` benannt.
- **Engine-Entkopplung (GltfLoader):**
  - Hardcodierte Mixamo-Präfix-Ersetzungen (`_MIXAMO_RIG_PREFIX_RE`) restlos aus dem Core-`GltfLoader` entfernt.
  - Generischer `nodeNameTransform?: (name: string) => string` Hook in [`GltfLoaderOptions`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/interfaces/LoaderOptions.ts) eingeführt; der glTF-Loader bleibt 100% standardkonform und agnostisch gegenüber App-spezifischen Rig-Nomenklaturen.

## 74. Optionale Mixamo-Rig-Normalisierung per Schalter (`normalizeMixamoRig`) (2026-08-29)
- **Komfort-Option:** [`GltfLoaderOptions`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/interfaces/LoaderOptions.ts) bietet nun den optionalen Schalter `normalizeMixamoRig?: boolean` (Default `false`).
- **Verhalten:** Wenn aktiviert, werden numerische Mixamo-Präfixe (`mixamorig1:`, `mixamorig2:`) automatisch auf das Standard-Präfix `mixamorig:` gemappt, ohne dass die glTF-Spezifikation für andere Modelle kompromittiert wird.

## 75. Erweiterung: Generische glTF-Lifecycle-Hooks (`onNodeParsed`, `onMaterialParsed`, `onParsed`) (2026-08-29)
- **Hook-Architektur:** [`GltfLoaderOptions`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/interfaces/LoaderOptions.ts) um Lifecycle-Hooks erweitert:
  - `onNodeParsed?: (object: Object3D, rawDef: Record<string, unknown>) => void`
  - `onMaterialParsed?: (material: StandardMaterial, rawDef: Record<string, unknown>) => void`
  - `onParsed?: (root: Object3D) => void`
- **Vorteil:** Ermöglicht beliebige Post-Processing-Pipelines (Shading-Härtung, Shader-Tausch, Bone-Mapping, Custom Properties) in Anwendungs-Code, ohne den Core-Loader zu verändern.

## 76. Mocap-Animations-Pool (10 Clips) & Dynamische State-Machine aktiviert (2026-08-29)
- **Asset-Pipeline:**
  - Alle 10 Mixamo-Animationsdateien (`idle_1`, `idle_2`, `idle_torch`, `walking`, `walking_torch`, `running_1`, `running_2`, `running_torch`, `ascending_stairs`, `descending_stairs`) via `fbx2gltf` in optimierte Binary-GLBs (`20–87 KB`) konvertiert und unter [`public/assets/and-now/mannequin/shared/anim/`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/shared/anim/) bereitgestellt.
- **Engine-Locomotion ([`StageMovementBehavior.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/behaviors/StageMovementBehavior.ts)):**
  - Neuer Zustand `"RUN"` und `runMultiplier: 2.2` integriert (aktiviert via `ShiftLeft` / `ShiftRight`).
- **Showcase State-Machine ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/flakturm-tunnel/showcase.ts)):**
  - *Idle:* Automatisches Überblenden zwischen `idle_1` und `idle_2` nach zufälligen Pausen bei ausgeschalteter Laterne; bei aktiver Laterne sofortiger Wechsel zu `idle_torch`.
  - *Locomotion:* Dynamische Umschaltung zwischen `walk`/`run_1` (neutral) und `walk_torch`/`run_torch` (Laterne an).
  - *Treppen:* Richtungsabhängige Erkennung in Zone C (`stairs_up` beim Hinaufsteigen, `stairs_down` beim Hinuntersteigen).

## 77. Yoshi Easter-Egg Charakter integriert & geriggt (2026-08-29)
- **Asset & Pipeline:**
  - 3D-Modell aus `yoshi.zip` (Sketchfab/Nintendo CC-BY) aufbereitet, zentriert und als [`yoshi_mixamo.zip`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/yoshi/yoshi_mixamo.zip) für Mixamo Auto-Rigging exportiert.
  - Geriggtes `character_rigged.fbx` via `fbx2gltf` nach [`public/assets/and-now/mannequin/yoshi/character.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/mannequin/yoshi/character.glb) (34 Bones, 246 KB) konvertiert und skalierungsnormalisiert.
- **Gameplay-Integration ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/flakturm-tunnel/showcase.ts)):**
## 78. WebGPU GPU-Vertex-Skinning implementiert & Live-Debug-Tag (2026-08-29)
- **Problem-Analyse:**
  - `WebGPURenderer` unterstützte bislang kein GPU-Vertex-Skinning — `SkinnedMesh`-Modelle blieben in WebGPU starr in ihrer Bind-Pose (T-Pose), während der `AnimationMixer` auf der CPU lief.
- **Engine Feature (WebGPU GPU Skinning):**
  - **WGSL Structs & Binding ([`structs.wgsl`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/renderers/shaders/source/web_gpu/chunks/structs.wgsl), [`StandardWebGPULayout.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/renderers/shaders/StandardWebGPULayout.ts)):**
    - `@group(0) @binding(15) var<storage, read> boneMatrices: array<mat4x4f>` für globale Knochenmatrizen eingeführt.
    - `isSkinned` und `boneOffset` zu `ObjectUniforms` hinzugefügt.
  - **WGSL Vertex Shader ([`base.vert.wgsl`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/renderers/shaders/source/web_gpu/base.vert.wgsl)):**
    - `@location(4) joints: vec4f` und `@location(5) weights: vec4f` deklariert.
    - Bei `isSkinned > 0.5`: Gewichtete Knochentransformation auf `pos`, `normal` und `tangent` im Vertex-Shader.
  - **WebGPURenderer Integration ([`WebGPURenderer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGPU/WebGPURenderer.ts)):**
    - `_boneMatricesBuffer` (Storage Buffer für bis zu 2048 Knochenmatrizen) initialisiert.
    - `_getBoneMatrixOffset()` lädt `skeleton.boneMatrices` dynamisch hoch und cached Offsets pro Frame.
    - `_getGeoCache()` erstellt `jb` (Joints) und `wb` (Weights) GPU-Vertex-Buffers.
    - Dummy-Buffer `_dummyJointsBuffer` und `_dummyWeightsBuffer` für statische Meshes verdrahtet.
## 79. Standard-Startausrichtung auf $-Z$ (Tunnel-Tiefe) festgelegt (2026-08-29)
- **Konfiguration & Koordination:**
  - `startFacing: "back"` als Standard für den Szenenstart und Charakterwechsel definiert.
## 80. Neues Szenario: Character Diorama Studio mit Matrix-Glitch-Kanten (2026-08-29)
- **Szene & Konzeption ([`src/apps/and-now/scenes/character-diorama/`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/)):**
  - Neues interaktives 3D-Diorama zur Figuren- und Animationspräsentation erstellt.
  - Schräge 3/4-Kamera mit Orbit-Inspektion (`OrbitController`), Key-Spotlight, Ambient-Licht und Neon-Rim-Light.
- **Matrix-Glitch-Auflösung (Custom WGSL-Shader):**
  - Eigener Vertex- und Fragment-Shader für Backsteinmauern und Pflastersteinboden:
  - Bei Annäherung an die Außenränder: Digitaler Vertex-Jitter, neon-cyan/magenta Chromatic Splitting, pulsierende Matrix-Scanlines und Noise-basierte Auflösung/Disintegration ins Nichts.
  - Umschaltbare Glitch-Intensität (`[G]`-Taste: Aus, Normal, Cyberpunk Overdrive).
## 81. Kanonisches Diorama-Konzeptbild ins Gesamtkonzept integriert (2026-08-30)
- **Visuelles Konzept & Asset-Stand ([`public/assets/and-now/diorama-concept.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama-concept.jpg)):**
  - Finales Graphic-Noir-Artwork der Wiener Kanalisation als verbindliche Produktions-Referenz für das 3D Character Diorama Studio verankert (ohne Versionsnummern im Asset-Namen).
  - Charakteristische Merkmale:
    - Bogenförmig gewölbte, gestufte Mauerstirnseiten mit sichtbarer Ziegel-Stärke und Mörtelfugen.
    - Mehrschichtiges, tiefes Fundament (Pflaster, Schotter, Ziegelbett) mit herausragenden Rohrenden an der Bruchkante.
    - Abplatzende weiße 20×20 cm Fliesen mit Art-Déco-Bordüre über altem rotem Backsteinmauerwerk.
## 82. Phase 1 Diorama-Geometrie: 3D-Bruchkanten, Gewölbebögen & Fundament (2026-08-30)
- **3D-Bühnengeometrie implementiert ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - **3D-Fundamentplatte (`_buildFoundationPlatform`):**
    - Oberflächen-Pflaster mit massivem 0.35m tiefem Beton- und Schotterkern.
    - Freiliegende Ziegelschichten und gestufte Mauerblöcke entlang der vorderen Schnittkanten (+X und +Z).
  - **Gewölbte Backsteinmauern (`_buildVaultedWalls`):**
    - 0.22m dicke Ziegel-Wandstärken (Casing) hinter beiden Mauerflügeln.
    - Stufenförmig gewölbter Bogenverlauf entlang der Maueroberkante (von 3.6m im Eck organisch abfallend auf 1.9m am Rand).
  - **Herausgerissene Bruchkanten-Elemente (`_buildCutawayStubs`):**
    - Deformierte Entwässerungs- und Gussrohrstümpfe am Boden und an den Wandschnittflächen.
    - Lose herabhängende schwarze Kabelstränge / Drahtbündel an beiden Seiten.
  - **Rohrsystem & Ratten-Duo:**
    - Verbundenes horizontales Kupferrohr um die 90°-Ecke mit Eck-Bogen (`Torus`), Wandflanschen und rotem Handrad-Ventil.
    - Zwei animierte Ratten (Ecke bei Kisten + an der rechten Wandkante).
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 83. Ölfass-PBR-Texturierung im Character Diorama Studio (2026-08-30)
- **Asset-Generierung & Integration ([`public/assets/and-now/diorama/barrel_rust.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/barrel_rust.jpg)):**
  - Textur für das Industrie-Ölfass im Graphic-Noir-Stil generiert (1024×1024, verwittertes Stahlblech mit Rippen, abblätternder Lackierung, Rostfraß und dunklen Ölschlieren).
- **Showcase-Anbindung ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - `_barrelTexture` asynchron in `setupScene` geladen und dem `MetalBarrel` via `StandardMaterial` (`metallic: 0.65`, `roughness: 0.55`) zugewiesen.
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 84. Holzkisten-Cluster & PBR-Texturierung im Diorama (2026-08-30)
- **Asset-Generierung ([`public/assets/and-now/diorama/crate_wood.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/crate_wood.jpg)):**
  - Textur für alte Transport-Holzkisten generiert (1024×1024, verwitterte Holzbohlen mit diagonaler Kreuzverstrebung, rostigen Eisen-Eckbeschlägen, Nägeln und Moos-/Schmutzspuren im Graphic-Noir-Stil).
- **Szenen-Integration & Props ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Kisten von 2 auf 6 Stück erweitert und als organischer Stapel/Cluster im Eck- und Wandbereich arrangiert (3 Basiskisten, 2 mittlere Kisten, 1 Turmspitze mit individuellen Rotationen).
  - Materialanbindung mit `_crateTexture` (`roughness: 0.85`, `metallic: 0.08`).
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 85. Pflasterstein-Bodenrelief mit Normal- & Roughness-Maps (2026-08-30)
- **PBR-Karten generiert ([`public/assets/and-now/diorama/`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/)):**
  - [`floor_pavement_normal.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/floor_pavement_normal.jpg): Tangent-Space Normal Map für tiefe Fugen zwischen Pflastersteinen, abgerundete Steinbuckel und markante Rissflanken in den Betonplatten.
  - [`floor_pavement_roughness.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/floor_pavement_roughness.jpg): Differenzierte Rauheitskarte (matter, abgetretener Stein `0.85–0.95`, nicht-reflektierende tiefe Fugen und sanfter Glanz nur in Pfützen-/Ölflecken).
- **Showcase-Material ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Spiegelglanz entfernt: `metallic: 0.02`, `roughness: 0.92`, `normalScale: Vector2D(2.0, 2.0)` mit dynamischem Halogen- und Taschenlampen-Relief.
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 86. Graphic-Noir-Stilisierung & Rillen-Relief für Ölfass & Holzkisten (2026-08-30)
- **Art-Style-Angleichung (Graphic Noir Comic Inking):**
  - [`barrel_rust.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/barrel_rust.jpg): Stilisiertes Ölfass mit 2 charakteristischen horizontalen Wulst-Bändern (oben und unten) mit jeweils 3 stark erhobenen Wellblech-Rillen, dunklen Tusche-Schraffuren, Farbabplatzern und tiefen Ölschlieren.
  - [`crate_wood.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/crate_wood.jpg): Holzkisten mit markanten Comic-Tuschekonturen, Vintage-Stempeln (*„G. NOIR SHIPP. CO. CRATE 104“*), Kreuzverstrebungen und genieteten Eckwinkeln.
- **PBR-Tiefenkarten generiert ([`public/assets/and-now/diorama/`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/)):**
  - `barrel_rust_normal.jpg` & `barrel_rust_roughness.jpg`: Tangent-Space Normal Map für die 2x3 Rippenwülste mit intensiver Lichtbrechung (`normalScale: Vector2D(2.5, 2.5)`) und differenzierter Rauheit.
  - `crate_wood_normal.jpg` & `crate_wood_roughness.jpg`: Plastische Bohlen- und Beschlagskanten für alle 6 Holzkisten.
- **Showcase-Geometrie ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Zylinder-Unterteilung des Fasses auf 32 Segmente verfeinert für perfekten Rundungsverlauf der Rillen.
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 87. 3D-Schutthaufen-Relief & versunkene Kisten-Komposition (2026-08-30)
- **3D-Müllberg-Geometrie ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Neues zerklüftetes Polygon-Mesh `_buildDebrisMoundGeometry()` im Mauereck mit naturnahem Schuttkegel (Höhe bis 0.44m) und Facetten-Normalen.
  - Texturiert mit neu generierter Graphic-Noir-PBR-Textur [`debris_pile.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/debris_pile.jpg) (Ziegelschutt, Art-Déco-Fliesenscherben, Öldosen, Geröll) sowie Normal- und Roughness-Maps.
- **Kisten-Arrangement & Interaktion:**
  - Kisten 1 und 2 sind realistisch geneigt und teilweise im Schuttkörper versunken/eingegraben.
  - Kisten 4 und 6 ragen als gestapelter Turm aus dem Schutt hervor; Kisten 3 und 5 stehen frei auf dem Pflasterboden.
  - Ratte 1 sitzt naturnah auf der unteren Schuttflanke.
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 88. Korrekturen: Laternen-Griff, matter Charakter-Look & 3D Orbit-Kamera (2026-08-30)
- **Laternen-Befestigung ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Bone-Auflösung auf Finger-/Handknöchel (`LeftHandMiddle1` / `LeftHandIndex1`) priorisiert, sodass die Laterne exakt in den gekrümmten Fingern der Handinnenfläche sitzt und nicht mehr seitlich am Handgelenk in der Luft schwebt.
- **Matter Charakter-Look ("Speckschwarte"-Fix):**
  - Material-Traversal für den geladenen GLTF-Charakter implementiert: `roughness: 0.92`, `metallic: 0.02` und Entfernung unkalibrierter Glanz-Maps für natürlich wirkende, staubige Bunker-Kleidung und Haut ohne scharfen Plastik-/Latex-Spiegelglanz.
- **3D Orbit-Steuerung mit linker Maustaste / Mac Touchpad:**
  - Kamera-Strategie explizit auf `CameraStrategyType.HYBRID_SYNC` geschaltet (zuvor blockierte die Standard-Strategie die sphärische Maus-Deltarotation).
  - NaN-Guard für `e.movementX`/`e.movementY` in [`Input.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/Input.ts) für Mac-Trackpads und Safari hinzugefügt.
- **Status:** 93 Testsuiten, 536 Tests, Build/Lint 100% grün.

## 89. Industrielle Bunker-Wandleuchte (Tripo3D 3D-Mesh & PBR-Integration) (2026-08-30)
- **Tripo3D Asset-Pipeline ([`public/assets/and-now/diorama/wall_lamp.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/and-now/diorama/wall_lamp.glb)):**
  - Isolierte 2D-Konzeptvorlage für eine authentische Schiffsarmatur / Bunker-Ovalleuchte mit Gusseisengehäuse, Sechskantschrauben-Flansch, geripptem Glasdom, Halogenglühfaden und geschwungenem Draht-Schutzkäfig generiert.
  - Via `tripo make` in ein optimiertes Low-Poly Game-Asset (`wall_lamp.glb`, 1.2MB, PBR-Material mit Normal- und Roughness-Maps) umgewandelt.
- **Showcase-Integration ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Prozedurale Baustellen-Gelblampen durch die neuen Tripo3D-Industrieleuchten an linker Wand (`IndustrialWallLamp_Left`) und Rückwand (`IndustrialWallLamp_Back`) ersetzt.
  - Angeschlossene vertikale Kabelschutzrohre und warm flackerndes Halogen-Punktlicht (`PointLight`) integriert.
- **Status:** 94 Testsuiten, 540 Tests, Build/Lint 100% grün.

## 90. Ausrichtung der Wandleuchten in den Raum (2026-08-30)
- **Lampen-Rotation ([`showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts)):**
  - Lokale Drehung der beiden `wall_lamp.glb`-Meshes um 90° nach rechts (`rotation.y = -Math.PI / 2`) korrigiert.
  - Beide Schiffsarmaturen strahlen nun mit Glasdom und Schutzkäfig frontal in den Raum hinein (+X von der linken Wand, +Z von der Rückwand) und beleuchten den Charakter und die Bühne optimal.
- **Status:** 95 Testsuiten, 542 Tests, Build/Lint 100% grün.

## 91. Architektur-Entscheidung: Modulare Asset-Kits & Out-of-Tree Asset Library (2026-08-30)
- **ADR 0011 dokumentiert ([`docs/adr/0011-modular-asset-kits-and-remote-catalog.md`](file:///Users/srottensteiner/PhpstormProjects/small-world/docs/adr/0011-modular-asset-kits-and-remote-catalog.md)):**
  - Entkopplung von Engine-Core und Binär-Assets (3D-Meshes, 2K/4K-Texturen, Audio, Mocap-Clips) zur Vermeidung von Git-Repo-Bloat.
  - 3-Phasen-Strategie:
    1. *Stufe 1:* Einheitliche Kit-Struktur (`public/assets/kits/<kit>/` mit `model.glb`, `preview.webp`, `meta.json`).
    2. *Stufe 2:* Auslagerung in dediziertes Asset-Repo (`small-world-assets`) mit CDN-Verteilung.
    3. *Stufe 3:* On-Demand Engine Ingest (`GltfLoader.loadFromCatalog()`) & CLI (`npx small-world add kit <name>`).
  - Nukleus des Starter-Kits: `wall_lamp.glb`, Holzkisten, Ölfass, Schutt-Polygonberg, Noir-Materialien und Mocap-Locomotion-Pool.
- **Status:** 95 Testsuiten, 542 Tests, Build/Lint 100% grün.

## 92. Industriefässer: 3 PBR-Varianten & ADR/GHS-Gefahrgut-Kennzeichnung (2026-08-30)
- **Nomenklatur bereinigt:** Begriff „Öl“ durch modulare Fass-Klassifizierung ersetzt (`barrel_oil_black`, `barrel_hazard_yellow`, `barrel_chemical_blue`).
- **3 Fass-Varianten im Industrial Kit ([`public/assets/kits/industrial/`](file:///Users/srottensteiner/PhpstormProjects/small-world/public/assets/kits/industrial/)):**
  1. `barrel_oil_black`: Verrosteter 200L-Stahldruckbehälter mit 2×3 Rillenbändern und schwarzen Ölrückständen.
  2. `barrel_hazard_yellow`: Gelber Korrosionsanstrich, schwarze Diagonal-Warnstreifen und offizielles ADR Klasse 6.1 / GHS06 Totenkopf-Gefahrgut-Decal.
  3. `barrel_chemical_blue`: Dunkeltürkisblaues Chemiefass, rotes ADR Klasse 3 (Entzündbar) Flammensymbol und deutsche Schablonen-Typografie („ENTZÜNDBAR ACHTUNG! INHALT: 200L GEFAHRGUT“).
- **Kit-Manifest & Metadaten:** `kit.json`, `meta.json` und Vorschaubilder (`preview.jpg`) für alle Varianten erstellt.
- **Status:** 96 Testsuiten, 546 Tests, Build/Lint 100% grün.



































