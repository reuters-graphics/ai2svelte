import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Selector from '../Selector.svelte';

describe('Selector (RadioGroup)', () => {
  const labels = ['UI', 'Code', 'Preview'];
  const tooltips = ['UI mode', 'Code mode', 'Preview mode'];

  it('renders all label options as buttons', () => {
    render(Selector, { labels, value: 'UI', tooltipDescription: tooltips });
    const buttons = screen.getAllByRole('radio');
    expect(buttons).toHaveLength(3);
    expect(screen.getByText('UI')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('marks the initially selected option with data-checked="true"', () => {
    render(Selector, { labels, value: 'Code', tooltipDescription: tooltips });
    expect(screen.getByText('Code').closest('button')).toHaveAttribute('data-checked', 'true');
  });

  it('unmarks other options when one is selected', () => {
    render(Selector, { labels, value: 'UI', tooltipDescription: tooltips });
    expect(screen.getByText('Code').closest('button')).toHaveAttribute('data-checked', 'false');
    expect(screen.getByText('Preview').closest('button')).toHaveAttribute('data-checked', 'false');
  });

  it('has role="radiogroup" on the root container', () => {
    render(Selector, { labels, value: 'UI', tooltipDescription: tooltips });
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('has role="radio" on each option button', () => {
    render(Selector, { labels, value: 'UI', tooltipDescription: tooltips });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('updates data-checked when another option is clicked', async () => {
    render(Selector, { labels, value: 'UI', tooltipDescription: tooltips });
    const codeBtn = screen.getByText('Code').closest('button')!;
    await userEvent.click(codeBtn);
    expect(codeBtn).toHaveAttribute('data-checked', 'true');
    expect(screen.getByText('UI').closest('button')).toHaveAttribute('data-checked', 'false');
  });
});
