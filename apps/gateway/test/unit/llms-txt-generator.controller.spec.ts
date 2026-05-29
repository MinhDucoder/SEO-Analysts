import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { LlmsTxtGeneratorController } from '../../src/tools/controllers/llms-txt-generator.controller';
import { LlmsTxtGeneratorService } from '../../src/tools/services/llms-txt-generator.service';
import type { GenerateResult } from '../../src/tools/services/llms-txt-generator.service';

// Bypass guards for unit testing — guards are integration-tested at e2e layer
vi.mock('../../src/auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class { canActivate() { return true; } },
}));
vi.mock('../../src/common/guards/plan.guard', () => ({
  PlanGuard: class { canActivate() { return true; } },
}));

describe('LlmsTxtGeneratorController', () => {
  let controller: LlmsTxtGeneratorController;
  const mockService = { generate: vi.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LlmsTxtGeneratorController],
      providers: [{ provide: LlmsTxtGeneratorService, useValue: mockService }],
    }).compile();
    controller = module.get(LlmsTxtGeneratorController);
  });

  it('delegates to service and returns GenerateResult', async () => {
    const result: GenerateResult = {
      url: 'https://acme.test/',
      content: '# Acme\n\n> Best tools\n\n## Main pages\n- [/docs](https://acme.test/docs)\n',
      sizeBytes: 60,
      warnings: [],
    };
    mockService.generate.mockResolvedValueOnce(result);

    const response = await controller.generate({ url: 'https://acme.test' });
    expect(mockService.generate).toHaveBeenCalledWith('https://acme.test', undefined);
    expect(response).toEqual(result);
  });

  it('passes includeSections to the service', async () => {
    const result: GenerateResult = {
      url: 'https://acme.test/',
      content: '# Acme\n\n',
      sizeBytes: 9,
      warnings: [],
    };
    mockService.generate.mockResolvedValueOnce(result);

    await controller.generate({ url: 'https://acme.test', includeSections: ['docs', 'api'] });
    expect(mockService.generate).toHaveBeenCalledWith('https://acme.test', ['docs', 'api']);
  });

  it('propagates service errors', async () => {
    mockService.generate.mockRejectedValueOnce(new Error('SSRF_BLOCKED'));
    await expect(controller.generate({ url: 'https://acme.test' })).rejects.toThrow('SSRF_BLOCKED');
  });
});
