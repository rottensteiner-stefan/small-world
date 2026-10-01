# Diskussionsphase — Regeln für den Diskussionszug

Ausgelagert aus `SKILL.md` (Abschnitt 5 Step 2 und Abschnitt 10.2–10.5). Gilt in der Phase zwischen Startschuss und Konsens/Deadlock. Teil A gilt in beiden Modi, Teil B nur im Modus `decide`, Teil C nur bei Selbst-Planung (Modus `plan`, 1 Agent). Querverweise („Abschnitt N“, „Step N“, „10.x“) beziehen sich auf `SKILL.md`.

---

## Teil A — Diskussionszug (beide Modi)

### Überlegung & Beitrag zum Topic (Step 2)
1. Das gesamte `<topic>.<ext>` lesen, um den vollen Kontext aller bisherigen Runden und Argumente zu haben.
   - **Wachstumsgrenze — zweiphasig, nie unilateral:** Jedes Mal das *ganze* Dokument zu lesen skaliert nicht, denn jede Runde fügt nur Text hinzu. Komprimieren würde aber das wörtliche Protokoll verändern, deshalb darf ein einzelner Agent nicht allein entscheiden, dass das unbedenklich ist. Überschreitet das Topic-Dokument etwa 10 Runden (oder wird es spürbar teuer/unhandlich zu lesen), läuft es in zwei Phasen, statt sofort etwas zusammenzuschieben:
     - **Phase 1 (vorschlagender Agent):** Einen Block `## [COMPACTION_PROPOSAL] Runden 1–<N>` anhängen mit dem vorgeschlagenen Text für `## Kompakte Zusammenfassung` (nur wichtige Entscheidungen, offene Fragen, weiterhin gültige Einwände, offene `[TEAM_QUESTION]`s und die aktuellen Evidenz-Tags) — die ursprünglichen `## Round <n>`-Abschnitte bleiben unverändert stehen. Einen ungelösten `[OBJECTION]`/`[VETO]` nie so einarbeiten, als wäre er erledigt — er muss wörtlich in der vorgeschlagenen Zusammenfassung erscheinen.
     - **Phase 2 (jeder andere Agent, in seinem nächsten Zug):** Den offenen `[COMPACTION_PROPOSAL]` ausdrücklich prüfen, bevor etwas anderes geschrieben wird. Entweder mit `[COMPACTION_AGREED: <AgentName>]` unterschreiben (nichts Wesentliches geht verloren) oder mit `[COMPACTION_OBJECTION: <AgentName>] <Grund>` ablehnen (Wesentliches ginge verloren) — eine Ablehnung bricht den Vorschlag ab; die Originalrunden bleiben, und niemand darf dieselbe Zusammenfassung unverändert erneut vorschlagen.
     - Erst wenn **jedes** andere Roster-Mitglied `[COMPACTION_AGREED]` unterschrieben hat, darf der *nächste* schreibende Agent die ursprünglichen `## Round <n>`-Abschnitte im Topic-Dokument durch die vereinbarte Zusammenfassung ersetzen. **Die Originalrunden werden dabei nie gelöscht, sondern unverändert nach `<topic>.archive.md` (gleiches Verzeichnis) verschoben** — das wörtliche Protokoll bleibt erhalten, nur der Leseaufwand pro Zug sinkt. Die Zusammenfassung verweist auf die Archivdatei. Bis dahin wird weiter jedes Mal das ganze Dokument gelesen — ein offener Komprimierungsvorschlag ist kein Grund, irgendetwas auszulassen.
