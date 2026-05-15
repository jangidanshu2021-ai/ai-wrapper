const AI_API_KEY = "AIzaSyDLw2NnBo4FFVElnaWahzNuU58fLmeoP2A".trim();

export const keys = [AI_API_KEY];

/**
 * NEW FUNCTION: Native fetch for Gemini API with streaming support
 * Note: Gemini API format differs significantly from OpenAI/OpenRouter.
 */
export async function fetchStreamWithRotatedKey({ payload, signal }) {
  const key = AI_API_KEY;
  
  // Map OpenAI-style messages to Gemini format
  const geminiMessages = payload.messages.map(msg => {
    // Gemini uses 'user' and 'model' roles. 'system' is handled differently.
    let role = msg.role === "assistant" ? "model" : "user";
    if (msg.role === "system") {
      // System instructions are usually a separate parameter in the URL or body
      // but for simplicity in a quick migration, we treat them as part of the conversation
      // or move them to the top.
      return { role: "user", parts: [{ text: `System Instruction: ${msg.content}` }] };
    }
    return {
      role: role,
      parts: [{ text: msg.content }]
    };
  });

  const model = payload.model || "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: payload.temperature || 0.7,
          maxOutputTokens: 2048,
        }
      }),
      signal: signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`Gemini API failed with status ${response.status}`, errorBody);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw err;
    }
    console.error("Gemini Fetch Error:", err.message);
    throw err;
  }
}

// Keep this for compatibility if needed, but it's no longer "rotated"
export async function fetchWithRotatedKey({ payload }) {
  const key = AI_API_KEY;
  const model = payload.model || "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    const geminiMessages = payload.messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
      }),
    });

    const data = await response.json();
    // Wrap Gemini response in an OpenAI-like structure for the frontend to consume
    return {
      data: {
        choices: [
          {
            message: {
              content: data.candidates?.[0]?.content?.parts?.[0]?.text || ""
            }
          }
        ]
      }
    };
  } catch (err) {
    console.error("Gemini Fetch Error:", err.message);
    throw err;
  }
}
