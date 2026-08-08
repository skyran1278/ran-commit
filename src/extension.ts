import * as vscode from 'vscode';

import { loadCommitlintRules } from './commitlint';
import { buildPrompt, generateCommitMessage } from './generate';
import { getGitContext } from './git';
import { selectModel } from './models';
import {
  ClaudeCliStrategy,
  LLMStrategy,
  PerplexityStrategy,
  VscodeLmStrategy,
} from './strategies';
import { resolveRules, validateMessage } from './validate';

interface Repository {
  rootUri: vscode.Uri;
  inputBox: { value: string };
  diff(staged: boolean): Promise<string>;
}

interface GitAPI {
  repositories: Repository[];
  getRepository(uri: vscode.Uri): Repository | null;
}

const outputChannel = vscode.window.createOutputChannel('Ran Commit', {
  log: true,
});

async function promptForApiKey(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter your Perplexity API key',
    password: true,
    ignoreFocusOut: true,
  });
  if (key !== undefined) {
    await context.secrets.store('perplexity-api-key', key);
    vscode.window.showInformationMessage('Perplexity API key saved.');
  }
  return key || undefined;
}

function parseVscodeLmSelector(model: string): {
  vendor?: string;
  family?: string;
} {
  if (!model) {
    return {};
  }
  const idx = model.indexOf('/');
  if (idx === -1) {
    return { family: model };
  }
  const vendor = model.slice(0, idx) || undefined;
  const family = model.slice(idx + 1) || undefined;
  return { ...(vendor ? { vendor } : {}), ...(family ? { family } : {}) };
}

/** The chosen backend plus a human-readable label for logs and errors. */
interface SelectedStrategy {
  strategy: LLMStrategy;
  label: string;
}