2. Beitrag formulieren:
   - Ungültige Annahmen mit konstruktivem Widerspruch hinterfragen.
   - Konkrete Fragen früherer Agenten und offene Fragen an die Runde beantworten.
   - Lösungen vorschlagen (je nach Thema Architektur, Code, Konzept, Argumentation oder Handlungsoption).
   - **Fragen, Wünsche & Ideen „in die Runde werfen“ (verbindliche Antwortpflicht):**
     - Ein Agent kann eine Frage, einen Wunsch, eine Architektur-Idee oder Anregung allgemein in die Runde stellen, ohne einen bestimmten Teilnehmer anzusprechen (z. B. via `[TEAM_QUESTION: <Titel>]` oder `Frage an die Runde:`).
     - **Verbindliche Antwortpflicht:** Fordert der Agent eine Rückmeldung ein, ist **jeder** andere Teilnehmer verpflichtet, in seinem nächsten Zug ausdrücklich darauf einzugehen und Position zu beziehen.
     - Der Punkt bleibt offen, bis alle Roster-Mitglieder geantwortet haben.
3. Einen neuen strukturierten Abschnitt an `<topic>.<ext>` anhängen:
   ```markdown
   ## Round <N>: <AgentName> (<Role>) — <Datum>

   ### 1. Bewertung & Antworten zu Vorrunden (inkl. offener Team-Fragen)
   - Antwort auf Frage/Vorschlag von <AgentName>: ...

   ### 2. Eigene Vorschläge & Architekturentscheidungen
   ...

   ### 3. Fragen an das Team / Status der Einigung
   - **Gezielte Frage an <AgentName>:** ...
   - **In die Runde [TEAM_QUESTION]:** ... (Antwort von allen Teilnehmern eingefordert)
   - **Status:** ...
   ```
   Im Modus `decide` gelten stattdessen die Strukturen aus Abschnitt 10.

   **Überschriftsebenen (Pflicht):** Der Beitragsabschnitt trägt `##`, **alle Unterabschnitte `###`** (nie `##`). Ein Abschnitt endet an der nächsten `## `-Zeile; nur so ist die Zuordnung von `[AGREED]`/`[OBJECTION]` zum Autor eindeutig (SKILL.md Abschnitt 6, Fälschungsschutz). *(Entscheidung P2 aus der Testsession vom 2026-10-01: Option B — das Skript schreibt weiterhin nie ins Topic-Dokument — plus diese Regel; ein `scaffold`/`check`-Befehl wird erst bei wiederholten Formfehlern neu geprüft.)*



---

## Teil B — Modus `decide`: Diskussionsprozedur

### 10.2 Runde 1 — blind (gegen Anchoring)
Runde 1 läuft im normalen Round-Robin (ein Agent zur Zeit, kein Parallelzugriff auf die `.pid`), **aber ohne gegenseitige Einsicht**:
- Jeder Agent liest nur `## Frage` (und `[MODERATOR_NOTE]`s) und schreibt seine Position in **seine eigene Datei** `<topic>.blind.<AgentName>.md` — **nicht** ins Topic-Dokument. Er darf die `blind`-Dateien der anderen nicht lesen und nicht andeuten, was er dort vermutet.
- **Aufdecken:** Der letzte Agent der Rotation in Runde 1 (Index `roster.length-1`) hängt nach seinem eigenen Beitrag **alle** Blind-Beiträge unverändert und in Roster-Reihenfolge als `## Round 1: <Agent> (blind)` ins Topic-Dokument an. Die `blind`-Dateien bleiben als Beleg liegen. Fehlt eine Datei, bleibt die Aufdeckung aus und der Moderator wird informiert.
- **Festschreiben (Commitment):** Sobald ein Agent seinen Blind-Beitrag fertig hat, trägt er in `<topic>.pid` einen `history`-Eintrag `action: "blind_submitted"` mit dem **SHA-256-Hash** der Datei ein (`collab.mjs blind <topic> <Agent>`; von Hand: `shasum -a 256 <datei>`). Der Zug darf erst enden (`turn_completed`), wenn dieser Eintrag existiert. Beim Aufdecken wird jede Datei gegen ihren Hash geprüft (`collab.mjs reveal`); stimmt einer nicht, wurde nachträglich geändert — das Aufdecken wird abgebrochen und der Moderator informiert.
- **Ehrliche Grenze:** Alle Agenten teilen sich das Dateisystem, das **Lesen** fremder Blind-Dateien lässt sich technisch nicht verhindern; die Regel „nicht lesen“ bleibt Disziplin. Das Commitment verhindert aber den eigentlichen Schaden — dass jemand seine Position **nach** einem Blick auf die anderen heimlich anpasst.
- **Offengelegte Verletzung:** Hat ein Agent versehentlich eine fremde Blind-Datei (oder das Verzeichnis) gelesen, **sagt er es sofort** und vermerkt im Topic-Dokument `[BLIND_BREACH: <Agent> hat <Datei> gelesen]`. Der Beitrag bleibt gültig, gilt aber als **nicht vollständig blind**; das Ergebnis weist das aus (Verlauf-Zeile „Runde 1 teil-blind“). Der Moderator kann daraufhin per `--note` anordnen, dass der betroffene Agent seinen Blind-Beitrag verwirft und neu schreibt. Verschweigen ist ein Protokollverstoß.
- `stance` (Roster) bindet **nur** Runde 1 (z. B. „advocate: Option B“ → die stärkste Version von B vertreten; „red-team“ → nur Schwächen suchen) und sorgt für Perspektivenvielfalt. Ab Runde 2 vertritt jeder seine ehrliche Position.
- Die Startreihenfolge ist Moderator-Sache (`--start <Agent>`); wähle nicht immer denselben Starter, um Erstsprecher-Bias zu streuen.

