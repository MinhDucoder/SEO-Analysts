import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/prompt/renderer';
import { PromptError } from '../src/errors';

describe('renderTemplate (Handlebars strict)', () => {
  it('renders simple variables', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'Bob' })).toBe('Hello Bob');
  });

  it('renders #each blocks', () => {
    const out = renderTemplate('{{#each xs}}- {{this}}\n{{/each}}', { xs: ['a', 'b'] });
    expect(out).toBe('- a\n- b\n');
  });

  it('throws PromptError on unknown variable (strict mode)', () => {
    expect(() => renderTemplate('Hi {{missing}}', {})).toThrow(PromptError);
  });

  it('HTML-escapes user content by default', () => {
    expect(renderTemplate('{{x}}', { x: '<script>' })).toBe('&lt;script&gt;');
  });

  it('supports triple-brace for literal output when needed', () => {
    expect(renderTemplate('{{{x}}}', { x: '<b>' })).toBe('<b>');
  });
});
