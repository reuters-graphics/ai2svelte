import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import InputRange from '../InputRange.svelte';

describe('InputRange (Slider)', () => {
  it('renders a slider element', () => {
    render(InputRange, { value: 50, start: 0, end: 100, stepper: 1 });
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the current value', () => {
    render(InputRange, { value: 30, start: 0, end: 100, stepper: 1 });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '30');
  });

  it('sets aria-valuemin to the start prop', () => {
    render(InputRange, { value: 10, start: 5, end: 50, stepper: 1 });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '5');
  });

  it('sets aria-valuemax to the end prop', () => {
    render(InputRange, { value: 10, start: 0, end: 200, stepper: 5 });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '200');
  });

  it('displays the current value in the range-value label', () => {
    render(InputRange, { value: 42, start: 0, end: 100, stepper: 1 });
    // The value label is a <p> element with the current value
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);
  });
});
