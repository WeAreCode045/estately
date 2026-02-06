
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client using the API key from environment variables.
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });

export const generateContentSuggestion = async (prompt: string, type: 'title' | 'text') => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a catchy and professional ${type} for a real estate brochure section about: ${prompt}. Return ONLY the generated text, no quotes or additional formatting.`,
    });
    // The .text property directly returns the string output.
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini content generation failed", error);
    return null;
  }
};

export const suggestStylePairing = async (baseColor: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Given a background color of ${baseColor}, suggest a contrasting text color (hex) and a secondary accent color (hex). Format: text_color, accent_color. Return nothing else.`,
    });
    const result = response.text?.trim();
    if (result) {
      const [text, accent] = result.split(',').map(s => s.trim());
      return { text, accent };
    }
    return null;
  } catch (error) {
    console.error("Gemini style suggestion failed", error);
    return null;
  }
};
