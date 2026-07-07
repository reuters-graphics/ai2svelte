import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import * as Svelte from 'svelte';
import { get } from 'svelte/store';
// @ts-ignore: postcss-safe-parser has no TypeScript declarations
import safeParser from 'postcss-safe-parser';
import postcss from 'postcss';
import { triggerConfetti, ai2svelteInProgress, styles } from '../../../stores';
import RunButton from '../RunButton.svelte';
import { evalTS } from '../../../../__mocks__/bolt';

// RunButton calls evalTS only when window.cep is truthy.
// These tests stub window.cep to a minimal object so the CEP-path runs with
// the evalTS mock in place instead of the real bridge.

function stubCep() {
  vi.stubGlobal('cep', { fs: {} });
}

function unstubCep() {
  vi.unstubAllGlobals();
}

describe('RunButton', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    triggerConfetti.set(false);
    ai2svelteInProgress.set(false);
    // stylesString derived store reads `styles.root.toString()`.
    // Without an initialised PostCSS result it throws at subscription time.
    const emptyResult = await postcss().process('', { parser: safeParser });
    styles.set(emptyResult);
  });

  describe('without CEP (non-Illustrator environment)', () => {
    it('renders the Run AI2SVELTE button', () => {
      render(RunButton);
      expect(screen.getByRole('button', { name: /Run AI2SVELTE/i })).toBeInTheDocument();
    });

    it('sets triggerConfetti when clicked outside of CEP', async () => {
      render(RunButton);
      await userEvent.click(screen.getByRole('button'));
      await waitFor(() => expect(get(triggerConfetti)).toBe(true));
    });
  });

  describe('with CEP stub (simulates Illustrator environment)', () => {
    // runAi2Svelte() has a delay(500) before calling evalTS. We use fake timers
    // so tests can advance past it deterministically without real-time waits.
    // userEvent.setup({ delay: null }) disables user-event's own internal delays
    // so that click() resolves immediately even under fake timers.
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      stubCep();
      evalTS.mockResolvedValue([]);
      vi.useFakeTimers();
      user = userEvent.setup({ delay: null });
    });
    afterEach(() => {
      unstubCep();
      vi.useRealTimers();
    });

    it('calls evalTS("runAi2Svelte") with settings and CSS code when clicked', async () => {
      render(RunButton);
      await user.click(screen.getByRole('button'));
      // Advance past the 500ms delay inside runAi2Svelte
      await vi.runAllTimersAsync();
      expect(evalTS).toHaveBeenCalledWith(
        'runAi2Svelte',
        expect.objectContaining({
          settings: expect.any(Object),
          code: expect.any(Object),
        }),
      );
    });

    it('sets triggerConfetti to true after a successful run', async () => {
      render(RunButton);
      await user.click(screen.getByRole('button'));
      await vi.runAllTimersAsync();
      expect(get(triggerConfetti)).toBe(true);
    });

    it('disables the button while the run is in progress', async () => {
      // Make evalTS hang to observe the in-progress state
      let resolve!: (v: string[]) => void;
      evalTS.mockReturnValueOnce(new Promise<string[]>((r) => (resolve = r)));

      render(RunButton);
      const btn = screen.getByRole('button');
      await user.click(btn);

      // Button is disabled synchronously by the onclick handler before any await
      expect(btn).toBeDisabled();

      // Resolve to let the test clean up
      resolve([]);
      await vi.runAllTimersAsync();
    });

    it('shows an error toast when evalTS rejects', async () => {
      // Spy on Svelte's mount so we can verify RunButton called it with the
      // correct Toast component and error message, without relying on whether
      // the imperatively-mounted Toast's onMount fires in the fake-timer context.
      const mountSpy = vi.spyOn(Svelte, 'mount');
      evalTS.mockRejectedValueOnce(new Error('ExtendScript crashed'));

      render(RunButton);
      await user.click(screen.getByRole('button'));
      await vi.runAllTimersAsync();

      expect(mountSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          props: expect.objectContaining({
            message: expect.stringMatching(/Error running ai2svelte/),
          }),
        }),
      );
    });

    it('does not set triggerConfetti on error', async () => {
      evalTS.mockRejectedValueOnce(new Error('Boom'));

      render(RunButton);
      await user.click(screen.getByRole('button'));
      await vi.runAllTimersAsync();

      expect(get(triggerConfetti)).toBe(false);
      expect(get(ai2svelteInProgress)).toBe(false);
    });

    it('calls evalTS("setVariable") to persist settings after a successful run', async () => {
      render(RunButton);
      await user.click(screen.getByRole('button'));
      await vi.runAllTimersAsync();
      expect(evalTS).toHaveBeenCalledWith('setVariable', 'ai-settings', expect.any(Object));
    });
  });
});
