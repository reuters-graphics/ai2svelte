import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Button from '../Button.svelte';

describe('Button', () => {
  it('renders the text prop as button label', () => {
    render(Button, { text: 'Export' });
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('fires the onClick callback when clicked', async () => {
    const onClick = vi.fn();
    render(Button, { text: 'Go', onClick });
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when the button is disabled', async () => {
    const onClick = vi.fn();
    render(Button, { text: 'Go', onClick, disabled: true });
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the disabled attribute when disabled prop is true', () => {
    render(Button, { text: 'Nope', disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies the minimal class when the minimal prop is true', () => {
    render(Button, { text: 'Min', minimal: true });
    expect(screen.getByRole('button')).toHaveClass('minimal');
  });

  it('does not apply the minimal class by default', () => {
    render(Button, { text: 'Full' });
    expect(screen.getByRole('button')).not.toHaveClass('minimal');
  });
});
