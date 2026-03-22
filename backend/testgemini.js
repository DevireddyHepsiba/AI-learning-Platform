import { GoogleGenAI } from "@google/genai";

// 🔑 API key directly in the file (TEMPORARY / LOCAL TESTING ONLY)
const ai = new GoogleGenAI({
  apiKey: "AIzaSyATuwVbqttmGjoTnSoSGtuAxTWs_1vTrXg",
});

async function main() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: "how are u" }]
        }
      ]
    });

    console.log("✅ Response:");
    console.log(response.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
