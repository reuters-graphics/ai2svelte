import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import { findMissingStyles, generateAllMixins } from '../cssUtils';

// Outside CEP, cssUtils falls back to the bundled default shadows/animations.
const styles = (css: string) => postcss().process(css, { from: undefined });

describe('missing styles', () => {
  const css = `
    .a { @include animation-pulse(); }
    .b { @include animation-notInLibrary(); }
    .c { @include shadow-alsoMissing(#000000); }
  `;

  it('generateAllMixins gives unknown styles an empty mixin', async () => {
    const mixins = generateAllMixins(await styles(css));
    expect(mixins).toContain('@mixin animation-pulse');
    expect(mixins).toContain('@mixin animation-notInLibrary($args...) {}');
    expect(mixins).toContain('@mixin shadow-alsoMissing($args...) {}');
  });

  it('empty mixins accept the includes that use them', async () => {
    const { compileString } = await import('sass');
    const missingOnly = `
      .b { @include animation-notInLibrary(); }
      .c { @include shadow-alsoMissing(#000000); }
    `;
    const scss = generateAllMixins(await styles(missingOnly)) + missingOnly;
    expect(() => compileString(scss)).not.toThrow();
  });

  it('findMissingStyles names only the unknown styles', async () => {
    expect(findMissingStyles(await styles(css))).toEqual([
      'shadow-alsoMissing',
      'animation-notInLibrary',
    ]);
  });

  it('reports nothing when every style is known', async () => {
    expect(
      findMissingStyles(await styles('.a { @include animation-pulse(); }')),
    ).toEqual([]);
  });
});
