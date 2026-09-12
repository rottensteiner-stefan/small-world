# Convention: App Documentation

**Established:** 2026-08-19

## Structure

Every app under `apps/<app-name>/` has a `docs/` subfolder:

```
apps/<app-name>/
└── docs/
    ├── concept-dossier.html   ← Visual concept dossier (HTML, richly formatted)
    └── log.md                 ← Running development log (Markdown)
```

## Rules

- `concept-dossier.html`: Static HTML, no build step. For concepts, mood boards, color palettes, feature descriptions.
- `log.md`: A living document. Every session appends a new dated entry. No entry is ever deleted (history is kept, like a changelog).
- `log.md` is the **primary memory** for an app's research and decisions.
  Before every session: read `log.md`. After every session: add an entry.
- `docs/research/` is therefore **obsolete** for app-specific logs. The folder remains in use for project-wide topics.

## Existing Logs

| App | Log |
|---|---|
| And Now? | `apps/sample-apps/and-now/docs/log.md` |
| Light Cycle Arena | `apps/sample-apps/light-cycle-arena/docs/log.md` |
| YAD | `apps/sample-apps/yad/docs/log.md` |

**Update (2026-09-12):** Mit der npm-Workspaces-Restrukturierung (`packages/engine` + `apps/*`) sind die Pfade von `src/apps/<app>/` auf `apps/<app>/` umgezogen. Diese Datei spiegelt bereits die neue Struktur.
