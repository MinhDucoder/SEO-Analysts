import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { FileSystemPromptLoader } from '../src/prompt/loader';
import { PromptError } from '../src/errors';

const BASE = resolve(__dirname, 'fixtures/prompts');

describe('FileSystemPromptLoader', () => {
  it('load() resolves ^1.0.0 to highest matching version (1.2.0)', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    const p = await loader.load('greeting', { version: '^1.0.0' });
    expect(p.version).toBe('1.2.0');
    expect(p.id).toBe('greeting');
    expect(p.user).toContain('warmly');
  });

  it('load() resolves exact version when range matches one', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    const p = await loader.load('greeting', { version: '1.0.0' });
    expect(p.version).toBe('1.0.0');
  });

  it('load() throws PromptError when no version matches', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    await expect(loader.load('greeting', { version: '^2.0.0' })).rejects.toThrow(PromptError);
  });

  it('load() throws PromptError when prompt id does not exist', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    await expect(loader.load('missing', { version: '^1.0.0' })).rejects.toThrow(PromptError);
  });

  it('render() returns messages + stable sha256 hash', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    const r1 = await loader.render(
      'greeting',
      { language: 'vi', name: 'Bob' },
      { version: '^1.0.0' },
    );
    expect(r1.messages).toHaveLength(2);
    expect(r1.messages[0].role).toBe('system');
    expect(r1.messages[1].content).toContain('Bob');
    expect(r1.hash).toMatch(/^[0-9a-f]{16}$/);
    const r2 = await loader.render(
      'greeting',
      { language: 'vi', name: 'Bob' },
      { version: '^1.0.0' },
    );
    expect(r2.hash).toBe(r1.hash);
  });

  it('render() hash changes when variables differ', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    const a = await loader.render(
      'greeting',
      { language: 'vi', name: 'A' },
      { version: '^1.0.0' },
    );
    const b = await loader.render(
      'greeting',
      { language: 'vi', name: 'B' },
      { version: '^1.0.0' },
    );
    expect(a.hash).not.toBe(b.hash);
  });

  it('load() caches in-memory (second call hits no fs)', async () => {
    const loader = new FileSystemPromptLoader({ baseDir: BASE });
    const p1 = await loader.load('greeting', { version: '^1.0.0' });
    const p2 = await loader.load('greeting', { version: '^1.0.0' });
    expect(p1).toBe(p2);
  });
});
