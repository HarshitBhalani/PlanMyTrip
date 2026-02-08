import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("GROQ_API_KEY is missing");
}

const groq = new Groq({ apiKey });

export const generateTripWithAI = async (prompt: string): Promise<string> => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content;

  if (!text) {
    throw new Error("Empty AI response");
  }

  return text;
};
