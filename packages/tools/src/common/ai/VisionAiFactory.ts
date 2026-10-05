import { AiConfig, IVisionAiProvider } from "./types.js";
import { GeminiProvider } from "./providers/GeminiProvider.js";
import { OpenAiProvider } from "./providers/OpenAiProvider.js";
import { ClaudeProvider } from "./providers/ClaudeProvider.js";
import { OllamaProvider } from "./providers/OllamaProvider.js";

export function createVisionAiProvider(config: AiConfig): IVisionAiProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider(config);
    case "openai":
    case "custom":
      return new OpenAiProvider(config);
    case "claude":
      return new ClaudeProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    default:
      return new GeminiProvider(config);
  }
}
