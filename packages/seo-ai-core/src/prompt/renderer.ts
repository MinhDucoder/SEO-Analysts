import Handlebars from 'handlebars';
import { PromptError } from '../errors/index.js';

/**
 * Render a Handlebars template string with strict mode enabled.
 *
 * HTML escaping is ON by default — use triple-stash `{{{var}}}` only
 * when the variable content is trusted.
 *
 * SECURITY: The `source` template itself is treated as TRUSTED.
 * Never pass user-controlled template source to this function — Handlebars
 * has had template-injection CVEs historically. Only render templates
 * that ship inside your repository or come from an authenticated control
 * plane you own. Render-time `vars` ARE user-controlled but are escaped.
 *
 * Prefer `FileSystemPromptLoader` for production use — it enforces
 * versioned YAML storage + declared variable validation. This raw export
 * is intended for tests, ad-hoc tooling, and internal use.
 *
 * @throws PromptError on compile syntax errors or render-time failures
 *   (including unknown variables in strict mode).
 */
export function renderTemplate(source: string, vars: Record<string, unknown>): string {
  let compiled: HandlebarsTemplateDelegate;
  try {
    compiled = Handlebars.compile(source, { strict: true, noEscape: false });
  } catch (err) {
    throw new PromptError(`Handlebars compile failed: ${(err as Error).message}`, { cause: err });
  }
  try {
    return compiled(vars);
  } catch (err) {
    throw new PromptError(`Handlebars render failed: ${(err as Error).message}`, { cause: err });
  }
}
