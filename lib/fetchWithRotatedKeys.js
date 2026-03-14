import axios from "axios";

const AI_API_KEY_1 =
  "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";
const AI_API_KEY_2 =
  "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";
const AI_API_KEY_3 =
  "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";
const AI_API_KEY_4 =
  "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";
const AI_API_KEY_5 =
  "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";
const AI_API_KEY_6 =
  "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";

export const keys = [
  AI_API_KEY_1,
  AI_API_KEY_2,
  AI_API_KEY_3,
  AI_API_KEY_4,
  AI_API_KEY_5,
  AI_API_KEY_6,
].filter(Boolean);

export function getRotatedKey() {
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
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
          },
        },
      );
      return response;
    } catch (err) {
      console.warn(`Key failed: ${key}, retrying...`, err.message);
      continue;
    }
  }
  throw new Error("All keys failed. Please try again later.");
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
          },
          body: JSON.stringify({ ...payload, stream: true }),
          signal: signal, // Attach the abort signal here
        },
      );

      if (!response.ok) {
        console.warn(`Key failed with status ${response.status}: ${key}`);
        continue;
      }

      return response; // Return the raw fetch response so we can read the stream body
    } catch (err) {
      if (err.name === "AbortError") {
        throw err; // If the user clicked stop, abort immediately without retrying
      }
      console.warn(`Key failed: ${key}, retrying...`, err.message);
      continue;
    }
  }
  throw new Error("All keys failed. Please try again later.");
}
