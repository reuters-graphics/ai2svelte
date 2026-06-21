import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { constrain, debounce } from '../main/utils/utils';

describe('constrain', () => {
  it('returns value when within range', () => {
    expect(constrain(5, 0, 10)).toBe(5);
  });

  it('clamps to min when value is below range', () => {
    expect(constrain(-1, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above range', () => {
    expect(constrain(15, 0, 10)).toBe(10);
  });

  it('returns min when value equals min', () => {
    expect(constrain(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(constrain(10, 0, 10)).toBe(10);
  });

  it('returns clamped value when min equals max', () => {
    expect(constrain(7, 5, 5)).toBe(5);
  });

  it('works with negative ranges', () => {
    expect(constrain(-3, -10, -1)).toBe(-3);
    expect(constrain(0, -10, -1)).toBe(-1);
    expect(constrain(-15, -10, -1)).toBe(-10);
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delays execution by the specified timeout', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires only once for rapid calls within the delay window', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('a');
    debounced('b');
    debounced('c');

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('calls with the most recent arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('fires again after the delay resets between separate bursts', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('burst-1');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();

    debounced('burst-2');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
