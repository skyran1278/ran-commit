# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run compile      # Type-check + lint + build (dev)
pnpm run package      # Type-check + lint + build (production/minified)
pnpm run watch        # Watch mode: esbuild + tsc in parallel
pnpm run lint         # ESLint
pnpm run check-types  # TypeScript type-check only (no emit)
pnpm run format       # Prettier format
pnpm run test         # Compile tests + extension, then run vscode-test
```

To run only the unit tests (no VSCode host needed), compile first then run the test runner directly — but note that `extension.test.ts` requires a VSCode host while `generate.test.ts` uses pure Node mocks.

## Architecture

This is a VSCode extension with two source files:

- **[src/extension.ts](src/extension.ts)** — VSCode entry point. Registers the `ranCommit.generateCommit` command, which appears as a sparkle icon in the SCM title bar. On invocation it resolves the active git repo via the built-in `vscode.git` extension API, fetches the staged diff (falling back to unstaged), and calls `generateCommitMessage`.

- **[src/generate.ts](src/generate.ts)** — Core logic. Spawns the `claude` CLI (`@anthropic-ai/claude-code`) as a subprocess, pipes the diff as a prompt, and returns the trimmed stdout as the commit message. The `_impl.spawnFn` export is the seam used by unit tests to inject a fake spawn without needing VSCode.

**Build**: esbuild bundles `src/extension.ts` → `dist/extension.js` (CJS, `vscode` externalized). Tests compile via `tsc` to `out/` and run via `@vscode/test-cli`.

**Two test suites**:

- `src/test/generate.test.ts` — pure unit tests, inject fake child processes via `generate._impl.spawnFn`
- `src/test/extension.test.ts` — integration tests requiring a VSCode host instance

## Key constraint

The extension depends on the `claude` CLI being available on `PATH` at runtime. If not found (`ENOENT`), the extension surfaces a user-facing error with installation instructions.
