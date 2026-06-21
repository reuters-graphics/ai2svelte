import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import InputText from '../InputText.svelte';

describe('InputText', () => {
  it('renders a text input element', () => {
    render(InputText, { label: 'Name', value: '' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('reflects the initial value in the input', () => {
    render(InputText, { label: 'Name', value: 'initial' });
    expect(screen.getByRole('textbox')).toHaveValue('initial');
  });

  it('updates the DOM value as the user types', async () => {
    render(InputText, { label: 'Name', value: '' });
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('generates a unique id from the label prop', () => {
    render(InputText, { label: 'my-field', value: '' });
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'select-my-field');
  });
});
