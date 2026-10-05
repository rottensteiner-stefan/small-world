import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseImageData,
  sortModelsDescending,
  AiConfigStorage,
  createVisionAiProvider,
  GeminiProvider,
  OpenAiProvider,
  ClaudeProvider,
  OllamaProvider,
  AiConfig,
} from "../../src/common/ai/index.js";

describe("Vision AI Multi-Provider System", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    globalThis.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: (_index: number) => null,
    } as Storage;
    vi.restoreAllMocks();
  });

  it("sorts models descending by version across providers", () => {
    // Gemini models: 2.0 before 1.5, 1.5-pro vs 1.5-flash
    const geminiInput = [
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
    ];
    const geminiSorted = sortModelsDescending(geminiInput);
    expect(geminiSorted[0]).toBe("gemini-2.0-flash");
    expect(geminiSorted).toEqual([
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
    ]);

    // Claude models: 3.5 before 3.0, newer date before older date
    const claudeInput = [
      "claude-3-opus-20240229",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-haiku-20240307",
    ];
    const claudeSorted = sortModelsDescending(claudeInput);
    expect(claudeSorted).toEqual([
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-haiku-20240307",
      "claude-3-opus-20240229",
    ]);

    // OpenAI models: 4.5 > 4o > 4-turbo > 3.5-turbo
    const openaiInput = [
      "gpt-3.5-turbo",
      "gpt-4o",
      "gpt-4-turbo",
      "gpt-4o-mini",
      "o1-mini",
      "o3-mini",
    ];
    const openaiSorted = sortModelsDescending(openaiInput);
    expect(openaiSorted).toEqual([
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "o3-mini",
      "o1-mini",
    ]);

    // Ollama / Llama models: 3.3 > 3.2 > 3.1 > 3 > 2
    const llamaInput = ["llama2", "llama3.2", "llama3.3", "llama3.1", "llama3"];
    const llamaSorted = sortModelsDescending(llamaInput);
    expect(llamaSorted).toEqual(["llama3.3", "llama3.2", "llama3.1", "llama3", "llama2"]);
  });

  it("parses data URLs correctly", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const res = parseImageData(dataUrl);
    expect(res.mimeType).toBe("image/jpeg");
    expect(res.data).toBe("/9j/4AAQSkZJRg==");

    const rawBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const resRaw = parseImageData(rawBase64);
    expect(resRaw.mimeType).toBe("image/png");
    expect(resRaw.data).toBe(rawBase64);
  });

  it("stores and loads configuration in localStorage", () => {
    const config: AiConfig = {
      provider: "claude",
      apiKey: "sk-ant-test-12345",
      model: "claude-3-5-sonnet-20241022",
    };

    AiConfigStorage.save(config);
    const loaded = AiConfigStorage.load();
    expect(loaded.provider).toBe("claude");
    expect(loaded.apiKey).toBe("sk-ant-test-12345");
    expect(loaded.model).toBe("claude-3-5-sonnet-20241022");
  });

  it("creates the correct provider instances via factory", () => {
    const gemini = createVisionAiProvider({
      provider: "gemini",
      model: "gemini-1.5-flash",
      apiKey: "key",
    });
    expect(gemini).toBeInstanceOf(GeminiProvider);

    const openai = createVisionAiProvider({ provider: "openai", model: "gpt-4o", apiKey: "key" });
    expect(openai).toBeInstanceOf(OpenAiProvider);

    const claude = createVisionAiProvider({
      provider: "claude",
      model: "claude-3-5-haiku",
      apiKey: "key",
    });
    expect(claude).toBeInstanceOf(ClaudeProvider);

    const ollama = createVisionAiProvider({ provider: "ollama", model: "llama3.2-vision" });
    expect(ollama).toBeInstanceOf(OllamaProvider);
  });

  it("formats and executes Gemini requests correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Detected 4 frames with palette #ff0000" }] } }],
      }),
    });
    globalThis.fetch = mockFetch;

    const provider = new GeminiProvider({
      provider: "gemini",
      apiKey: "AIzaTestKey",
      model: "gemini-1.5-flash",
    });

    const res = await provider.sendMessage({
      messages: [
        { role: "user", content: "Analyze sprite", imageBase64: "data:image/png;base64,AAAA" },
      ],
      systemInstruction: "Game Dev Mode",
    });

    expect(res.text).toBe("Detected 4 frames with palette #ff0000");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toContain("gemini-1.5-flash:generateContent?key=AIzaTestKey");
    const body = JSON.parse(options.body as string);
    expect(body.contents[0].parts[0].inline_data.data).toBe("AAAA");
    expect(body.systemInstruction.parts[0].text).toBe("Game Dev Mode");
  });

  it("formats and executes OpenAI requests correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "PBR: Roughness 0.4, Metallic 0.0" } }],
      }),
    });
    globalThis.fetch = mockFetch;

    const provider = new OpenAiProvider({
      provider: "openai",
      apiKey: "sk-openai-test",
      model: "gpt-4o-mini",
    });

    const res = await provider.sendMessage({
      messages: [
        { role: "user", content: "Analyze material", imageBase64: "data:image/png;base64,BBBB" },
      ],
    });

    expect(res.text).toBe("PBR: Roughness 0.4, Metallic 0.0");
    const [_url, options] = mockFetch.mock.calls[0]!;
    expect(options.headers["Authorization"]).toBe("Bearer sk-openai-test");
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[0].content[1].image_url.url).toBe("data:image/png;base64,BBBB");
  });

  it("formats and executes Claude requests with direct browser access headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Claude analyzed: 8 frames [SLICE: 8]" }],
      }),
    });
    globalThis.fetch = mockFetch;

    const provider = new ClaudeProvider({
      provider: "claude",
      apiKey: "sk-ant-test",
      model: "claude-3-5-haiku-20241022",
    });

    const res = await provider.sendMessage({
      messages: [{ role: "user", content: "Find frames", imageBase64: "CCCC" }],
      systemInstruction: "Sprite Expert",
    });

    expect(res.text).toBe("Claude analyzed: 8 frames [SLICE: 8]");
    const [_url, options] = mockFetch.mock.calls[0]!;
    expect(options.headers["x-api-key"]).toBe("sk-ant-test");
    expect(options.headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    const body = JSON.parse(options.body as string);
    expect(body.system).toBe("Sprite Expert");
  });

  it("formats and executes Local Ollama requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: "Ollama local response" },
      }),
    });
    globalThis.fetch = mockFetch;

    const provider = new OllamaProvider({
      provider: "ollama",
      model: "llama3.2-vision",
      endpoint: "http://localhost:11434/api/chat",
    });

    const res = await provider.sendMessage({
      messages: [{ role: "user", content: "Check local image", imageBase64: "DDDD" }],
    });

    expect(res.text).toBe("Ollama local response");
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe("http://localhost:11434/api/chat");
    const body = JSON.parse(options.body as string);
    expect(body.messages[0].images[0]).toBe("DDDD");
  });

  it("lists models from providers dynamically sorted descending", async () => {
    // Gemini listModels
    const mockGeminiFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "models/gemini-1.5-flash", supportedGenerationMethods: ["generateContent"] },
          { name: "models/gemini-2.0-flash", supportedGenerationMethods: ["generateContent"] },
          { name: "models/embedding-001", supportedGenerationMethods: ["embedContent"] },
        ],
      }),
    });
    globalThis.fetch = mockGeminiFetch;

    const gemini = new GeminiProvider({
      provider: "gemini",
      apiKey: "key",
      model: "gemini-1.5-flash",
    });
    const geminiModels = await gemini.listModels();
    expect(geminiModels).toEqual(["gemini-2.0-flash", "gemini-1.5-flash"]);

    // Ollama listModels
    const mockOllamaFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: "llama3.1:latest" }, { name: "llama3.2-vision:latest" }],
      }),
    });
    globalThis.fetch = mockOllamaFetch;

    const ollama = new OllamaProvider({ provider: "ollama", model: "llama3.2-vision" });
    const ollamaModels = await ollama.listModels();
    expect(ollamaModels).toEqual(["llama3.2-vision:latest", "llama3.1:latest"]);
  });
});
