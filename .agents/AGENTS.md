# AGENTS Instructions & Coding Standards

**Context:** Small World is a custom, lightweight 3D engine written in strict TypeScript supporting hybrid WebGL/WebGPU rendering pipelines.

## 1. Core Workflow & Token Saving

- **Planning:** Require detailed plan approval only for major features, complex refactorings, or architectural changes. Small edits, bugfixes, asset generation, and documentation updates should be implemented directly without blocking for prior approval.
- **Git Permissions & Quotes:** You are explicitly authorized to execute commands starting with `git checkout`, `git add`, `git commit`, `git push`, `git log`, `git branch` without prior permission. Every single commit message MUST be a pure quote without author/prefixes. Never reuse a quote already used in a previous commit — check `git log` first.
- **Surgical Changes:** Use `replace` tool for edits. NEVER use `write_file` on existing files.
- **Data Integrity:** Preserve historical entries in logs/changelogs.
- **File Storage:** Store scratchpads, sketches, and temporary files locally in the project under `.agents/scratches/`, not in the hard-to-reach agent-specific AppData directory. Exceptions are regular assets or artifacts where the target location is known and logical.
- **Verification:** Run `npm run lint:fix`, `npm run build:lib` and `npm run test` proactively after making changes to catch errors before committing.
- **Communication:** Telegram-style (concise), use Markdown artifacts for plans/details, precise links (file/lines) instead of copying code, surgical diffs, delegate research to subagents.
- **Terminal Commands:** You are explicitly allowed to run read-only shell commands (like `grep`, `tail`, `cat`, `ls`, `find`, `git log`, `git diff`), image manipulation tools (`sips`), asset download commands (`curl -sL "https://tripo-data...`), Git operations (`git checkout`, `git add`, `git commit`, `git push`, `git log`, `git branch`), as well as safe project scripts (`npm run lint`, `npm run build`, `npm run test`) in the terminal WITHOUT asking for permission.
- **Simplicity:** Keep things as simple as possible. Strictly avoid overengineering or preemptive abstraction. Complexity arises naturally on its own.
- **App Docs Convention:** Every app under `src/apps/<app>/` has a `docs/` subfolder with `concept-dossier.html` (visual concept) and `log.md` (living dev log). The `log.md` is the primary memory for that app — read it at session start, append an entry at session end. Full rules: `.agents/notes/app-docs-convention.md`.

## 2. Core Architectural Laws

- **Right-Handed System:** +X=Right, +Y=Up, +Z=Backward (-Z=Forward/Front).
- **Behavior System:** Entities like Cameras use the Behavior system rather than specific controller arrays. Use `camera.addBehavior(new OrbitController())` instead of managing controllers directly.
- **No Global Singletons:** Small World must support multiple engine instances per page. Never use global singletons. Pass dependencies via Context Objects, Constructor Injection, or Scene Graph lifecycle methods.
- **Strict Types:** Explicit types, access modifiers, and **NO `any`**. The linter will instantly reject it. Use explicit casting or generics.
- **Lifecycle & Fail Fast:** Follow the "Fail Fast" principle to catch invalid states immediately. However, **never throw exceptions in property setters** if the required properties might only be assigned in subsequent lines. Throw exactly when the subsystem actively processes the object.

## 3. Detailed Skills

Detailed coding standards, formatting, shader logic, and domain knowledge are outsourced to skills to save context tokens. **Always read the relevant skill before starting a task:**
- `coding-guide`: For TS templates, DOM assignments, Enum rules, Shader optimizations, Rendering pipeline rules, and Testing.
- `changelog`: For release standard and commit rules.
- `domain-modeling`: For maintaining `CONTEXT.md` and recording architecture decisions as ADRs (`docs/adr/`).
- `maintain-references`: For adding to `REFERENCES.md`.
- `character-pipeline`: For the end-to-end 2D sketch to rigged 3D game-ready character workflow.
- `deslop`: For anti-AI-slop and human tone filter.
