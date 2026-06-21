import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import Toast from '../Toast.svelte';

// Toast uses onMount to set its visible state, then a setTimeout to dismiss.
// We use fake timers to control the dismissal and waitFor to let the DOM settle
// after each timer advancement.
describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the message text after onMount fires', async () => {
    render(Toast, { message: 'Saved!', duration: 2000 });
    await waitFor(() => expect(screen.getByText(/Saved!/)).toBeInTheDocument());
  });

  it('disappears after the duration elapses', async () => {
    render(Toast, { message: 'Gone soon', duration: 1000 });
    await waitFor(() => expect(screen.getByText(/Gone soon/)).toBeInTheDocument());

    // vi.runAllTimersAsync fires the dismiss setTimeout AND drains the
    // microtask queue so Svelte's DOM update completes before we assert.
    await vi.runAllTimersAsync();
    expect(screen.queryByText(/Gone soon/)).not.toBeInTheDocument();
  });

  it('is still visible just before the duration elapses', async () => {
    render(Toast, { message: 'Persistent', duration: 5000 });
    await waitFor(() => expect(screen.getByText(/Persistent/)).toBeInTheDocument());

    vi.advanceTimersByTime(4999);
    await waitFor(() => expect(screen.getByText(/Persistent/)).toBeInTheDocument());
  });
});
