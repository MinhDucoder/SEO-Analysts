import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/prompt/renderer.js';
import { PromptError } from '../src/errors/index.js';

describe('renderTemplate', () => {
  it('substitutes declared variables', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  it('escapes HTML by default to neutralize injection from LLM-bound payloads', () => {
    expect(renderTemplate('{{x}}', { x: '<script>' })).toBe('&lt;script&gt;');
  });

  it('triple-stash {{{x}}} preserves raw output for code blocks', () => {
    expect(renderTemplate('{{{x}}}', { x: '<code>' })).toBe('<code>');
  });

  it('throws PromptError when an unknown variable is referenced (strict mode)', () => {
    expect(() => renderTemplate('Hi {{missing}}', {})).toThrow(PromptError);
  });

  it('throws PromptError on syntax errors', () => {
    expect(() => renderTemplate('Hi {{name', { name: 'x' })).toThrow(PromptError);
  });
});
