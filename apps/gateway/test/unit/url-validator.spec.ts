import { describe, it, expect } from 'vitest';
import { validateUrlSafety } from '../../src/common/utils/url-validator';
import { BadRequestException } from '@nestjs/common';

describe('validateUrlSafety', () => {
  it('accepts a public https URL', async () => {
    const r = await validateUrlSafety('https://example.com/path');
    expect(r.domain).toBe('example.com');
    expect(r.href).toContain('https://example.com');
  });

  it('rejects ftp scheme', async () => {
    await expect(validateUrlSafety('ftp://example.com')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects localhost', async () => {
    await expect(validateUrlSafety('http://localhost/x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects literal 127.0.0.1', async () => {
    await expect(validateUrlSafety('http://127.0.0.1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects 192.168.x', async () => {
    await expect(validateUrlSafety('http://192.168.1.1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects 10.x', async () => {
    await expect(validateUrlSafety('http://10.0.0.1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects garbage', async () => {
    await expect(validateUrlSafety('not-a-url')).rejects.toBeInstanceOf(BadRequestException);
  });
});
