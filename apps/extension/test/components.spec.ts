import { describe, it, expect } from 'vitest';
import { buttonClassName } from '../components/Button';
import { badgeClassName } from '../components/Badge';
import { computeArc } from '../components/ScoreRing';

describe('buttonClassName(variant, size, loading)', () => {
  it('primary md default', () => {
    const cn = buttonClassName({ variant: 'primary', size: 'md' });
    expect(cn).toContain('btn');
    expect(cn).toContain('btn-primary');
    expect(cn).toContain('btn-md');
  });
  it('secondary sm', () => {
    const cn = buttonClassName({ variant: 'secondary', size: 'sm' });
    expect(cn).toContain('btn-secondary');
    expect(cn).toContain('btn-sm');
  });
  it('ghost', () => {
    const cn = buttonClassName({ variant: 'ghost', size: 'md' });
    expect(cn).toContain('btn-ghost');
  });
  it('loading adds loading class', () => {
    const cn = buttonClassName({ variant: 'primary', size: 'md', loading: true });
    expect(cn).toContain('btn-loading');
  });
});

describe('badgeClassName(variant, tone)', () => {
  it('env test', () => {
    expect(badgeClassName('env', 'test')).toBe('badge badge-env badge-test');
  });
  it('env live', () => {
    expect(badgeClassName('env', 'live')).toBe('badge badge-env badge-live');
  });
  it('cached (tone defaulted to neutral)', () => {
    expect(badgeClassName('cached')).toContain('badge-cached');
  });
  it('severity error', () => {
    expect(badgeClassName('severity', 'error')).toContain('badge-error');
  });
});

describe('computeArc(score, radius)', () => {
  it('score 100 → dashoffset 0 (full circle)', () => {
    const r = 40;
    const { circumference, offset } = computeArc(100, r);
    expect(circumference).toBeCloseTo(2 * Math.PI * 40, 2);
    expect(offset).toBeCloseTo(0, 2);
  });
  it('score 0 → dashoffset === circumference (empty)', () => {
    const { circumference, offset } = computeArc(0, 40);
    expect(offset).toBeCloseTo(circumference, 2);
  });
  it('score 50 → half', () => {
    const { circumference, offset } = computeArc(50, 40);
    expect(offset).toBeCloseTo(circumference / 2, 2);
  });
  it('clamps negative', () => {
    const { circumference, offset } = computeArc(-10, 40);
    expect(offset).toBeCloseTo(circumference, 2);
  });
  it('clamps >100', () => {
    const { circumference, offset } = computeArc(150, 40);
    expect(offset).toBeCloseTo(0, 2);
  });
});