Pflichtstruktur eines Blind-Beitrags (Unterabschnitte als `###`, nie `##` — `reveal` hängt die Datei unverändert unter `## Round 1: <Agent> (blind)` an): **Empfehlung** (Option oder neue Option) · **Begründung** · **Annahmen & Belege** (mit Tags, 10.3) · **Konfidenz** (0–100 %) · **Gegenbedingung** („woran würde ich meine Position aufgeben?“) · **Größtes Risiko meiner Empfehlung**.

### 10.3 Evidenz-Tags (gegen gegenseitig bestätigte Halluzinationen)
Jede tragende Behauptung trägt ein Tag:
- `[MEASURED: <wie/Befund>]` — selbst ausgeführt/gemessen (Befehl, Ausgabe, Datei:Zeile).
- `[SOURCED: <URL|Datei:Zeile|Dokument>]` — belegt durch eine prüfbare Quelle.
- `[ASSUMED]` — faktische Annahme/Erinnerung/Plausibilität, **nicht geprüft**.
- `[JUDGMENT: <Maßstab>]` — **Wertung, Abwägung, Geschmack, Priorisierung oder Prognose**, die sich nicht messen oder belegen lässt (z. B. „Variante B wirkt stimmiger“, „Nutzerfreundlichkeit wiegt schwerer als Aufwand“). Sie ist ausdrücklich erlaubt und trägt kein Belegproblem — muss aber als Wertung gekennzeichnet sein, den angelegten Maßstab nennen und begründet werden.

Regeln: (1) Eine Entscheidung darf **nicht ausschließlich** auf ungeprüften *faktischen* Annahmen (`[ASSUMED]`) ruhen — mindestens eine tragende faktische Behauptung der gewählten Option muss `[MEASURED]` oder `[SOURCED]` sein; sonst weist der Vorschlag einem Teilnehmer ausdrücklich einen Prüfauftrag zu (und bleibt bis dahin offen). **Ausnahme:** Ist die Frage ihrem Wesen nach eine Wert-, Geschmacks- oder Prognosefrage, darf die Entscheidung auf `[JUDGMENT]` ruhen; jede *faktische* Prämisse darin braucht trotzdem ihr Tag, und die Wertungen werden im Ergebnis ausgewiesen. Ob eine Aussage Fakt oder Wertung ist, darf jeder Teilnehmer anfechten (`[OBJECTION]`) — eine als `[JUDGMENT]` getarnte Tatsachenbehauptung ist ein Einwandsgrund. (2) Dass zwei Modelle dieselbe `[ASSUMED]`-Aussage teilen, macht sie nicht wahrer; Übereinstimmung zählt nur bei Belegen. (3) Alle verbleibenden `[ASSUMED]` landen im Ergebnis unter „Ungeprüfte Annahmen“, die tragenden `[JUDGMENT]` unter „Wertungen“.

