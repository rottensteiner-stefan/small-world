# Konvention: App-Dokumentation

**Festgelegt:** 2026-08-19

## Struktur

Jede App unter `src/apps/<app-name>/` hat einen `docs/`-Unterordner:

```
src/apps/<app-name>/
└── docs/
    ├── concept-dossier.html   ← Visuelles Konzept-Dossier (HTML, reich formatiert)
    └── log.md                 ← Laufendes Entwicklungslog (Markdown)
```

## Regeln

- `concept-dossier.html`: Statisches HTML, kein Build-Step. Für Konzepte, Moodboards, Farbpaletten, Feature-Beschreibungen.
- `log.md`: Lebendes Dokument. Jede Session ergänzt einen neuen Eintrag mit Datum. Kein Eintrag wird gelöscht (Historienpflicht wie Changelog).
- Das `log.md` ist das **primäre Gedächtnis** für Research und Entscheidungen einer App.
  Vor jeder Session: `log.md` lesen. Nach jeder Session: Eintrag hinzufügen.
- `docs/research/` ist damit **obsolet** für App-spezifische Logs. Der Ordner bleibt für projektweite Themen.

## Bestehende Logs

| App | Log |
|---|---|
| DISC WARS | `src/apps/disc-wars/docs/log.md` (vormals `docs/research/disc-wars.md`) |
| Neon Labyrinth | `src/apps/neon-labyrinth/docs/log.md` |
| Light Cycle Arena | `src/apps/light-cycle-arena/docs/log.md` |
| YAD | `src/apps/yad/docs/log.md` |
