import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Alert from '../Alert.svelte';

describe('Alert', () => {
  it('renders the message text', () => {
    render(Alert, { message: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with the alert class', () => {
    const { container } = render(Alert, { message: 'Oops' });
    expect(container.querySelector('.alert')).toBeInTheDocument();
  });

  it('runs the action when its button is clicked', async () => {
    const run = vi.fn();
    render(Alert, { message: '2 failed', action: { label: 'Retry', run } });
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(run).toHaveBeenCalledOnce();
  });
});
