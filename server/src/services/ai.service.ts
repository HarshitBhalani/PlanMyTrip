import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function generateTripWithAI(prompt: string) {
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

  return response.choices[0].message.content;
}
