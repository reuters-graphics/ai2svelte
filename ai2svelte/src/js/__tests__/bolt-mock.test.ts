import { describe, it, expect, vi } from 'vitest';
import { evalTS } from '../__mocks__/bolt';

// Smoke test: confirms the evalTS mock is callable and returns a resolved promise,
// proving the bolt mock is wired correctly before any component tests run.
describe('evalTS mock', () => {
  it('is a spy function', () => {
    expect(vi.isMockFunction(evalTS)).toBe(true);
  });

  it('resolves without throwing', async () => {
    await expect(evalTS('getDocumentName')).resolves.not.toThrow();
  });

  it('returns an empty object by default', async () => {
    const result = await evalTS('getDocumentName');
    expect(result).toEqual({});
  });
});
