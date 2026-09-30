import { describe, it, expect } from 'vitest';
// @ts-ignore plain ExtendScript JS module, no types
import { parseDataAttributes } from '../../../../jsx/ilst/ai2svelte/aiUtils.js';

describe('parseDataAttributes', () => {
  it('splits unquoted pairs on newlines, ; and ,', () => {
    expect(parseDataAttributes('a: 1\rb: 2; c: 3, d: 4')).toEqual({
      a: '1',
      b: '2',
      c: '3',
      d: '4',
    });
  });

  it('keeps separators inside double quotes', () => {
    expect(parseDataAttributes('tags: "a, b; c", x: y')).toEqual({
      tags: 'a, b; c',
      x: 'y',
    });
  });

  it('keeps escaped quotes inside a quoted value', () => {
    expect(parseDataAttributes('q: "say \\"hi\\", ok"')).toEqual({
      q: 'say "hi", ok',
    });
  });

  it('strips quotes when not needed', () => {
    expect(parseDataAttributes('a: "road"')).toEqual({ a: 'road' });
  });

  it('does not throw on bad or unclosed quotes', () => {
    expect(parseDataAttributes('a: "bad \\x escape"')).toEqual({
      a: 'bad \\x escape',
    });
    expect(parseDataAttributes('a: "open, b: 2')).toEqual({ a: '"open', b: '2' });
  });

  it('handles empty notes', () => {
    expect(parseDataAttributes('')).toEqual({});
    expect(parseDataAttributes(undefined)).toEqual({});
  });
});
