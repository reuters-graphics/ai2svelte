import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Pill from '../Pill.svelte';

describe('Pill', () => {
  it('renders the name text', () => {
    render(Pill, { name: 'p.g-pstyle0', active: false, onRemove: vi.fn(), onClick: vi.fn() });
    expect(screen.getByText('p.g-pstyle0')).toBeInTheDocument();
  });

  it('fires onClick when clicking the button body (not the remove icon)', async () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(Pill, { name: 'selector', active: false, onRemove, onClick });
    // In jsdom all elements sit at position (0,0) with zero dimensions, so
    // userEvent's pointer simulation can land on the inner SVG child instead
    // of the <button>. fireEvent dispatches the click directly on the <p>
    // with e.target = <p> (not SVGElement), ensuring onClick() is called.
    fireEvent.click(screen.getByText('selector'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('fires onRemove when clicking the SVG remove icon', async () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(Pill, { name: 'selector', active: false, onRemove, onClick });
    // The SVG has aria-label "Remove selector"
    const svg = screen.getByRole('img', { name: /Remove selector/i });
    await userEvent.click(svg);
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the active class when active prop is true', () => {
    const { container } = render(Pill, { name: 'active-pill', active: true, onRemove: vi.fn(), onClick: vi.fn() });
    expect(container.querySelector('.active')).toBeInTheDocument();
  });

  it('does not apply the active class when active is false', () => {
    const { container } = render(Pill, { name: 'inactive-pill', active: false, onRemove: vi.fn(), onClick: vi.fn() });
    expect(container.querySelector('.active')).not.toBeInTheDocument();
  });
});
