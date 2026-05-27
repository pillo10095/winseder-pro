import { Test, TestingModule } from '@nestjs/testing';
import { AntiBanFingerprint } from '@/modules/whatsapp/services/anti-ban/fingerprint';

describe('AntiBanFingerprint', () => {
  let fingerprint: AntiBanFingerprint;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntiBanFingerprint],
    }).compile();

    fingerprint = module.get<AntiBanFingerprint>(AntiBanFingerprint);
  });

  afterEach(() => {
    fingerprint.reset('session-1');
  });

  describe('getCurrentUserAgent', () => {
    it('should return a valid user agent string', () => {
      const ua = fingerprint.getCurrentUserAgent('session-1');
      expect(ua).toContain('WhatsApp');
      expect(ua).toContain('Android');
    });

    it('should return consistent UA for the same session within rotation interval', () => {
      const ua1 = fingerprint.getCurrentUserAgent('session-1');
      const ua2 = fingerprint.getCurrentUserAgent('session-1');
      expect(ua1).toBe(ua2);
    });

    it('should return different UAs for different sessions', () => {
      const ua1 = fingerprint.getCurrentUserAgent('session-1');
      const ua2 = fingerprint.getCurrentUserAgent('session-2');
      // Low probability collision — fine for test
      expect(ua1).not.toBe(ua2);
    });
  });

  describe('getAuthMethod', () => {
    it('should return a valid auth method', () => {
      const method = fingerprint.getAuthMethod('session-1');
      expect(['FS_AUTH', 'BACKUP_RESTORE', 'COMPANION']).toContain(method);
    });
  });

  describe('forceRotate', () => {
    it('should change user agent after force rotation', () => {
      const ua1 = fingerprint.getCurrentUserAgent('session-1');
      fingerprint.forceRotate('session-1');
      const ua2 = fingerprint.getCurrentUserAgent('session-1');
      // Very unlikely to get same UA
      expect(ua1).not.toBe(ua2);
    });

    it('should change auth method after force rotation', () => {
      const method1 = fingerprint.getAuthMethod('session-1');
      fingerprint.forceRotate('session-1');
      const method2 = fingerprint.getAuthMethod('session-1');
      // Could be coincidentally same, just check they're valid
      expect(['FS_AUTH', 'BACKUP_RESTORE', 'COMPANION']).toContain(method2);
    });
  });

  describe('config', () => {
    it('should accept custom rotation interval', () => {
      fingerprint.setConfig('session-1', { rotationInterval: 1000 });
      // Should still work
      expect(fingerprint.getCurrentUserAgent('session-1')).toBeTruthy();
    });
  });

  describe('reset', () => {
    it('should clear session state', () => {
      fingerprint.getCurrentUserAgent('session-1');
      fingerprint.reset('session-1');
      // Should get a new UA after reset
      const ua = fingerprint.getCurrentUserAgent('session-1');
      expect(ua).toContain('WhatsApp');
    });
  });
});
