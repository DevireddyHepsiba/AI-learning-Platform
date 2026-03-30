import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

/* ---------- ENV CHECK ---------- */
if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY not set");
  process.exit(1);
}

/* ---------- GEMINI CLIENT ---------- */
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-2.5-flash";

/* ---------- HELPERS ---------- */

// extract plain text from Gemini response
const extractText = (response) =>
  response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

// normalize any input into a string
function normalizeText(input) {
  if (typeof input === "string") return input;

  if (Array.isArray(input)) {
    return input
      .map((item) => item?.content || item?.text || "")
      .join("\n");
  }

  if (typeof input === "object" && input !== null) {
    return JSON.stringify(input);
  }

  return String(input);
}

// remove markdown fences from Gemini JSON
function cleanJson(text) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/* ======================================================
   FLASHCARDS
====================================================== */
export const generateFlashcards = async (text, count = 10) => {
  const normalizedText = normalizeText(text);

  const prompt = `
Generate exactly ${count} flashcards from the text below.
Return ONLY valid JSON. Do NOT use markdown.

[
  {
    "question": "string",
    "answer": "string",
    "difficulty": "easy | medium | hard"
  }
]

TEXT:
${normalizedText.substring(0, 15000)}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = extractText(response);
  const cleaned = cleanJson(raw);

  return JSON.parse(cleaned);
};

/* ======================================================
   QUIZ
====================================================== */
export const generateQuiz = async (text, numQuestions = 5) => {
  const normalizedText = normalizeText(text);

  const prompt = `
Generate exactly ${numQuestions} multiple-choice questions.
Return ONLY valid JSON.

[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "string",
    "difficulty": "easy | medium | hard"
  }
]

TEXT:
${normalizedText.substring(0, 15000)}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = extractText(response);
  const cleaned = cleanJson(raw);

  return JSON.parse(cleaned);
};

/* ======================================================
   SUMMARY
====================================================== */
export const generateSummary = async (text) => {
  const normalizedText = normalizeText(text);

  const prompt = `
Provide a clear, concise summary of the following document.

TEXT:
${normalizedText.substring(0, 20000)}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return extractText(response);
};

/* ======================================================
   CHAT
====================================================== */
export const chat = async (text, message) => {
  const normalizedText = normalizeText(text);

  const prompt = `
You are an AI tutor.
Answer ONLY using the document below.

DOCUMENT:
${normalizedText.substring(0, 15000)}

QUESTION:
${message}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return extractText(response);
};

/* ======================================================
   EXPLAIN CONCEPT
====================================================== */
export const explainConcept = async (text, concept) => {
  const normalizedText = normalizeText(text);

  const prompt = `
Explain the concept "${concept}" using the document below.
Be clear and educational.

DOCUMENT:
${normalizedText.substring(0, 15000)}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return extractText(response);
};

/* ======================================================
   QUICK CLARITY FOR SELECTED TEXT
====================================================== */
export const clarifySelection = async (selectionText, context = "") => {
  try {
    const selection = normalizeText(selectionText).trim();
    const ctx = normalizeText(context).trim();

    console.log("[clarifySelection] Input - selection length:", selection.length, "context length:", ctx.length);

    const prompt = `
You are a concise study assistant.
Explain the selected text in simple terms and include:
1) Plain-English explanation
2) Why it matters in this topic
3) One short example

SELECTED TEXT:
${selection}

OPTIONAL CONTEXT:
${ctx || "N/A"}
`;

    console.log("[clarifySelection] Calling Gemini API...");
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    console.log("[clarifySelection] Gemini response received");
    const result = extractText(response);
    
    if (!result || result.trim().length === 0) {
      throw new Error("Gemini returned empty response");
    }
    
    console.log("[clarifySelection] Success! Result length:", result.length);
    return result;
  } catch (apiError) {
    console.error("[clarifySelection] API Error:", apiError?.message || apiError);
    console.error("[clarifySelection] Error details:", {
      message: apiError?.message,
      status: apiError?.status,
      code: apiError?.code,
    });
    throw apiError;
  }
};
