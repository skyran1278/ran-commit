---
name: commit
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
---

## Context

- Current git status: !`git status`
- Current git diff: !`git diff --staged --quiet && git diff || git diff --staged`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

### Format

```
<type>[optional scope]: <short description>

- explain the motivation behind this change
```

### Type Choices

Use one of: `fix`, `feat`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`

- `feat`: adds a new feature
- `fix`: represents a bug fix
- `BREAKING CHANGE`: add `!` before `:` in type/scope, or include `BREAKING CHANGE:` footer
  - signals when: removing/renaming public fields or functions, changing function signatures, removing supported values

### Guidelines

**description:**

- imperative, present tense, lowercase start, no period
- immediately follows the colon and space

**body** (include by default; omit only for trivial changes like typo fixes):

- blank line after description
- use dashes (`-`) for bullet points
- imperative, present tense, lowercase start, no period
- each line ≤ 80 characters
- explain the motivation (WHY), not just what changed

**footer (optional):**

- one blank line after body
- token format: `Token: value` or `Token #value`
- `BREAKING CHANGE` MUST be uppercase

### Examples

```
fix(auth): add refresh token logic

- users were unexpectedly logged out when token expired silently
```

```
refactor(api)!: split User name into firstName and lastName

- downstream callers reading user.name will break; must migrate to firstName/lastName
```

### Validation Checklist

- [ ] type is one of the allowed types
- [ ] scope (if used) is a noun in parentheses
- [ ] description is lowercase, imperative, no trailing period
- [ ] body begins with a blank line after description
- [ ] body uses `- ` bullet points (never prose paragraphs)
- [ ] every line ≤ 80 characters
- [ ] breaking changes marked with `!` or `BREAKING CHANGE:` footer

### Common Mistakes

| Mistake                                   | Fix                                             |
| ----------------------------------------- | ----------------------------------------------- |
| `feat: Added new button`                  | `feat: add new button` (imperative, lowercase)  |
| `fix: fixed bug.`                         | `fix: fix bug` (no period, imperative)          |
| Body immediately after description        | Add blank line between description and body     |
| Line > 80 chars                           | Break into multiple lines                       |
| `breaking change:` in footer              | Must be `BREAKING CHANGE:` (uppercase)          |
| No body on non-trivial change             | Add body explaining motivation (WHY)            |
| Body written as prose paragraph           | Use `- ` bullet points instead                  |
| `feat!(scope): ...` — `!` before scope    | `!` goes after scope: `feat(scope)!: ...`       |
| `feat!: ...` — `!` before colon, no scope | `!` goes after type: `feat!: ...` ✅ (no scope) |
| Renamed/removed public field with no `!`  | Add `!` after type/scope: `refactor(api)!: ...` |
| Changed function signature with no `!`    | Add `!` after type/scope: `feat(auth)!: ...`    |

## Your task

Based on the above changes, create a single git commit.

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
