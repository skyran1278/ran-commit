import * as assert from 'assert';

import * as vscode from 'vscode';

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
