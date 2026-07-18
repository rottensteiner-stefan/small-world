export declare enum PerformanceTier {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH"
}
/**
 * Utility to detect the current device profile (e.g. mobile vs desktop) and performance tier.
 */
export declare class DeviceDetector {
    /**
     * Returns true if the application is running on a mobile device (phone or tablet).
     */
    static isMobile(): boolean;
    static get cores(): number;
    static get memoryGB(): number;
    static get pixelRatio(): number;
    static get screenWidth(): number;
    static get screenHeight(): number;
    /**
     * Uses experimental flags and hardware information to guess the device's performance capability.
     */
    static getPerformanceTier(): PerformanceTier;
}
