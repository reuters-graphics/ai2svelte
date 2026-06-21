import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
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
});
