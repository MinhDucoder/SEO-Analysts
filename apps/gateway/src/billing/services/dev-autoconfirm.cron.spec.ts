import { describe, it, expect, vi } from 'vitest';
import { DevAutoConfirmCron } from './dev-autoconfirm.cron';

function make(flag: string, nodeEnv: string, pending: { refCode: string; amountVnd: number }[]) {
  const config = {
    get: vi.fn((k: string) =>
      k === 'BILLING_DEV_AUTOCONFIRM' ? flag : k === 'NODE_ENV' ? nodeEnv : undefined,
    ),
  };
  const intents = { findActivePending: vi.fn().mockResolvedValue(pending) };
  const reconciler = { handleWebhook: vi.fn().mockResolvedValue(undefined) };
  const cron = new DevAutoConfirmCron(config as never, intents as never, reconciler as never);
  return { cron, intents, reconciler };
}

describe('DevAutoConfirmCron', () => {
  it('is a no-op when the flag is off', async () => {
    const { cron, intents, reconciler } = make('false', 'development', [
      { refCode: 'SEOAAAAA', amountVnd: 99000 },
    ]);
    await cron.handle();
    expect(intents.findActivePending).not.toHaveBeenCalled();
    expect(reconciler.handleWebhook).not.toHaveBeenCalled();
  });

  it('is a no-op in production even if the flag is on', async () => {
    const { cron, reconciler } = make('true', 'production', [
      { refCode: 'SEOAAAAA', amountVnd: 99000 },
    ]);
    await cron.handle();
    expect(reconciler.handleWebhook).not.toHaveBeenCalled();
  });

  it('confirms each pending intent when enabled outside production', async () => {
    const { cron, reconciler } = make('true', 'development', [
      { refCode: 'SEOAAAAA', amountVnd: 99000 },
      { refCode: 'SEOBBBBB', amountVnd: 299000 },
    ]);
    await cron.handle();
    expect(reconciler.handleWebhook).toHaveBeenCalledTimes(2);
    expect(reconciler.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'SEOAAAAA', amount: 99000 }),
    );
    expect(reconciler.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'SEOBBBBB', amount: 299000 }),
    );
  });
});
