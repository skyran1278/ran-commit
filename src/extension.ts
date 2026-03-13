import { execFile } from 'child_process';

import * as vscode from 'vscode';

import { generateCommitMessage } from './generate';

function execGit(repoPath: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: repoPath }, (err, stdout) => {
      if (err) {
        resolve('');
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

interface Repository {
  rootUri: vscode.Uri;
  inputBox: { value: string };
  diff(staged: boolean): Promise<string>;
}

interface GitAPI {
  repositories: Repository[];
  getRepository(uri: vscode.Uri): Repository | null;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'git-commit.generateCommit',
    async () => {
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
        (activeEditor && api.getRepository(activeEditor.document.uri)) ??
        api.repositories[0];
      if (!repo) {
        vscode.window.showErrorMessage('No git repository found');
        return;
      }

      const repoPath = repo.rootUri.fsPath;
      const [staged, unstaged, status, branch, log] = await Promise.all([
        repo.diff(true),
        repo.diff(false),
        execGit(repoPath, ['status']),
        execGit(repoPath, ['branch', '--show-current']),
        execGit(repoPath, ['log', '--oneline', '-10']),
      ]);
      const diff = staged || unstaged;
      if (!diff) {
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
        async () => {
          try {
            const userMessage = repo.inputBox.value.trim();
            const generated = await generateCommitMessage({
              diff,
              status,
              branch,
              log,
              ...(userMessage && { userMessage }),
            });
            repo.inputBox.value = userMessage
              ? `${userMessage}\n\n${generated}`
              : generated;
          } catch (err: unknown) {
            vscode.window.showErrorMessage(
              `Failed to generate commit message: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        },
      );
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
