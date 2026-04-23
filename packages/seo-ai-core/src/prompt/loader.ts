/**
 * @file File-system prompt loader. Convention: prompts live under
 * `<baseDir>/<id>/v<semver>.prompt.yaml`. `load({version})` accepts a
 * semver range and resolves to the highest satisfying version.
 * `render()` materializes system/user strings through the Handlebars
 * renderer and returns a stable sha256 hash used for trace logs.
 *
 * In-memory cache is keyed by `<id>@<resolvedVersion>` and is not
 * invalidated on disk change — dev workflow must restart process.
 */
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import semver from 'semver';
import { renderTemplate } from './renderer';
import { PromptError } from '../errors';
import type { IPromptLoader, PromptTemplate, RenderedPrompt } from './types';
import type { Message } from '../llm/types';

const FILE_RE = /^v(\d+\.\d+\.\d+)\.prompt\.ya?ml$/;

export interface FileSystemPromptLoaderOptions {
  baseDir: string;
}

export class FileSystemPromptLoader implements IPromptLoader {
  private readonly cache = new Map<string, PromptTemplate>();

  constructor(private readonly opts: FileSystemPromptLoaderOptions) {}

  async load(id: string, opts: { version: string }): Promise<PromptTemplate> {
    const resolved = await this.resolveVersion(id, opts.version);
    const cacheKey = `${id}@${resolved}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;

    const path = join(this.opts.baseDir, id, `v${resolved}.prompt.yaml`);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch (err) {
      throw new PromptError(`prompt file not readable: ${path}`, { cause: err });
    }
    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      throw new PromptError(`prompt YAML parse error: ${path}`, { cause: err });
    }
    const tpl = this.validateShape(parsed, id, resolved, path);
    this.cache.set(cacheKey, tpl);
    return tpl;
  }

  async render(
    id: string,
    vars: Record<string, unknown>,
    opts: { version: string },
  ): Promise<RenderedPrompt> {
    const tpl = await this.load(id, opts);
    const messages: Message[] = [];
    if (tpl.system) messages.push({ role: 'system', content: renderTemplate(tpl.system, vars) });
    messages.push({ role: 'user', content: renderTemplate(tpl.user, vars) });
    const hash = createHash('sha256')
      .update(JSON.stringify({ id: tpl.id, version: tpl.version, messages }))
      .digest('hex')
      .slice(0, 16);
    return { messages, hash };
  }

  private async resolveVersion(id: string, range: string): Promise<string> {
    let entries: string[];
    try {
      entries = await readdir(join(this.opts.baseDir, id));
    } catch (err) {
      throw new PromptError(`prompt dir missing: ${id}`, { cause: err });
    }
    const versions: string[] = [];
    for (const e of entries) {
      const m = FILE_RE.exec(e);
      if (m && m[1]) versions.push(m[1]);
    }
    if (versions.length === 0) {
      throw new PromptError(`no versioned prompts for "${id}"`);
    }
    const match = semver.maxSatisfying(versions, range);
    if (!match) {
      throw new PromptError(
        `no version satisfies "${range}" for "${id}" (have: ${versions.join(', ')})`,
      );
    }
    return match;
  }

  private validateShape(
    raw: unknown,
    id: string,
    version: string,
    path: string,
  ): PromptTemplate {
    if (!raw || typeof raw !== 'object') {
      throw new PromptError(`prompt not an object: ${path}`);
    }
    const r = raw as Record<string, unknown>;
    if (r.id !== id) {
      throw new PromptError(`prompt id mismatch: expected ${id} got ${String(r.id)}`);
    }
    if (r.version !== version) {
      throw new PromptError(
        `prompt version mismatch: file ${version} but content ${String(r.version)}`,
      );
    }
    if (typeof r.user !== 'string') {
      throw new PromptError(`prompt missing user string: ${path}`);
    }
    if (r.system !== undefined && typeof r.system !== 'string') {
      throw new PromptError(`prompt system must be string: ${path}`);
    }
    return {
      id,
      version,
      user: r.user,
      system: r.system as string | undefined,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
    };
  }
}
