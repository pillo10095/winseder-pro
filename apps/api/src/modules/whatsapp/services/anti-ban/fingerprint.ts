import { Injectable } from '@nestjs/common';

interface FingerprintConfig {
  /** Minimum interval in ms between UA rotations (default: 3600000 = 1 hour) */
  rotationInterval: number;
}

@Injectable()
export class AntiBanFingerprint {
  private readonly userAgents = [
    'WhatsApp/2.24.9.34 Android/14 Device/Samsung-S24',
    'WhatsApp/2.24.8.85 Android/13 Device/Xiaomi-RedmiNote12',
    'WhatsApp/2.24.10.21 Android/14 Device/Google-Pixel8',
    'WhatsApp/2.24.7.15 Android/12 Device/Motorola-Edge40',
    'WhatsApp/2.24.11.10 Android/14 Device/OnePlus-12',
    'WhatsApp/2.24.9.34 Android/13 Device/Oppo-Reno10',
    'WhatsApp/2.24.10.21 Android/14 Device/Vivo-X100',
    'WhatsApp/2.24.8.85 Android/13 Device/Honor-Magic5',
  ];

  private readonly authMethods = [
    'FS_AUTH',
    'BACKUP_RESTORE',
    'COMPANION',
  ];

  private readonly configs = new Map<string, FingerprintConfig & { lastRotation: number; currentUa: string; currentAuthMethod: string }>();

  private readonly defaultConfig: FingerprintConfig = {
    rotationInterval: 3_600_000, // 1 hour
  };

  setConfig(sessionId: string, config: Partial<FingerprintConfig>) {
    const existing = this.configs.get(sessionId) ?? this.createDefaultState();
    this.configs.set(sessionId, {
      ...existing,
      ...config,
    });
  }

  getCurrentUserAgent(sessionId: string): string {
    const state = this.getOrCreateState(sessionId);
    this.maybeRotate(sessionId, state);
    return state.currentUa;
  }

  getAuthMethod(sessionId: string): string {
    const state = this.getOrCreateState(sessionId);
    this.maybeRotate(sessionId, state);
    return state.currentAuthMethod;
  }

  private getOrCreateState(sessionId: string) {
    let state = this.configs.get(sessionId);
    if (!state) {
      state = this.createDefaultState();
      this.configs.set(sessionId, state);
    }
    return state;
  }

  private createDefaultState() {
    return {
      ...this.defaultConfig,
      lastRotation: Date.now(),
      currentUa: this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
      currentAuthMethod: this.authMethods[Math.floor(Math.random() * this.authMethods.length)],
    };
  }

  private maybeRotate(sessionId: string, state: typeof this.configs extends Map<string, infer T> ? T : never): void {
    const now = Date.now();
    if (now - state.lastRotation >= state.rotationInterval) {
      state.currentUa = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      state.currentAuthMethod = this.authMethods[Math.floor(Math.random() * this.authMethods.length)];
      state.lastRotation = now;
      this.configs.set(sessionId, { ...state });
    }
  }

  /** Force immediate rotation */
  forceRotate(sessionId: string) {
    const state = this.getOrCreateState(sessionId);
    state.currentUa = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    state.currentAuthMethod = this.authMethods[Math.floor(Math.random() * this.authMethods.length)];
    state.lastRotation = Date.now();
    this.configs.set(sessionId, { ...state });
  }

  reset(sessionId: string) {
    this.configs.delete(sessionId);
  }
}
