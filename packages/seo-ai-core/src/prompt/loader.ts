import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import semver from 'semver';
import type {
  IPromptLoader, PromptTemplate, RenderedPrompt, PromptListEntry,
} from './types.js';
import type { Message } from '../llm/types.js';
import { renderTemplate } from './renderer.js';
import { PromptError } from '../errors/index.js';

export interface PromptLoaderOptions {
  baseDir: string;
  cache?: boolean;
}

export class FileSystemPromptLoader implements IPromptLoader {
  private readonly baseDir: string;
  private readonly cacheEnabled: boolean;
  private readonly _cache = new Map<string, PromptTemplate>();

  constructor(opts: PromptLoaderOptions) {
    this.baseDir = opts.baseDir;
    this.cacheEnabled = opts.cache ?? true;
  }

  async load(id: string, range?: string): Promise<PromptTemplate> {
    const resolved = await this.resolveVersion(id, range);
    const cacheKey = `${id}@${resolved}`;
    const cached = this.cacheEnabled ? this._cache.get(cacheKey) : undefined;
    if (cached) return cached;

    const file = path.join(this.baseDir, id, `v${resolved}.prompt.yaml`);
    const raw = await fs.readFile(file, 'utf-8').catch((err) => {
      throw new PromptError(`Failed to read prompt file ${file}: ${(err as Error).message}`, { cause: err });
    });
    const parsed: unknown = parseYaml(raw);
    this.assertTemplateShape(parsed, id, resolved);
    const tpl = parsed as PromptTemplate;

    if (tpl.metadata?.deprecated) {
      console.warn(`[seo-ai-core] prompt ${id}@${resolved} is marked deprecated`);
    }

    if (this.cacheEnabled) this._cache.set(cacheKey, tpl);
    return tpl;
  }

  async render(
    id: string,
    vars: Record<string, unknown>,
    opts: { version?: string } = {},
  ): Promise<RenderedPrompt> {
    const tpl = await this.load(id, opts.version);

    const missing = tpl.variables.filter((v) => !Object.prototype.hasOwnProperty.call(vars, v));
    if (missing.length) {
      throw new PromptError(
        `Missing variables for ${tpl.id}@${tpl.version}: ${missing.join(', ')}`,
      );
    }

    const messages: Message[] = [];
    if (tpl.system) {
      messages.push({ role: 'system', content: renderTemplate(tpl.system, vars) });
    }
    messages.push({ role: 'user', content: renderTemplate(tpl.user, vars) });

    const hash = createHash('sha256')
      .update(`${tpl.id}@${tpl.version}::${JSON.stringify(messages)}`)
      .digest('hex')
      .slice(0, 16);

    return { id: tpl.id, version: tpl.version, messages, hash };
  }

  async list(): Promise<PromptListEntry[]> {
    const ids = await fs.readdir(this.baseDir).catch(() => [] as string[]);
    const out: PromptListEntry[] = [];
    for (const id of ids) {
      const stat = await fs.stat(path.join(this.baseDir, id)).catch(() => null);
      if (!stat?.isDirectory()) continue;
      try {
        const latest = await this.load(id);
        out.push({ id: latest.id, version: latest.version, metadata: latest.metadata });
      } catch (err) {
        console.warn(
          `[seo-ai-core] list(): skipping prompt "${id}": ${(err as Error).message}`,
        );
      }
    }
    return out;
  }

  private async resolveVersion(id: string, range?: string): Promise<string> {
    const dir = path.join(this.baseDir, id);
    const files = await fs.readdir(dir).catch(() => {
      throw new PromptError(`Prompt id not found: ${id} (looked in ${dir})`);
    });

    const candidates = files
      .filter((f) => f.startsWith('v') && f.endsWith('.prompt.yaml'))
      .map((f) => f.slice(1, -'.prompt.yaml'.length));

    const versions = candidates
      .filter((v) => {
        if (semver.valid(v) === null) {
          console.warn(
            `[seo-ai-core] resolveVersion("${id}"): skipping unparseable version "${v}" — must be strict semver (e.g. 1.0.0).`,
          );
          return false;
        }
        return true;
      })
      .sort(semver.rcompare);

    if (versions.length === 0) {
      throw new PromptError(`No valid prompt versions found for ${id} in ${dir}`);
    }

    if (!range) {
      return versions[0]!;
    }

    const matched = semver.maxSatisfying(versions, range);
    if (!matched) {
      throw new PromptError(`No version of "${id}" satisfies range "${range}". Available: ${versions.join(', ')}`);
    }
    return matched;
  }

  private assertTemplateShape(parsed: unknown, id: string, version: string): void {
    if (typeof parsed !== 'object' || parsed === null) {
      throw new PromptError(`Prompt ${id}@${version}: not a YAML object`);
    }
    const obj = parsed as Record<string, unknown>;
    if (obj['id'] !== id) {
      throw new PromptError(`Prompt id mismatch in file: expected "${id}", got "${String(obj['id'])}"`);
    }
    if (obj['version'] !== version) {
      throw new PromptError(`Prompt version mismatch in file: expected "${version}", got "${String(obj['version'])}"`);
    }
    if (typeof obj['user'] !== 'string') {
      throw new PromptError(`Prompt ${id}@${version}: missing required "user" field`);
    }
    if (!Array.isArray(obj['variables'])) {
      throw new PromptError(`Prompt ${id}@${version}: "variables" must be an array`);
    }
    if (typeof obj['metadata'] !== 'object' || obj['metadata'] === null) {
      throw new PromptError(`Prompt ${id}@${version}: missing required "metadata" object`);
    }
  }
}
