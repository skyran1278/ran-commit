import { spawn } from 'child_process';

type SpawnFn = (
  cmd: string,
  args: string[],
  opts: { stdio: ['pipe', 'pipe', 'pipe'] },
) => ReturnType<typeof spawn>;
export const _impl = { spawnFn: spawn as SpawnFn };

const CLAUDE_CLI = 'claude';
// --print: non-interactive mode; --output-format text: plain text output (no JSON envelope)
const CLAUDE_ARGS = ['--print', '--output-format', 'text'] as const;

export interface CommitContext {
  diff: string;
  status: string;
  branch: string;
  log: string;
}

function buildPrompt(context: CommitContext): string {
  return `## Context

- Current git status:
${context.status}

- Current git diff (staged and unstaged changes):
${context.diff}

- Current branch: ${context.branch}

- Recent commits:
${context.log}

## Your task

Based on the above changes and commit history style, generate a single commit message. Output only the commit message, no explanation, no code fences.`;
}

export async function generateCommitMessage(
  context: CommitContext,
): Promise<string> {
  const prompt = buildPrompt(context);

  const message = await new Promise<string>((resolve, reject) => {
    const child = _impl.spawnFn(CLAUDE_CLI, [...CLAUDE_ARGS], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout!.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr!.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            'Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code',
          ),
        );
      } else {
        reject(new Error(`Claude CLI failed: ${err.message}`));
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Claude CLI exited with code ${code}: ${Buffer.concat(stderrChunks).toString()}`,
          ),
        );
      } else {
        resolve(Buffer.concat(stdoutChunks).toString().trim());
      }
    });

    child.stdin!.write(prompt);
    child.stdin!.end();
  });

  if (!message) {
    throw new Error('Claude CLI returned an empty response');
  }
  return message;
}
