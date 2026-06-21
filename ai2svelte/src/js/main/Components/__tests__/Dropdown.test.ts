import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Dropdown from '../Dropdown.svelte';

describe('Dropdown', () => {
  const options = ['Helvetica', 'Arial', 'Georgia'];

  it('renders a trigger button with the initial value', () => {
    render(Dropdown, { options, value: 'Arial' });
    // bits-ui Select.Trigger renders a button; the current value text appears inside
    expect(screen.getAllByText('Arial').length).toBeGreaterThan(0);
  });

  it('has aria-expanded="false" when closed', () => {
    render(Dropdown, { options, value: 'Helvetica' });
    // bits-ui Select.Trigger renders a <button> with aria-expanded and aria-haspopup.
    // It does NOT carry role="combobox" — the native button role stays as-is.
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('sets aria-expanded="true" after the trigger is clicked', async () => {
    render(Dropdown, { options, value: 'Helvetica' });
    const trigger = screen.getByRole('button');
    await userEvent.click(trigger);
    // bits-ui updates ARIA state asynchronously after pointer events; waitFor
    // gives Svelte and bits-ui a chance to flush state before asserting.
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
  });

  it('shows all options in the list after opening', async () => {
    render(Dropdown, { options, value: 'Helvetica' });
    await userEvent.click(screen.getByRole('button'));
    for (const opt of options) {
      await waitFor(() => expect(screen.getAllByText(opt).length).toBeGreaterThan(0));
    }
  });

  it('marks the current value as active via data-active', async () => {
    render(Dropdown, { options, value: 'Arial' });
    await userEvent.click(screen.getByRole('button'));
    // The active li item has data-active="true"
    await waitFor(() => {
      const activeItems = document.querySelectorAll('[data-active="true"]');
      expect(activeItems.length).toBeGreaterThan(0);
    });
  });
});
