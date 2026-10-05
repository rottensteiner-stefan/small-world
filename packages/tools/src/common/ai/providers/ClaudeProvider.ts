import { IVisionAiProvider, VisionAiRequest, VisionAiResponse, AiConfig } from "../types.js";
import { parseImageData, sortModelsDescending } from "../utils.js";

export class ClaudeProvider implements IVisionAiProvider {
  constructor(private config: AiConfig) {}

  public async sendMessage(req: VisionAiRequest): Promise<VisionAiResponse> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Anthropic Claude API Key is missing. Please configure it in settings.");
    }

    const model = this.config.model || "claude-3-5-haiku-20241022";
    const endpoint = this.config.endpoint?.trim() || "https://api.anthropic.com/v1/messages";

    const messages: Array<{
      role: "user" | "assistant";
      content:
        | string
        | Array<{
            type: string;
            text?: string;
            source?: { type: "base64"; media_type: string; data: string };
          }>;
    }> = [];

    for (const m of req.messages) {
      if (m.role === "system") continue; // system instruction passed in separate property
      if (m.imageBase64) {
        const { mimeType, data } = parseImageData(m.imageBase64);
        messages.push({
          role: m.role as "user" | "assistant",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: data,
              },
            },
            { type: "text", text: m.content || "Analyze this image." },
          ],
        });
      } else {
        messages.push({
          role: m.role as "user" | "assistant",
          content: m.content,
        });
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: req.maxTokens || 1024,
    };
    if (req.systemInstruction) {
      body["system"] = req.systemInstruction;
    }
    if (req.temperature !== undefined) {
      body["temperature"] = req.temperature;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    };

    const textPart = data.content?.find((c) => c.type === "text")?.text || "";
    return { text: textPart };
  }

  public async testConnection(): Promise<boolean> {
    const res = await this.sendMessage({
      messages: [{ role: "user", content: "Ping: Respond with 'OK' if you can read this." }],
      maxTokens: 10,
    });
    return res.text.length > 0;
  }

  public async listModels(): Promise<string[]> {
    const apiKey = this.config.apiKey?.trim();
    if (apiKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            data?: Array<{ id: string }>;
          };
          if (data.data && Array.isArray(data.data)) {
            return sortModelsDescending(data.data.map((m) => m.id));
          }
        }
      } catch {
        // Fallback
      }
    }

    return sortModelsDescending([
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-haiku-20240307",
    ]);
  }
}
