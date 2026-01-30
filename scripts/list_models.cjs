
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await genAI.models.list();
    console.log("Response type:", typeof response);
    console.log("Response keys:", Object.keys(response));
    if (response.models) {
      response.models.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else if (Array.isArray(response)) {
      response.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("Response:", response);
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
