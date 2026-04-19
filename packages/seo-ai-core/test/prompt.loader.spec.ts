import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileSystemPromptLoader } from '../src/prompt/loader.js';
import { PromptError } from '../src/errors/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '_fixtures', 'prompts');

describe('FileSystemPromptLoader', () => {
  const loader = new FileSystemPromptLoader({ baseDir: FIXTURES });

  it('loads the latest version when no range is provided', async () => {
    const tpl = await loader.load('sample');
    expect(tpl.version).toBe('2.0.0');
    expect(tpl.id).toBe('sample');
  });

  it('resolves a semver range to the highest matching version', async () => {
    const tpl = await loader.load('sample', '^1.0.0');
    expect(tpl.version).toBe('1.1.0');
  });

  it('loads an exact version', async () => {
    const tpl = await loader.load('sample', '1.0.0');
    expect(tpl.version).toBe('1.0.0');
  });

  it('throws PromptError when no version satisfies the range', async () => {
    await expect(loader.load('sample', '^3.0.0')).rejects.toThrow(PromptError);
  });

  it('throws PromptError when prompt id does not exist', async () => {
    await expect(loader.load('nonexistent')).rejects.toThrow(PromptError);
  });

  it('renders all declared variables and produces system + user messages', async () => {
    const out = await loader.render('sample', { name: 'Alice' }, { version: '1.1.0' });
    expect(out.id).toBe('sample');
    expect(out.version).toBe('1.1.0');
    expect(out.messages).toHaveLength(2);
    expect(out.messages[0]).toEqual({ role: 'system', content: 'Be brief.' });
    expect(out.messages[1]).toEqual({ role: 'user', content: 'Hi Alice!' });
    expect(out.hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('hash is stable across renders with same inputs', async () => {
    const a = await loader.render('sample', { name: 'X' }, { version: '1.0.0' });
    const b = await loader.render('sample', { name: 'X' }, { version: '1.0.0' });
    expect(a.hash).toBe(b.hash);
  });

  it('hash differs when variables differ', async () => {
    const a = await loader.render('sample', { name: 'X' }, { version: '1.0.0' });
    const b = await loader.render('sample', { name: 'Y' }, { version: '1.0.0' });
    expect(a.hash).not.toBe(b.hash);
  });

  it('throws PromptError when a declared variable is missing', async () => {
    await expect(loader.render('sample', {}, { version: '2.0.0' })).rejects.toThrow(PromptError);
  });

  it('list() returns latest version per id with metadata', async () => {
    const list = await loader.list();
    expect(list).toContainEqual(
      expect.objectContaining({ id: 'sample', version: '2.0.0' }),
    );
  });

  it('non-deprecated load does not emit warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fresh = new FileSystemPromptLoader({ baseDir: FIXTURES, cache: false });
    await fresh.load('sample');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
