import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/auth/services/password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hashes a password and returns a bcrypt string', async () => {
    const h = await svc.hash('Passw0rd!');
    expect(h).toMatch(/^\$2[aby]\$12\$/);
  });

  it('compare returns true for the correct password', async () => {
    const h = await svc.hash('Passw0rd!');
    expect(await svc.compare('Passw0rd!', h)).toBe(true);
  });

  it('compare returns false for the wrong password', async () => {
    const h = await svc.hash('Passw0rd!');
    expect(await svc.compare('wrong', h)).toBe(false);
  });
});
