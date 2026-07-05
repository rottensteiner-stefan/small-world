/// src/core/DeviceDetector.ts

export enum PerformanceTier {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

/**
 * Utility to detect the current device profile (e.g. mobile vs desktop) and performance tier.
 */
export class DeviceDetector {
  /**
   * Returns true if the application is running on a mobile device (phone or tablet).
   */
  public static isMobile(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    const ua = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return true;
    }

    // iPadOS 13+ workaround (identifies as MacIntel but has touch points)
    if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
      return true;
    }

    return false;
  }

  /**
   * Uses experimental flags and hardware information to guess the device's performance capability.
   */
  public static getPerformanceTier(): PerformanceTier {
    if (typeof navigator === "undefined") return PerformanceTier.MEDIUM;

    let score = 0;

    // 1. Hardware Concurrency (Logical CPU cores)
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) score += 2;
    else if (cores > 4) score += 1;

    // 2. Device Memory (Experimental Web API - returns RAM in GB, capped usually at 8)
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
    if (memory >= 8) score += 2;
    else if (memory > 4) score += 1;

    // 3. Next-Gen API presence (WebGPU)
    if (navigator.gpu) score += 1;

    // 4. Form factor penalty (Mobile devices thermally throttle much faster)
    if (this.isMobile()) {
      score -= 2;
    }

    if (score >= 4) return PerformanceTier.HIGH;
    if (score >= 2) return PerformanceTier.MEDIUM;
    return PerformanceTier.LOW;
  }
}