### 10.4 Ab Runde 2 — Kritik & Revision
Jeder Beitrag enthält:
1. **Stärksten Einwand** gegen jede *andere* Position (kein Strohmann; erst die stärkste Version der Gegenposition kurz wiedergeben).
2. **Eigene Position:** halten (mit Begründung, warum der Einwand nicht trägt) oder `[POSITION_CHANGE: <von> → <nach>] <Grund>`.
3. Neue Belege mit Tags (10.3).
4. Eine Zeile `Neuheit: ja|nein` (→ `history[].novelty`, 10.5) — der Wert muss mit `--novelty` bei `end-turn` übereinstimmen.

Ein Agent darf seine Position nur wegen **neuer Argumente/Belege** ändern, nicht wegen Gruppendruck oder Höflichkeit — „Ich schließe mich an“ ohne Begründung ist ungültig.

### 10.5 Stagnation
Enthalten in einer vollen Runde **alle** Züge `novelty: false` (kein neues Argument, kein neuer Beleg, kein neuer Einwand, kein `[POSITION_CHANGE]`), setzt der Agent beim Handover `status: "deadlock"` mit Vermerk `stalled` (Abschnitt 5 Step 3) — auch wenn das Rundenlimit noch nicht erreicht ist. Weiter geht es nur durch den Moderator (`--note` mit neuer Information, `--extend`, `--decide`, `--stop`).


---

## Teil C — Selbst-Planung (Modus `plan`, genau 1 Agent)

Gilt, solange das Roster im Modus `plan` genau einen Agenten enthält (`SKILL.md` Abschnitt 6, Sonderfall). Der Moderator ist der zweite Teilnehmer; er bestätigt per `--approve`. Der Agent plant und prüft sich selbst — der Red-Team-Abschnitt ersetzt die fehlenden Mitverhandler.

**Zugstruktur** (zusätzlich zu Teil A):
1. **Plan-Entwurf:** wie in Teil A (Ziele, Vorschläge, Aufgabenliste). In Runde 1 zuerst Phase A (gemeinsames Zielbild) formulieren und dem Moderator zur Bestätigung vorlegen (`--note` oder Chat).
2. **Red Team** (eigener Abschnitt `### Red Team`, Pflicht in jedem Zug): Der stärkste Fall **gegen den eigenen Plan** — und zwar so, als wäre er der Beitrag eines kritischen Peers:
   - tragende Annahmen mit Evidenz-Tags (`[MEASURED]`/`[SOURCED]`/`[ASSUMED]`, siehe Teil B, 10.3) — eine Annahme gilt erst als geprüft, wenn sie belegt ist;
   - die zwei plausibelsten Fehlschlagsszenarien und woran man sie früh erkennt;
   - eine **übersehene Alternative** (mindestens eine ernsthafte Gegenoption, nicht nur eine Strohpuppe);
   - was **der Moderator** übernehmen oder entscheiden müsste (Zuständigkeitsliste).
3. **Antwort auf das Red Team:** pro Punkt den Plan anpassen oder begründen, warum der Einwand nicht trägt. Anpassung am Plan nach einem `[CONSENSUS_PROPOSAL]` = neuer Vorschlag `P<n+1>` (bisherige Bestätigung verfällt).

**Vorschlag:** Ein `[CONSENSUS_PROPOSAL: P<n>]` ist erst gültig, wenn der Red-Team-Abschnitt im selben oder im vorherigen Zug steht **und** darauf geantwortet wurde. Danach wartet die Session auf `/collaborate --approve P<n>` des Moderators.

**Grenzen (ehrlich benennen):** Ein Agent, der sich selbst reviewt, teilt seine eigenen blinden Flecken. Das Red Team ist ein schwächerer Ersatz für echte zweite Meinungen — bei riskanten oder schwer umkehrbaren Plänen lädt der Moderator besser einen zweiten Agenten (gern dasselbe Modell mit anderer `stance`) per `--invite` ein; damit endet die Selbst-Planung automatisch.
