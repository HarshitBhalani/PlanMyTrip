import Groq from "groq-sdk";

const AI_TIMEOUT_MS = 60_000;

/*
 * Models are tried in order. GROQ_MODEL (optional, comma-separated) goes first,
 * so a model Groq retires can be swapped from .env without a code change.
 */
const DEFAULT_MODELS = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
const MODELS = Array.from(
  new Set(
    [...(process.env.GROQ_MODEL || "").split(","), ...DEFAULT_MODELS]
      .map((model) => model.trim())
      .filter(Boolean)
  )
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: AI_TIMEOUT_MS,
  maxRetries: 2,
});

// Some reasoning models wrap their thinking in <think> tags; keep only the answer.
const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

/**
 * Returns the model text, or null when every model fails / returns nothing.
 * Never throws, so callers can apply their own fallbacks.
 */
export async function generateTripWithAI(prompt: string): Promise<string | null> {
  for (const model of MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional travel planner. Always return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      });

      const content = response.choices?.[0]?.message?.content;
      const text = content ? stripThinking(content) : "";

      if (text) {
        return text;
      }

      console.error(`AI SERVICE: empty response from ${model}, trying next model`);
    } catch (error: any) {
      console.error(
        `AI SERVICE ERROR (${model}):`,
        error?.status || "",
        error?.message || error
      );
    }
  }

  return null;
}
