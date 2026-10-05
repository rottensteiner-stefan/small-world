import { IVisionAiProvider, VisionAiRequest, VisionAiResponse, AiConfig } from "../types.js";
import { parseImageData, sortModelsDescending } from "../utils.js";

export class OpenAiProvider implements IVisionAiProvider {
  constructor(private config: AiConfig) {}

  public async sendMessage(req: VisionAiRequest): Promise<VisionAiResponse> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey && this.config.provider !== "custom") {
      throw new Error("OpenAI API Key is missing. Please configure it in settings.");
    }

    const model = this.config.model || "gpt-4o-mini";
    const endpoint = this.config.endpoint?.trim() || "https://api.openai.com/v1/chat/completions";

    const messages: Array<{
      role: string;
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }> = [];

    if (req.systemInstruction) {
      messages.push({
        role: "system",
        content: req.systemInstruction,
      });
    }

    for (const m of req.messages) {
      if (m.imageBase64) {
        const { mimeType, data } = parseImageData(m.imageBase64);
        const dataUrl = `data:${mimeType};base64,${data}`;
        messages.push({
          role: m.role,
          content: [
            { type: "text", text: m.content || "Analyze this image." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        });
      } else {
        messages.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const body: Record<string, unknown> = {
      model,
      messages,
    };
    if (req.temperature !== undefined) body["temperature"] = req.temperature;
    if (req.maxTokens !== undefined) body["max_tokens"] = req.maxTokens;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const text = data.choices?.[0]?.message?.content || "";
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
    const apiKey = this.config.apiKey?.trim();
    const endpoint = this.config.endpoint?.trim();
    const modelsUrl = endpoint
      ? endpoint.replace(/\/chat\/completions\/?$/, "/models")
      : "https://api.openai.com/v1/models";

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const res = await fetch(modelsUrl, { headers });
      if (res.ok) {
        const data = (await res.json()) as {
          data?: Array<{ id: string }>;
        };

        if (data.data && Array.isArray(data.data)) {
          const ids = data.data.map((m) => m.id);
          const relevant = ids.filter((id) =>
            /gpt-4|gpt-3\.5|o1|o3|vision|claude|llama|mistral|gemini/i.test(id),
          );
          if (relevant.length > 0) {
            return sortModelsDescending(relevant);
          }
        }
      }
    } catch {
      // Fallback
    }

    return sortModelsDescending([
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "o1-preview",
      "o1-mini",
    ]);
  }
}
