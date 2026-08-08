import * as assert from 'assert';

import * as vscode from 'vscode';

import { pickLargestContext } from '../extension';

suite('pickLargestContext', () => {
  test('returns undefined for an empty list', () => {
    assert.strictEqual(pickLargestContext([]), undefined);
  });

  test('picks the roomiest model regardless of order', () => {
    // Mirrors what a Copilot Free account actually offers: a 12k utility model
    // alongside a 128k one, in unspecified order.
    const models = [
      { id: 'gpt-4o-mini', maxInputTokens: 12078 },
      { id: 'auto', maxInputTokens: 127790 },
      { id: 'copilot-utility-small', maxInputTokens: 12078 },
    ];
    assert.strictEqual(pickLargestContext(models)?.id, 'auto');
    assert.strictEqual(pickLargestContext([...models].reverse())?.id, 'auto');
  });

  test('keeps the first model on a tie', () => {
    const models = [
      { id: 'a', maxInputTokens: 12078 },
      { id: 'b', maxInputTokens: 12078 },
    ];
    assert.strictEqual(pickLargestContext(models)?.id, 'a');
  });
});

suite('Extension Test Suite', () => {
  test('command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('ranCommit.generateCommit'),
      'ranCommit.generateCommit should be registered',
    );
  });

  test('extension is active', async () => {
    const ext = vscode.extensions.all.find(
      (e) => e.packageJSON?.name === 'ran-commit',
    );
    assert.ok(ext, 'extension should be found');
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);
  });

  test('executing the command does not throw "command not found"', async () => {
    try {
      await vscode.commands.executeCommand('ranCommit.generateCommit');
    } catch (err: unknown) {
      const msg = (err as Error).message ?? String(err);
      assert.ok(!msg.includes('command not found'), `unexpected error: ${msg}`);
    }
  });
});
