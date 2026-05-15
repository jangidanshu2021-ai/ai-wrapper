import axios from "axios";

const AI_API_KEY = "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";

export const keys = [AI_API_KEY];

export function getRotatedKey() {
  return AI_API_KEY;
}

// Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Existing function (kept for compatibility)
export async function fetchWithRotatedKey({ payload }) {
  const shuffledKeys = shuffle([...keys]);

  for (const key of shuffledKeys) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-wrapper-vert.vercel.app",
            "X-Title": "AI Wrapper",
          },
        },
      );
      return response;
    } catch (err) {
      console.warn(`Key failed: ${key}, retrying...`, err.message);
      continue;
    }
  }
  throw new Error("The key failed. Please check your balance or key status.");
}

// NEW FUNCTION: Native fetch for streaming support with AbortController
export async function fetchStreamWithRotatedKey({ payload, signal }) {
  const shuffledKeys = shuffle([...keys]);

  for (const key of shuffledKeys) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-wrapper-vert.vercel.app",
            "X-Title": "AI Wrapper",
          },
          body: JSON.stringify({ ...payload, stream: true }),
          signal: signal,
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(
          `Key failed with status ${response.status}: ${key}`,
          errorBody
        );
        continue;
      }

      return response;
    } catch (err) {
      if (err.name === "AbortError") {
        throw err;
      }
      console.warn(`Key failed: ${key}, retrying...`, err.message);
      continue;
    }
  }
  throw new Error("The key failed. Please check your balance or key status.");
}
