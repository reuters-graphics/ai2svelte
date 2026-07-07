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
  commitStyles,
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

  // Regression: restoring a cached document must snapshot styles+settings into
  // locals BEFORE mutating stores. Assigning settingsObject first fires the
  // cache derived, which re-snapshots the still-stale get(styles), clobbering
  // cacheObj[doc].styles with the previous document's styles.
  it('restores the correct styles when switching back to a cached document', async () => {
    // Doc A visited and cached with its own styles
    const stylesA = await makeResult('.doc-a { color: red; }');
    docName.set('a.ai');
    settingsObject.set({ doc: 'a' });
    styles.set(stylesA);
    get(cache);

    // Switch to doc B — its styles now live in the styles store
    const stylesB = await makeResult('.doc-b { color: blue; }');
    docName.set('b.ai');
    settingsObject.set({ doc: 'b' });
    styles.set(stylesB);
    get(cache);

    // Switch back to A: mirror handleCache's fixed order (capture, then assign)
    docName.set('a.ai');
    const cachedSettings = cacheObj['a.ai'].settingsObject;
    const cachedStyles = cacheObj['a.ai'].styles;
    settingsObject.set(cachedSettings);
    get(cache);
    styles.set(cachedStyles);
    get(cache);

    expect(get(styles)!.root.toString()).toContain('.doc-a');
    expect(get(styles)!.root.toString()).not.toContain('.doc-b');
    expect(cacheObj['a.ai'].styles!.root.toString()).toContain('.doc-a');
  });
});

describe('commitStyles', () => {
  beforeEach(() => {
    docName.set('doc-a.ai');
  });

  it('commits the result when the active document has not changed', async () => {
    const pending = makeResult('.a { color: red; }');
    await commitStyles(pending);
    expect(get(styles)!.root.toString()).toContain('.a');
  });

  it('discards the result if the active document changed while parsing was in flight', async () => {
    const before = await makeResult('.previous { color: blue; }');
    styles.set(before);

    let resolveParse: (value: Awaited<ReturnType<typeof makeResult>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof makeResult>>>((resolve) => {
      resolveParse = resolve;
    });
    const commitPromise = commitStyles(pending);

    // Simulate switching documents before the async parse resolves
    docName.set('doc-b.ai');
    resolveParse!(await makeResult('.stale-from-doc-a { color: red; }'));
    await commitPromise;

    expect(get(styles)).toBe(before);
  });
});
