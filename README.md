# Ran - Conventional Commit Generator

AI-powered git commit message generator for VS Code. Click the sparkle icon (✨) in the Source Control panel to instantly generate a commit message from your staged diff.

## Features

- **One-click commit messages** from your staged or unstaged diff
- **Multiple AI backends** — GitHub Copilot, Claude CLI, Perplexity, or any VS Code LM provider
- **[Conventional Commits](https://www.conventionalcommits.org/) format** with your recent commits as style reference
- **Commitlint-aware** — reads your project's commitlint config and follows your rules
- **Respects VS Code git settings** for subject and body line length limits

## Requirements

Depending on your chosen method:

- **`auto` / `vscode-lm`** — a VS Code language model provider such as [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
- **`claude-cli`** — the [`claude` CLI](https://www.npmjs.com/package/@anthropic-ai/claude-code) installed and available on your `PATH`
- **`perplexity`** — a Perplexity API key (set via the command **Git Commit: Store Perplexity API Key**)

## Extension Settings

| Setting                     | Default     | Description                                                                                                                           |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ranCommit.method`          | `auto`      | Generation method: `auto`, `vscode-lm`, `claude-cli`, or `perplexity`                                                                 |
| `ranCommit.claudeCliModel`  | _(default)_ | Model alias for `claude-cli` (e.g. `sonnet`, `opus`, `haiku`). See [model config docs](https://code.claude.com/docs/en/model-config). |
| `ranCommit.perplexityModel` | _(default)_ | Perplexity Agent API model (e.g. `perplexity/sonar`). See [Perplexity models](https://docs.perplexity.ai/docs/agent-api/models).      |
| `ranCommit.vscodeLmModel`   | _(default)_ | Model for `vscode-lm` / `auto`. Format: `vendor/family` (e.g. `copilot/gpt-4o`).                                                      |

Use the **Ran - AI Conventional Commit: Select Model** command to pick a model interactively.

## Usage

1. Stage your changes in the Source Control panel (or leave them unstaged — the extension will use the full diff as a fallback).
2. Click the **✨ sparkle icon** in the SCM title bar.
3. The generated commit message is inserted into the commit message box, ready to edit or submit.
