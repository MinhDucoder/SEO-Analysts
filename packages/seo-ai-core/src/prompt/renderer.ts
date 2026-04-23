/**
 * @file Handlebars renderer in strict mode (unknown vars throw).
 * HTML-escapes by default — triple-brace is the escape hatch for
 * fully trusted content. This reduces prompt-injection surface from
 * user-supplied fields.
 */
import Handlebars from 'handlebars';
import { PromptError } from '../errors';

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  try {
    const tpl = Handlebars.compile(template, { strict: true, noEscape: false });
    return tpl(vars);
  } catch (err) {
    throw new PromptError(
      err instanceof Error ? err.message : 'prompt render failed',
      { cause: err },
    );
  }
}
