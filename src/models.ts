import * as vscode from 'vscode';

const EXTENSION_ID = 'skyran.ran-commit';

export function buildEnumItems(
  enums: string[],
  labels: string[],
): vscode.QuickPickItem[] {
  return enums
    .filter((v) => v !== '')
    .map((v, i) => ({ label: labels[i + 1] ?? v, description: v }));
}

export function buildChatModelItems(
  models: Array<{ name: string; vendor: string; family: string }>,
): vscode.QuickPickItem[] {
  return models.map((m) => ({
    label: m.name,
    description: `${m.vendor}/${m.family}`,
  }));
}

export async function selectModel(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('ranCommit');
  const method = cfg.get<string>('method', 'auto');

  let settingKey: string;
  let placeholder: string;
  let items: vscode.QuickPickItem[];

  switch (method) {
    case 'claude-cli':
    case 'perplexity': {
      settingKey =
        method === 'claude-cli' ? 'claudeCliModel' : 'perplexityModel';
      placeholder =
        method === 'claude-cli'
          ? 'Select Claude model'
          : 'Select Perplexity model';

      const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
      const schema =
        ext.packageJSON.contributes.configuration.properties[
          `ranCommit.${settingKey}`
        ];
      const enums: string[] = schema.enum ?? [];
      const labels: string[] = schema.enumItemLabels ?? [];

      items = buildEnumItems(enums, labels);
      break;
    }
    case 'vscode-lm':
    case 'auto': {
      settingKey = 'vscodeLmModel';
      placeholder = 'Select language model';
      const available = await vscode.lm.selectChatModels({});
      if (!available.length) {
        vscode.window.showWarningMessage('No language models available.');
        return;
      }
      items = buildChatModelItems(available);
      break;
    }
    default:
      return;
  }

  items.push({
    label: '$(edit) Custom...',
    description: 'Enter a custom model name',
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: placeholder,
  });
  if (!picked) {
    return;
  }

  let value: string;
  if (picked.label === '$(edit) Custom...') {
    const input = await vscode.window.showInputBox({
      prompt: `Enter custom model name for ${method}`,
    });
    if (!input) {
      return;
    }
    value = input;
  } else {
    value = picked.description ?? picked.label;
  }

  await cfg.update(settingKey, value, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Model set to: ${value}`);
}
