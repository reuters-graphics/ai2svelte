import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TabBar from '../TabBar.svelte';

describe('TabBar', () => {
  it('renders the three static tab buttons', () => {
    render(TabBar, { activeLabel: 'HOME' });
    expect(screen.getByRole('tab', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Styles' })).toBeInTheDocument();
  });

  it('does not render the Inspect tab when inspectMode is false', () => {
    render(TabBar, { activeLabel: 'HOME', inspectMode: false });
    expect(screen.queryByRole('tab', { name: 'Inspect' })).not.toBeInTheDocument();
  });

  it('renders the Inspect tab when inspectMode is true', () => {
    render(TabBar, { activeLabel: 'HOME', inspectMode: true });
    expect(screen.getByRole('tab', { name: 'Inspect' })).toBeInTheDocument();
  });

  it('has role="tablist" on the tab container', () => {
    render(TabBar, { activeLabel: 'HOME' });
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('marks the activeLabel tab as active via data-state', () => {
    render(TabBar, { activeLabel: 'SETTINGS' });
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'data-state',
      'active',
    );
  });

  it('marks non-active tabs as inactive', () => {
    render(TabBar, { activeLabel: 'HOME' });
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'data-state',
      'inactive',
    );
    expect(screen.getByRole('tab', { name: 'Styles' })).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });

  it('switches the active tab when a different tab is clicked', async () => {
    render(TabBar, { activeLabel: 'HOME' });
    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    await userEvent.click(settingsTab);
    expect(settingsTab).toHaveAttribute('data-state', 'active');
  });
});
