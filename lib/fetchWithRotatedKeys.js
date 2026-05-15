// Collect keys from environment variables
export const keys = [
  process.env.NEXT_PUBLIC_GEMINI_KEY_1,
  process.env.NEXT_PUBLIC_GEMINI_KEY_2,
  process.env.NEXT_PUBLIC_GEMINI_KEY_3,
  process.env.NEXT_PUBLIC_GEMINI_KEY_4,
].filter(Boolean); // Only keep keys that are actually defined

// Fisher-Yates shuffle
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * NEW FUNCTION: Native fetch for Gemini API with streaming support and rotation
 */
export async function fetchStreamWithRotatedKey({ payload, signal }) {
  const shuffledKeys = shuffle(keys);
  
  if (shuffledKeys.length === 0) {
    throw new Error("No Gemini API keys found in environment variables.");
  }

  // Map OpenAI-style messages to Gemini format
  const geminiMessages = payload.messages.map(msg => {
    let role = msg.role === "assistant" ? "model" : "user";
    if (msg.role === "system") {
      return { role: "user", parts: [{ text: `System Instruction: ${msg.content}` }] };
    }
    return {
      role: role,
      parts: [{ text: msg.content }]
    };
  });

  const model = payload.model || "gemini-2.5-flash-lite";

  for (const key of shuffledKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key.trim()}`;

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
        console.warn(`Gemini API key failed (Status ${response.status}). Trying next...`, errorBody);
        continue; // Try next key
      }

      return response;
    } catch (err) {
      if (err.name === "AbortError") {
        throw err;
      }
      console.warn(`Network error with Gemini key. Trying next...`, err.message);
      continue; // Try next key
    }
  }

  throw new Error("All Gemini API keys failed. Please check your balance or key status.");
}

/**
 * Non-streaming fetch with rotation
 */
export async function fetchWithRotatedKey({ payload }) {
  const shuffledKeys = shuffle(keys);
  const model = payload.model || "gemini-2.5-flash-lite";

  const geminiMessages = payload.messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  for (const key of shuffledKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
        }),
      });

      if (!response.ok) {
        console.warn(`Gemini API key failed (Status ${response.status}). Trying next...`);
        continue;
      }

      const data = await response.json();
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
      console.warn(`Error with Gemini key. Trying next...`, err.message);
      continue;
    }
  }

  throw new Error("All Gemini API keys failed.");
}
