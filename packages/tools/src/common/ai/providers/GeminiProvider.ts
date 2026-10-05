import { IVisionAiProvider, VisionAiRequest, VisionAiResponse, AiConfig } from "../types.js";
import { parseImageData, sortModelsDescending } from "../utils.js";

export class GeminiProvider implements IVisionAiProvider {
  constructor(private config: AiConfig) {}

  public async sendMessage(req: VisionAiRequest): Promise<VisionAiResponse> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please configure it in settings.");
    }

    const model = this.config.model || "gemini-1.5-flash";
    const endpoint =
      this.config.endpoint?.trim() ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = req.messages.map((m) => {
      const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
      if (m.imageBase64) {
        const { mimeType, data } = parseImageData(m.imageBase64);
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: data,
          },
        });
      }
      if (m.content) {
        parts.push({ text: m.content });
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    const body: Record<string, unknown> = {
      contents,
    };

    if (req.systemInstruction) {
      body["systemInstruction"] = {
        parts: [{ text: req.systemInstruction }],
      };
    }

    if (req.temperature !== undefined || req.maxTokens !== undefined) {
      body["generationConfig"] = {
        temperature: req.temperature,
        maxOutputTokens: req.maxTokens,
      };
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
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const firstCandidate = data.candidates?.[0];
    const textPart = firstCandidate?.content?.parts?.[0]?.text || "";
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
    if (!apiKey) {
      return sortModelsDescending([
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-8b",
      ]);
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            supportedGenerationMethods?: string[];
          }>;
        };

        if (data.models && Array.isArray(data.models)) {
          const geminiModels = data.models
            .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m) => m.name.replace(/^models\//, ""))
            .filter((name) => name.startsWith("gemini"));

          if (geminiModels.length > 0) {
            return sortModelsDescending(geminiModels);
          }
        }
      }
    } catch {
      // Fallback
    }

    return sortModelsDescending([
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash-8b",
    ]);
  }
}
