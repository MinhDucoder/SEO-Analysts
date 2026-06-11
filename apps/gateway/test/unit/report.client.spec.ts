import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportGrpcClient } from '../../src/infra/grpc/report.client';

/**
 * Regression guard for the share-link gRPC field-name bug: the proto field is
 * `share_token` → camelCase `shareToken` (keepCase:false). Sending `{ token }`
 * drops the value off the wire and the report service reads `undefined`, so
 * every shared link 404s. The gateway MUST send `{ shareToken }`.
 */
describe('ReportGrpcClient.getSharedReport — gRPC field name', () => {
  const fakeClient: any = {
    GetSharedReport: vi.fn((_req: unknown, cb: (e: Error | null, r?: unknown) => void) =>
      cb(null, { ok: true }),
    ),
  };
  const fakeFactory: any = { create: vi.fn(() => fakeClient) };
  const fakeConfig: any = { get: vi.fn(() => 'localhost:50055') };
  let client: ReportGrpcClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ReportGrpcClient(fakeFactory, fakeConfig);
    client.onModuleInit();
  });

  it('sends the token under the `shareToken` key (proto share_token)', async () => {
    await client.getSharedReport('tok-123');
    expect(fakeClient.GetSharedReport).toHaveBeenCalledWith(
      { shareToken: 'tok-123' },
      expect.any(Function),
    );
  });

  it('does not send the legacy `token` key', async () => {
    await client.getSharedReport('tok-123');
    const sentReq = fakeClient.GetSharedReport.mock.calls[0][0];
    expect(sentReq).not.toHaveProperty('token');
  });
});
