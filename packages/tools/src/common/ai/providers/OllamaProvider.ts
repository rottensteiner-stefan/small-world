import { IVisionAiProvider, VisionAiRequest, VisionAiResponse, AiConfig } from "../types.js";
import { parseImageData, sortModelsDescending } from "../utils.js";

export class OllamaProvider implements IVisionAiProvider {
  constructor(private config: AiConfig) {}

  public async sendMessage(req: VisionAiRequest): Promise<VisionAiResponse> {
    const endpoint = this.config.endpoint?.trim() || "http://localhost:11434/api/chat";
    const model = this.config.model || "llama3.2-vision";

    const messages: Array<{
      role: string;
      content: string;
      images?: string[];
    }> = [];

    if (req.systemInstruction) {
      messages.push({
        role: "system",
        content: req.systemInstruction,
      });
    }

    for (const m of req.messages) {
      const msgObj: { role: string; content: string; images?: string[] } = {
        role: m.role,
        content: m.content || "Analyze this image.",
      };
      if (m.imageBase64) {
        const { data } = parseImageData(m.imageBase64);
        msgObj.images = [data];
      }
      messages.push(msgObj);
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    };
    if (req.temperature !== undefined) {
      body["options"] = { temperature: req.temperature };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      message?: {
        content?: string;
      };
    };

    const text = data.message?.content || "";
    return { text };
  }

  public async testConnection(): Promise<boolean> {
    const res = await this.sendMessage({
      messages: [{ role: "user", content: "Ping: Respond with 'OK' if you can read this." }],
      maxTokens: 10,
    });
    return res.text.length > 0;
  }

  public async listModels(): Promise<string[]> {
    const endpoint = this.config.endpoint?.trim() || "http://localhost:11434/api/chat";
    const tagsUrl = endpoint.replace(/\/api\/chat\/?$/, "/api/tags");

    try {
      const res = await fetch(tagsUrl);
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{ name: string }>;
        };
        if (data.models && Array.isArray(data.models)) {
          const names = data.models.map((m) => m.name);
          if (names.length > 0) {
            return sortModelsDescending(names);
          }
        }
      }
    } catch {
      // Fallback
    }

    return sortModelsDescending(["llama3.3", "llama3.2-vision", "minicpm-v", "llava", "bakllava"]);
  }
}
