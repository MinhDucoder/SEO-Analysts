import { describe, it, expect } from 'vitest';
import { buildPaginationMeta, clampPagination } from '../../src/common/utils/pagination.util';

describe('buildPaginationMeta', () => {
  it('computes totalPages by ceil(total / limit)', () => {
    expect(buildPaginationMeta(45, 1, 20)).toEqual({ total: 45, page: 1, limit: 20, totalPages: 3 });
  });

  it('returns at least 1 page even when there are zero rows', () => {
    expect(buildPaginationMeta(0, 1, 20).totalPages).toBe(1);
  });

  it('does not round a perfectly divisible total up', () => {
    expect(buildPaginationMeta(40, 2, 20).totalPages).toBe(2);
  });

  it('preserves the requested page and limit verbatim', () => {
    const meta = buildPaginationMeta(100, 3, 25);
    expect(meta.page).toBe(3);
    expect(meta.limit).toBe(25);
  });
});

describe('clampPagination', () => {
  it('defaults to page 1 / limit 20 when nothing is supplied', () => {
    expect(clampPagination()).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('floors page at 1 for zero, negative, or NaN input', () => {
    expect(clampPagination(0, 10).page).toBe(1);
    expect(clampPagination(-5, 10).page).toBe(1);
    expect(clampPagination(Number.NaN, 10).page).toBe(1);
  });

  it('caps limit at 100 and floors it at 1', () => {
    expect(clampPagination(1, 999).limit).toBe(100);
    expect(clampPagination(1, 0).limit).toBe(20); // 0 is falsy → default 20
    expect(clampPagination(1, -3).limit).toBe(1);
  });

  it('derives skip from the clamped page and limit', () => {
    expect(clampPagination(3, 25).skip).toBe(50);
    expect(clampPagination(1, 25).skip).toBe(0);
  });

  it('coerces numeric strings (query params arrive as strings)', () => {
    expect(clampPagination('2' as unknown as number, '15' as unknown as number)).toEqual({
      page: 2,
      limit: 15,
      skip: 15,
    });
  });
});
