# Unified Conventional Commits Prompt

## Problem

`buildPrompt` in `src/generate.ts` has two paths:

1. `buildRulesPrompt` — used when commitlint config is detected; strictly follows those rules
2. `buildFallbackPrompt` — used otherwise; prioritizes matching recent commit style and only uses Conventional Commits as a "fallback"

This is overly complex and produces inconsistent behavior. The fallback path tells the LLM to mimic recent commits first, which can yield non-standard formats.

## Decision

Merge both paths into a single `buildPrompt` that **always** uses Conventional Commits as the primary format. Commitlint rules are layered on top when available. Recent commits serve only as tone/wording reference.

## Prompt Structure

```
## Conventional Commits

### Format

\`\`\`
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
\`\`\`

### Types

Use one of: <commitlint types if available, otherwise DEFAULT_TYPES>

- feat: a new feature
- fix: a bug fix
- BREAKING CHANGE: append ! after type/scope, or add a BREAKING CHANGE: footer

### Rules

- Separate description from body with a blank line
- Footer uses git trailer format: `Token: value` or `Token #value`
- BREAKING CHANGE footer must be uppercase
- <commitlint scopes if present: "Allowed scopes: ...">
- <header max length if present>
- <body max line length if present>
- <footer max line length if present>
- <subject case rules if present>
- <subject full stop rules if present>
- <VSCode subjectLength / lineLength if present and not overridden by commitlint>

### Examples

\`\`\`
feat(lang): add Polish language
\`\`\`

\`\`\`
fix: prevent racing of requests

- introduce a request id and reference to latest request
- dismiss incoming responses other than from latest request
\`\`\`

\`\`\`
feat(api)!: send an email to the customer when a product is shipped

BREAKING CHANGE: `notify` method signature changed
\`\`\`

## Context

- Current git diff: <diff>
- Current branch: <branch>
- Recent commits: <log>
- User instructions: <userMessage> (if provided)

## Your task

Generate a single git commit message following the Conventional Commits format above.
Use the recent commits only as reference for tone and wording style.
You MUST follow the format and rules above.
Output only the commit message with no code fences, quotes, or explanation.
```

## Files to Modify

### `src/generate.ts`

- Remove `buildRulesPrompt` and `buildFallbackPrompt` functions
- Rewrite `buildPrompt` as a single function that:
  - Builds the Conventional Commits format section (always present)
  - Calls `commitlintRulesLines` to layer on commitlint constraints when `context.commitlintRules` is present
  - Uses commitlint `types` if available, otherwise `DEFAULT_TYPES`
  - Adds VSCode git length settings as fallback when commitlint doesn't override them
  - Builds context section via `buildContextSection` (unchanged)
  - Ends with the unified task instruction
- Keep `buildContextSection`, `commitlintRulesLines`, `DEFAULT_TYPES` as-is (reuse)

### `src/test/generate.test.ts`

- Update `buildPrompt two-path routing` suite:
  - Remove test asserting "Conventional Commits (fallback reference)" heading
  - Remove test asserting "Project Commit Rules" heading
  - Replace with tests that verify Conventional Commits is always present regardless of commitlint
- Update assertions that check for specific heading text (e.g., `## Project Commit Rules` -> `## Conventional Commits`)
- Keep all commitlint-specific tests (scopes, types, lengths, case, full stop) — they should still pass with minor assertion text changes
- Keep all VSCode git settings tests

## Verification

1. `pnpm run compile` — type-check + lint + build passes
2. `pnpm run test` — all tests pass
3. Inspect prompt output for both with-commitlint and without-commitlint contexts to verify structure
