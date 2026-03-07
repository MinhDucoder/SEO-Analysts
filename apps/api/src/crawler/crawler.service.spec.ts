import { Test, TestingModule } from '@nestjs/testing';
import { CrawlerService } from './crawler.service';

describe('CrawlerService', () => {
  let service: CrawlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrawlerService],
    }).compile();

    service = module.get<CrawlerService>(CrawlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAllowedByRobotsTxt', () => {
    it('should return true when no robots.txt', () => {
      expect(service.isAllowedByRobotsTxt(null, '/page')).toBe(true);
    });

    it('should block disallowed paths', () => {
      const robotsTxt = 'User-agent: *\nDisallow: /admin\nDisallow: /private';
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/admin')).toBe(false);
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/admin/settings')).toBe(
        false,
      );
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/private')).toBe(false);
    });

    it('should allow non-disallowed paths', () => {
      const robotsTxt = 'User-agent: *\nDisallow: /admin';
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/page')).toBe(true);
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/')).toBe(true);
    });

    it('should handle specific user agent', () => {
      const robotsTxt = 'User-agent: SEOAnalyzerBot\nDisallow: /secret';
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/secret')).toBe(false);
      expect(service.isAllowedByRobotsTxt(robotsTxt, '/public')).toBe(true);
    });
  });
});
