import { describe, expect, it } from "vitest";
import { defaultStyle, newFront, particleAt, type Particle } from "../model";

const source = { x: 0, y: 0, w: 200, h: 100 };
const style = defaultStyle("vertical");

function particle(column: number): Particle {
  return {
    index: 1,
    column,
    heading: 0,
    pace: 1,
    drift: 20,
    sway: 0,
    swayRate: 0,
    twinkleRate: 0,
    phase: 0,
    life: 2,
    size: 1,
    brightness: 1,
    hop: 1,
    hopOffset: 0,
  };
}

function front(flying: number, moved = 1) {
  const f = newFront();
  f.launched = true;
  f.oy = 50;
  f.radius = 150;
  f.moved = moved;
  f.flying = flying;
  return f;
}

describe("particleAt", () => {
  it("fans out with a downward bow", () => {
    const center = particleAt(particle(0), front(0.5), source, style);
    const edge = particleAt(particle(0.9), front(0.5), source, style);
    const notFanned = particleAt(particle(0.9), front(0.5, 0), source, style);

    expect(center.y).toBeGreaterThan(50);
    expect(edge.y).toBeGreaterThan(50);
    expect(edge.y - 50).toBeLessThan(center.y - 50);
    expect(edge.x).toBeGreaterThan(notFanned.x);
  });

  it("keeps the particle spread centered regardless of front lean", () => {
    const centeredFront = front(0.5);
    const leanedFront = front(0.5);
    leanedFront.ox = 150;
    leanedFront.oy = 80;
    leanedFront.tilt = 0.45;

    expect(particleAt(particle(0.6), leanedFront, source, style)).toEqual(
      particleAt(particle(0.6), centeredFront, source, style),
    );
  });

  it("slows particle drift as the particle reaches the end of its life", () => {
    const early = particleAt(particle(0), front(0.5), source, style).y;
    const mid = particleAt(particle(0), front(1), source, style).y;
    const late = particleAt(particle(0), front(1.5), source, style).y;
    const atEnd = particleAt(particle(0), front(2), source, style).y;

    expect(mid - early).toBeGreaterThan(atEnd - late);
  });
});
