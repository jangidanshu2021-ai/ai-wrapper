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
