import Groq from "groq-sdk";

const AI_TIMEOUT_MS = 60_000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: AI_TIMEOUT_MS,
  maxRetries: 2,
});

/**
 * Returns the model text, or null when the AI call fails / returns nothing.
 * Never throws, so callers can apply their own fallbacks.
 */
export async function generateTripWithAI(prompt: string): Promise<string | null> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
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

    return response.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.error("AI SERVICE ERROR:", (error as Error)?.message || error);
    return null;
  }
}
