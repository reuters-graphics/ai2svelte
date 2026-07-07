import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ThemeSwitcher from '../ThemeSwitcher.svelte';

describe('ThemeSwitcher', () => {
  it('renders a button', () => {
    render(ThemeSwitcher, { theme: 'dark' });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('sets aria-pressed="true" when theme is dark (pressed state)', () => {
    render(ThemeSwitcher, { theme: 'dark' });
    // Toggle.Root passes aria-pressed based on the `pressed` prop
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets aria-pressed="false" when theme is light', () => {
    render(ThemeSwitcher, { theme: 'light' });
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets aria-label indicating the theme to switch to', () => {
    render(ThemeSwitcher, { theme: 'dark' });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Change to light theme');
  });

  it('toggles aria-pressed on click', async () => {
    render(ThemeSwitcher, { theme: 'dark' });
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates data-value attribute on toggle', async () => {
    render(ThemeSwitcher, { theme: 'dark' });
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('data-value', 'dark');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('data-value', 'light');
  });
});
