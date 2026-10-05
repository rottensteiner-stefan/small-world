import { AiConfig, AiProviderType } from "./types.js";

export const DEFAULT_AI_CONFIGS: Record<AiProviderType, AiConfig> = {
  gemini: {
    provider: "gemini",
    apiKey: "",
    model: "gemini-1.5-flash",
    endpoint: "",
  },
  openai: {
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    endpoint: "",
  },
  claude: {
    provider: "claude",
    apiKey: "",
    model: "claude-3-5-haiku-20241022",
    endpoint: "",
  },
  ollama: {
    provider: "ollama",
    apiKey: "",
    model: "llama3.2-vision",
    endpoint: "http://localhost:11434/api/chat",
  },
  custom: {
    provider: "custom",
    apiKey: "",
    model: "default",
    endpoint: "",
  },
};

const STORAGE_KEY = "smallworld_ai_config";

export class AiConfigStorage {
  public static load(): AiConfig {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AiConfig>;
          const provider = parsed.provider || "gemini";
          const defaults = DEFAULT_AI_CONFIGS[provider] || DEFAULT_AI_CONFIGS.gemini;
          return {
            ...defaults,
            ...parsed,
          };
        }
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_AI_CONFIGS.gemini };
  }

  public static save(config: AiConfig): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    } catch {
      // LocalStorage quota or access issue
    }
  }
}
