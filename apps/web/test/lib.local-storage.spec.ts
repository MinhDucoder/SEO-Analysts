import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredInput,
  setStoredInput,
} from '../src/lib/local-storage';

beforeEach(() => window.localStorage.clear());

describe('api key storage', () => {
  it('round-trip', () => {
    setStoredApiKey('sk_test_xyz');
    expect(getStoredApiKey()).toBe('sk_test_xyz');
  });

  it('setting null clears', () => {
    setStoredApiKey('sk_test_xyz');
    setStoredApiKey(null);
    expect(getStoredApiKey()).toBeNull();
  });
});

describe('input draft storage', () => {
  it('round-trip', () => {
    setStoredInput({ type: 'html', html: '<p>hi</p>' });
    expect(getStoredInput()).toEqual({ type: 'html', html: '<p>hi</p>' });
  });

  it('setting null clears', () => {
    setStoredInput({ type: 'url', url: 'https://x' });
    setStoredInput(null);
    expect(getStoredInput()).toBeNull();
  });
});
