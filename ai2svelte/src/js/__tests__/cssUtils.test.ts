import { describe, it, expect } from 'vitest';
import {
  toCamelCase,
  createShadowMixinFromCSS,
  createAnimationMixinFromCSS,
  parseSCSS,
  styleObjectToString,
} from '../main/utils/cssUtils';
import type { ShadowCardItem, AnimationItem } from '../main/Tabs/types';

describe('toCamelCase', () => {
  it('converts space-separated words to camelCase', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld');
  });

  it('lowercases the first character', () => {
    expect(toCamelCase('Hello World')).toBe('helloWorld');
  });

  it('handles a single word', () => {
    expect(toCamelCase('hello')).toBe('hello');
  });

  it('handles three words', () => {
    expect(toCamelCase('one two three')).toBe('oneTwoThree');
  });

  it('strips extra spaces', () => {
    const result = toCamelCase('hello  world');
    expect(result).not.toContain(' ');
  });
});

describe('createShadowMixinFromCSS', () => {
  const shadow: ShadowCardItem = {
    id: 'Subtle',
    shadow: 'box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);',
    active: false,
    dataName: 'subtle',
  };

  it('generates a mixin with the correct camelCase name', () => {
    const result = createShadowMixinFromCSS(shadow);
    expect(result).toContain('@mixin shadow-subtle($clr)');
  });

  it('replaces rgba(0, 0, 0, ...) with rgba($clr, ...)', () => {
    const result = createShadowMixinFromCSS(shadow);
    expect(result).toContain('rgba($clr,');
    expect(result).not.toContain('rgba(0, 0, 0,');
  });

  it('returns empty string when id is undefined', () => {
    const result = createShadowMixinFromCSS({ ...shadow, id: undefined as any });
    expect(result).toBe('');
  });

  it('includes an $alpha variable declaration', () => {
    const result = createShadowMixinFromCSS(shadow);
    expect(result).toContain('$alpha:');
  });
});

describe('createAnimationMixinFromCSS', () => {
  const animation: AnimationItem = {
    name: 'fadeIn',
    usage: '@include animation-fadeIn();',
    active: false,
    arguments: '()',
    animationRule: '@include animation-fadeIn();',
    definition: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
    candidate: 'fadeIn',
  };

  it('generates a mixin with the animation name', () => {
    const result = createAnimationMixinFromCSS(animation);
    expect(result).toContain('@mixin animation-fadeIn');
  });

  it('wraps keyframes in @at-root to avoid SASS mixed-decls issue', () => {
    const result = createAnimationMixinFromCSS(animation);
    expect(result).toContain('@at-root {');
  });

  it('includes the animation definition inside @at-root', () => {
    const result = createAnimationMixinFromCSS(animation);
    expect(result).toContain('@keyframes fadeIn');
  });

  it('includes CSS variables when provided', () => {
    const animWithVars: AnimationItem = {
      ...animation,
      cssVariables: { '--duration': '0.3s' },
    };
    const result = createAnimationMixinFromCSS(animWithVars);
    expect(result).toContain('--duration: 0.3s');
  });
});

describe('parseSCSS', () => {
  it('formats a declaration node', () => {
    const node = { type: 'decl', prop: 'color', value: 'red', important: false };
    expect(parseSCSS(node)).toBe('color : red');
  });

  it('appends !important for important declarations', () => {
    const node = { type: 'decl', prop: 'display', value: 'none', important: true };
    expect(parseSCSS(node)).toBe('display : none !important');
  });

  it('formats an atrule node', () => {
    const node = { type: 'atrule', name: 'include', params: 'mixin-name' };
    expect(parseSCSS(node)).toBe('@include mixin-name');
  });

  it('formats a comment node', () => {
    const node = { type: 'comment', text: 'a comment' };
    expect(parseSCSS(node)).toBe('/* a comment */');
  });

  it('returns empty string for unknown node types', () => {
    expect(parseSCSS({ type: 'unknown' })).toBe('');
  });
});

describe('styleObjectToString', () => {
  it('converts a styles object to CSS string', () => {
    const obj = { '.foo': ['color: red', 'display: block'] };
    const result = styleObjectToString(obj);
    expect(result).toContain('.foo {');
    expect(result).toContain('color: red');
    expect(result).toContain('display: block');
  });

  it('handles an empty selectors object', () => {
    expect(styleObjectToString({})).toBe('');
  });
});
