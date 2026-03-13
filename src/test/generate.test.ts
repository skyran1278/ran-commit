import * as assert from 'assert';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Writable } from 'stream';

import * as generate from '../generate';

const DEFAULT_CONTEXT: generate.CommitContext = {
  diff: 'diff content',
  status: 'M src/file.ts',
  branch: 'main',
  log: 'abc1234 initial commit',
};

type FakeSpawnOpts = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  errorCode?: string;
};

function makeFakeSpawn(opts: FakeSpawnOpts) {
  return (_cmd: string, _args: string[], _options: unknown): ChildProcess => {
    const chunks: Buffer[] = [];
    const stdin = new Writable({
      write(chunk: Buffer, _enc: BufferEncoding, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    });
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    const proc = new EventEmitter() as ChildProcess;
    (proc as any).stdin = stdin;
    (proc as any).stdout = stdout;
    (proc as any).stderr = stderr;
    (proc as any)._stdinChunks = chunks;

    process.nextTick(() => {
      if (opts.errorCode) {
        const err: NodeJS.ErrnoException = new Error('spawn error');
        err.code = opts.errorCode;
        proc.emit('error', err);
        return;
      }
      if (opts.stdout) {
        stdout.emit('data', Buffer.from(opts.stdout));
      }
      if (opts.stderr) {
        stderr.emit('data', Buffer.from(opts.stderr));
      }
      proc.emit('close', opts.exitCode ?? 0);
    });

    return proc;
  };
}

suite('generateCommitMessage', () => {
  let originalSpawnFn: typeof generate._impl.spawnFn;

  beforeEach(() => {
    originalSpawnFn = generate._impl.spawnFn;
  });

  afterEach(() => {
    generate._impl.spawnFn = originalSpawnFn;
  });

  test('resolves with trimmed stdout on success', async () => {
    generate._impl.spawnFn = makeFakeSpawn({
      stdout: '  feat: add login\n',
      exitCode: 0,
    });
    const result = await generate.generateCommitMessage(DEFAULT_CONTEXT);
    assert.strictEqual(result, 'feat: add login');
  });

  test('throws "Claude CLI not found" on ENOENT', async () => {
    generate._impl.spawnFn = makeFakeSpawn({ errorCode: 'ENOENT' });
    await assert.rejects(
      () => generate.generateCommitMessage(DEFAULT_CONTEXT),
      (err: Error) => {
        assert.ok(err.message.includes('Claude CLI not found'));
        assert.ok(
          err.message.includes('npm install -g @anthropic-ai/claude-code'),
        );
        return true;
      },
    );
  });

  test('throws "Claude CLI failed" on non-ENOENT spawn error', async () => {
    generate._impl.spawnFn = makeFakeSpawn({ errorCode: 'EACCES' });
    await assert.rejects(
      () => generate.generateCommitMessage(DEFAULT_CONTEXT),
      (err: Error) => {
        assert.ok(err.message.includes('Claude CLI failed'));
        return true;
      },
    );
  });

  test('throws with exit code and stderr on non-zero exit', async () => {
    generate._impl.spawnFn = makeFakeSpawn({
      exitCode: 1,
      stderr: 'rate limit exceeded',
    });
    await assert.rejects(
      () => generate.generateCommitMessage(DEFAULT_CONTEXT),
      (err: Error) => {
        assert.ok(err.message.includes('exited with code 1'));
        assert.ok(err.message.includes('rate limit exceeded'));
        return true;
      },
    );
  });

  test('throws "empty response" when stdout trims to empty', async () => {
    generate._impl.spawnFn = makeFakeSpawn({ stdout: '   \n', exitCode: 0 });
    await assert.rejects(
      () => generate.generateCommitMessage(DEFAULT_CONTEXT),
      /Claude CLI returned an empty response/,
    );
  });

  test('writes diff to stdin', async () => {
    let capturedProc: any;
    const inner = makeFakeSpawn({ stdout: 'feat: x', exitCode: 0 });
    generate._impl.spawnFn = (...args: Parameters<typeof inner>) => {
      capturedProc = inner(...args);
      return capturedProc;
    };
    await generate.generateCommitMessage({
      ...DEFAULT_CONTEXT,
      diff: 'my special diff',
    });
    const written = Buffer.concat(capturedProc._stdinChunks).toString();
    assert.ok(written.includes('my special diff'));
  });

  test('includes userMessage in prompt when provided', async () => {
    let capturedProc: any;
    const inner = makeFakeSpawn({ stdout: 'feat: x', exitCode: 0 });
    generate._impl.spawnFn = (...args: Parameters<typeof inner>) => {
      capturedProc = inner(...args);
      return capturedProc;
    };
    await generate.generateCommitMessage({
      ...DEFAULT_CONTEXT,
      userMessage: 'focus on the auth changes',
    });
    const written = Buffer.concat(capturedProc._stdinChunks).toString();
    assert.ok(written.includes('## User instructions'));
    assert.ok(written.includes('focus on the auth changes'));
  });

  test('omits user instructions section when no userMessage', async () => {
    let capturedProc: any;
    const inner = makeFakeSpawn({ stdout: 'feat: x', exitCode: 0 });
    generate._impl.spawnFn = (...args: Parameters<typeof inner>) => {
      capturedProc = inner(...args);
      return capturedProc;
    };
    await generate.generateCommitMessage(DEFAULT_CONTEXT);
    const written = Buffer.concat(capturedProc._stdinChunks).toString();
    assert.ok(!written.includes('## User instructions'));
  });
});