function describeError(err: unknown): string {
  if (err instanceof vscode.LanguageModelError) {
    // `code` is what distinguishes a quota/entitlement rejection from a
    // context-window overflow or a declined consent prompt.
    return `${err.message} (code: ${err.code})`;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Pick the model with the largest context window.
 *
 * `selectChatModels` returns matches in no guaranteed order, and the offered
 * models differ wildly: a Copilot account can expose both a 12k-token utility
 * model and a 128k one. Taking `[0]` makes a large diff fail or succeed at
 * random, so prefer the roomiest model whenever the selector is ambiguous.
 */
export function pickLargestContext<T extends { maxInputTokens: number }>(
  models: readonly T[],
): T | undefined {
  return models.reduce<T | undefined>(
    (best, m) => (!best || m.maxInputTokens > best.maxInputTokens ? m : best),
    undefined,
  );
}

/**
 * Resolve a chat model, tolerating a stale `vscodeLmModel` setting.
 *
 * `selectChatModels` matches `family` exactly, so a renamed or retired model
 * silently matches nothing. Rather than dropping vscode-lm entirely we say so
 * in the log and retry with an empty selector.
 */
async function selectLmModel(
  configured: string,
): Promise<vscode.LanguageModelChat | undefined> {
  const selector = parseVscodeLmSelector(configured);
  const matched = pickLargestContext(
    await vscode.lm.selectChatModels(selector),
  );
  if (matched) {
    return matched;
  }
  if (!configured) {
    return undefined;
  }
  outputChannel.warn(
    `No language model matches "${configured}" (ranCommit.vscodeLmModel). ` +
      'Falling back to any available model — run "Ran - AI Conventional ' +
      'Commit: Select Model" to pick a current one.',
  );
  return pickLargestContext(await vscode.lm.selectChatModels({}));
}

async function createStrategy(
  token: vscode.CancellationToken,
  context: vscode.ExtensionContext,
): Promise<SelectedStrategy | null> {
  const cfg = vscode.workspace.getConfiguration('ranCommit');
  const method = cfg.get<string>('method', 'auto');

  if (method === 'claude-cli') {
    const model = cfg.get<string>('claudeCliModel', '') || undefined;
    return {
      strategy: new ClaudeCliStrategy(model),
      label: `claude-cli (${model ?? 'default'})`,
    };
  }

  if (method === 'perplexity') {
    let apiKey = await context.secrets.get('perplexity-api-key');
    if (!apiKey) {
      apiKey = await promptForApiKey(context);
      if (!apiKey) {
        return null;
      }
    }
    const model = cfg.get<string>('perplexityModel', '') || undefined;
    return {
      strategy: new PerplexityStrategy(apiKey, model),
      label: `perplexity (${model ?? 'default'})`,
    };
  }

  const configured = cfg.get<string>('vscodeLmModel', '');
  const model = await selectLmModel(configured);

  if (method === 'vscode-lm') {
    if (!model) {
      vscode.window.showErrorMessage(
        'No language model available. Install GitHub Copilot or configure a model provider.',
      );
      return null;
    }
    return {
      strategy: new VscodeLmStrategy(model, token),
      label: `vscode-lm (${model.vendor}/${model.family})`,
    };
  }

  // auto: prefer vscode-lm, fall back to Claude CLI
  if (model) {
    return {
      strategy: new VscodeLmStrategy(model, token),
      label: `vscode-lm (${model.vendor}/${model.family})`,
    };
  }
  const cliModel = cfg.get<string>('claudeCliModel', '') || undefined;
  return {
    strategy: new ClaudeCliStrategy(cliModel),
    label: `claude-cli (${cliModel ?? 'default'}, auto fallback)`,
  };
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand('ranCommit.storePerplexityApiKey', () =>
      promptForApiKey(context),
    ),
    vscode.commands.registerCommand('ranCommit.selectModel', selectModel),
  );

  const disposable = vscode.commands.registerCommand(
    'ranCommit.generateCommit',
    async (scm?: vscode.SourceControl) => {
      const gitExt = vscode.extensions.getExtension<{
        getAPI(v: number): GitAPI;
      }>('vscode.git');
      if (!gitExt?.isActive) {
        vscode.window.showErrorMessage('Git extension not available');
        return;
      }

      const api = gitExt.exports.getAPI(1);
      const activeEditor = vscode.window.activeTextEditor;
      const repo =
        (scm?.rootUri && api.getRepository(scm.rootUri)) ??
        (activeEditor && api.getRepository(activeEditor.document.uri)) ??
        (api.repositories.length === 1 ? api.repositories[0] : null);
      if (!repo) {
        vscode.window.showErrorMessage('No git repository found');
        return;
      }

      const userMessage = repo.inputBox.value.trim();
      const repoRoot = repo.rootUri.fsPath;
      const [gitContext, commitlint] = await Promise.all([
        getGitContext(repo, userMessage || undefined),
        loadCommitlintRules(repoRoot),
      ]);
      if (!gitContext) {
        vscode.window.showWarningMessage(
          'No changes found to generate a commit message from',
        );
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.SourceControl,
          title: 'Generating commit message...',
        },
        async (_, token) => {
          const selected = await createStrategy(token, context);
          if (!selected) {
            return;
          }
          outputChannel.info(`Generating with ${selected.label}`);

          try {
            const gitCfg = vscode.workspace.getConfiguration('git');
            gitContext.subjectLength = gitCfg.get<number>(
              'inputValidationSubjectLength',
              50,
            );
            gitContext.lineLength = gitCfg.get<number>(
              'inputValidationLength',
              72,
            );
            if (commitlint?.parsed) {
              gitContext.commitlintRules = commitlint.parsed;
            }
            outputChannel.debug(buildPrompt(gitContext));

            const rules = await resolveRules({
              rawRules: commitlint?.raw,
              subjectLength: gitContext.subjectLength,
              lineLength: gitContext.lineLength,
            });
            const generated = await generateCommitMessage(
              gitContext,
              selected.strategy,
              {
                validate: async (message) => {
                  const result = await validateMessage(message, rules);
                  if (result.degraded) {
                    outputChannel.warn(
                      'commitlint validation skipped: repo rules could not be ' +
                        'linted in-process (likely plugin rules); the generated ' +
                        'message was not validated.',
                    );
                  }
                  return result;
                },
                onWarnings: (warnings) => {
                  vscode.window.showWarningMessage(
                    `Generated commit message may not follow all rules:\n- ${warnings.join('\n- ')}`,
                  );
                },
              },
            );
            repo.inputBox.value = userMessage
              ? `${userMessage}\n\n${generated}`
              : generated;
          } catch (err: unknown) {
            const detail = describeError(err);
            outputChannel.error(`${selected.label} failed: ${detail}`);
            if (err instanceof Error && err.stack) {
              outputChannel.error(err.stack);
            }
            const choice = await vscode.window.showErrorMessage(
              `Failed to generate commit message via ${selected.label}: ${detail}`,
              'Show Log',
            );
            if (choice === 'Show Log') {
              outputChannel.show();
            }
          }
        },
      );
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
