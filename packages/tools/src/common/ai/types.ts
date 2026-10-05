export type AiProviderType = "gemini" | "openai" | "claude" | "ollama" | "custom";

export interface AiConfig {
  provider: AiProviderType;
  apiKey?: string | undefined;
  model: string;
  endpoint?: string | undefined;
}

export interface VisionAiMessage {
  role: "user" | "assistant" | "system";
  content: string;
  imageBase64?: string | undefined; // Pure base64 string or data:image/... URI
}

export interface VisionAiRequest {
  messages: VisionAiMessage[];
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface VisionAiResponse {
  text: string;
}

export interface IVisionAiProvider {
  sendMessage(req: VisionAiRequest): Promise<VisionAiResponse>;
  testConnection(): Promise<boolean>;
  listModels?(): Promise<string[]>;
}
