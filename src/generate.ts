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

const SYSTEM_PROMPT = `You are a git commit message generator. Generate a single commit message strictly following Conventional Commits 1.0.0.

Format:
<type>[optional scope]: <short description>

- explain the motivation behind this change

Type must be one of: fix, feat, build, chore, ci, docs, style, refactor, perf, test

Rules:
- description: imperative, present tense, lowercase start, no period
- body: blank line after description, use dash bullets, explain WHY not what, each line ≤ 80 chars
- omit body only for trivial changes like typo fixes
- breaking changes: add ! before colon or BREAKING CHANGE: footer

Output only the commit message, no explanation, no code fences.`;

export async function generateCommitMessage(diff: string): Promise<string> {
  const prompt = `${SYSTEM_PROMPT}\n\nGenerate a commit message for this diff:\n\n${diff}`;

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
