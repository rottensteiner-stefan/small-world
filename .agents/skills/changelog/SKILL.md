---
name: Changelog & Release Standard
description: Defines the strict formatting rules for CHANGELOG.md entries and Git release commits.
---

# Changelog & Release Standards

Small World uses a highly stylized, poetic approach to version releases. Every new version is accompanied by a profound quote (philosophical, mathematical, scientific, or literary) that loosely reflects the nature of the update.

## 1. CHANGELOG.md Format

Every entry in the `CHANGELOG.md` MUST strictly follow this exact structure:

```markdown
## [0.63.0] - 2026-07-18

### "Pure mathematics is, in its way, the poetry of logical ideas." - Albert Einstein

- **Features:**
  - Description of new features, showcases, or visual additions.
- **Architecture & Bugfixes:**
  - Description of core engine changes, math fixes, or resolved crashes.
- **Housekeeping & Docs:**
  - Code cleanups, linting rules, or documentation updates.
```

**Rules for the Changelog:**
1. **No Extra Titles:** Do NOT invent a name for the update (like "The Shader Update"). The subheader (H3 `###`) MUST be exactly the quote in quotes, followed by a hyphen and the author.
2. **Categories:** Always use exactly these three categories: `- **Features:**`, `- **Architecture & Bugfixes:**`, and `- **Housekeeping & Docs:**`. If a category is empty for a specific release, you may omit it.
3. **Preserve History:** NEVER delete old entries. Always prepend the new version block directly under the `# Changelog` header.

## 2. Git Release Commit Rule

When making the final Git commit for a version release (the commit that bumps the version and pushes to main), the commit message MUST be unconventional.

Instead of standard Conventional Commits (like `feat: release 0.63.0`), the commit message MUST be **exactly the quote** used in the changelog, but **WITHOUT the author** and **WITHOUT the surrounding quotation marks**.

**Example:**
If the changelog subheader is:
`### "Pure mathematics is, in its way, the poetry of logical ideas." - Albert Einstein`

The git commit command MUST be:
`git commit -m "Pure mathematics is, in its way, the poetry of logical ideas."`

Never use anything else for the version bump commit.
