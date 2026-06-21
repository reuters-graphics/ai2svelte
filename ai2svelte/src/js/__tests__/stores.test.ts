import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
// @ts-ignore: postcss-safe-parser has no TypeScript declarations
import safeParser from 'postcss-safe-parser';
import postcss from 'postcss';
import {
  styles,
  stylesString,
  settingsObject,
  savedSettings,
  docName,
  cacheObj,
  cache,
} from '../main/stores';

async function makeResult(css: string) {
  return postcss().process(css, { parser: safeParser });
}

describe('stylesString derived store', () => {
  it('produces a string from a PostCSS result', async () => {
    const result = await makeResult('.foo { color: red; }');
    styles.set(result);
    const str = get(stylesString);
    expect(typeof str).toBe('string');
    expect(str).toContain('.foo');
  });

  it('produces an empty string from an empty PostCSS result', async () => {
    const result = await makeResult('');
    styles.set(result);
    const str = get(stylesString);
    expect(typeof str).toBe('string');
  });

  it('preserves multiple selectors', async () => {
    const result = await makeResult('.a { color: red; } .b { font-size: 14px; }');
    styles.set(result);
    const str = get(stylesString);
    expect(str).toContain('.a');
    expect(str).toContain('.b');
  });
});

describe('cache derived store', () => {
  beforeEach(() => {
    docName.set('');
    settingsObject.set({});
    // Clear any entries left by prior tests
    for (const key of Object.keys(cacheObj)) {
      delete cacheObj[key];
    }
  });

  it('populates cacheObj with the current settings when docName is set', async () => {
    const result = await makeResult('');
    styles.set(result);
    docName.set('design.ai');
    settingsObject.set({ scale: 2 });
    get(cache); // trigger the derived store
    expect(cacheObj['design.ai']).toBeDefined();
    expect(cacheObj['design.ai'].settingsObject).toEqual({ scale: 2 });
  });

  it('does not add a cacheObj entry when docName is empty', async () => {
    const result = await makeResult('');
    styles.set(result);
    docName.set('');
    settingsObject.set({ scale: 1 });
    get(cache);
    expect(Object.keys(cacheObj)).toHaveLength(0);
  });

  it('updates the cache entry when settings change', async () => {
    const result = await makeResult('');
    styles.set(result);
    docName.set('update-test.ai');
    settingsObject.set({ v: 1 });
    get(cache);
    settingsObject.set({ v: 2 });
    get(cache);
    expect(cacheObj['update-test.ai'].settingsObject).toEqual({ v: 2 });
  });
});
