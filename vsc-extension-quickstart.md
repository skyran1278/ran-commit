# ran-commit — Developer Quickstart

## Prerequisites

- Node.js + pnpm
- VSCode
- (Optional) `claude` CLI on PATH for the `claude-cli` strategy

## Install dependencies

```bash
pnpm install
```

## Run the extension (F5 debug)

1. Open this repo in VSCode.
2. Press **F5** — this launches an **Extension Development Host** window with the extension loaded.
3. In the new window, open a git repo, stage some changes, and click the sparkle icon (✨) in the **Source Control** title bar to generate a commit message.

> To reload after code changes: press **Cmd+R** in the Extension Development Host window, or relaunch via the debug toolbar.

## Watch mode (auto-rebuild on save)

```bash
pnpm run watch
```

Runs esbuild + tsc in parallel. Combine with F5 for a fast edit → reload loop.

## Run tests

```bash
pnpm run test
```

- `generate.test.ts` — pure unit tests, no VSCode host needed
- `extension.test.ts` — integration tests, requires a VSCode host (launched automatically)

## Build

```bash
pnpm run compile   # dev build (type-check + lint + esbuild)
pnpm run package   # production/minified build
```

## Release

Releases are managed with `release-it`. Before releasing, make sure you have a `VSCE_PAT` environment variable set (your VS Code Marketplace personal access token).

```bash
pnpm run release
```

This will automatically:

1. Run `check-types`, `lint`, `format`, and `test`
2. Bump the version (interactive prompt: patch / minor / major)
3. Generate the changelog (`scripts/generate-changelog.mjs`)
4. Commit (`chore: release vX.X.X`) and tag
5. Publish to the VS Code Marketplace via `vsce publish`

> The release does **not** publish to npm or create a GitHub release.

## LLM strategy selection

Controlled by the `ranCommit.method` setting:

| Setting          | Requires                                                          |
| ---------------- | ----------------------------------------------------------------- |
| `auto` (default) | Tries `vscode-lm` first, falls back to `claude-cli`               |
| `vscode-lm`      | A Copilot/LM provider installed in VSCode                         |
| `claude-cli`     | `claude` CLI on PATH                                              |
| `perplexity`     | API key stored via `ran-commit: Store Perplexity API Key` command |
