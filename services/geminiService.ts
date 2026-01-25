
import { GoogleGenAI } from "@google/genai";
import { Project, User, ContractTemplate } from "../types";

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface LocationInsightsResponse {
  text: string;
  links: GroundingLink[];
}

export class GeminiService {
  private get ai() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // Fix: Upgraded model to 'gemini-3-pro-preview' for advanced reasoning task of legal contract generation
  async generateContractDraft(
    project: Project, 
    seller: User, 
    buyer?: User, 
    template?: ContractTemplate
  ) {
    const templateContext = template 
      ? `Use the following structure and content as a base for the contract:\n\n${template.content}\n\n`
      : `Generate a professional Sales Purchase Agreement from scratch.`;

    const prompt = `
      As a legal expert in real estate, generate a professional contract.
      ${templateContext}
      
      Project Data to integrate:
      - Title: ${project.title}
      - Property Address: ${project.property.address}
      - Sale Price: $${project.property.price.toLocaleString()}
      - Description: ${project.property.description}
      
      Seller Details:
      - Name: ${seller.name}
      - Email: ${seller.email}
      
      Buyer Details:
      ${buyer ? `- Name: ${buyer.name}\n- Email: ${buyer.email}` : 'To be determined'}
      
      IMPORTANT: If a base structure was provided, preserve its tone and mandatory sections but replace all placeholders (like [PROPERTY_ADDRESS], [PRICE], [SELLER_NAME], etc.) with the real data provided above.
      Please format the final response in professional Markdown.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            temperature: 0.3, // Lower temperature for legal accuracy
            topP: 0.8,
            topK: 40
        }
      });
      return response.text || "Failed to generate contract draft.";
    } catch (error) {
      console.error("Gemini contract generation failed:", error);
      return "An error occurred while generating the contract draft. Please check your API key.";
    }
  }

  // Fix: Upgraded model to 'gemini-3-pro-preview' for complex project risk analysis
  async getProjectInsights(project: Project) {
    const prompt = `
      Analyze the current status of this real estate project and provide 3 key action items or risks.
      
      Project: ${project.title}
      Status: ${project.status}
      Tasks: ${JSON.stringify(project.tasks)}
      Milestones: ${JSON.stringify(project.milestones)}
      
      Return as a concise summary.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt
      });
      return response.text || "No insights available.";
    } catch (error) {
      return "Insights unavailable.";
    }
  }

  // Fix: Maintaining gemini-2.5-flash as it is mandatory for Maps Grounding tasks
  async getPropertyLocationInsights(address: string, userLatLng?: { latitude: number, longitude: number }): Promise<LocationInsightsResponse> {
    const prompt = `Provide detailed neighborhood insights for the property at "${address}". 
    Include information about nearby amenities like schools, parks, transportation, and popular local spots. 
    Use real-time map data to ensure accuracy.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: userLatLng ? {
              latLng: {
                latitude: userLatLng.latitude,
                longitude: userLatLng.longitude
              }
            } : undefined
          }
        },
      });

      const text = response.text || "No location data found.";
      const links: GroundingLink[] = [];

      // Extract links from grounding chunks
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps) {
            links.push({
              title: chunk.maps.title || "View on Google Maps",
              uri: chunk.maps.uri
            });
          }
        });
      }

      return { text, links };
    } catch (error) {
      console.error("Maps grounding failed:", error);
      return { text: "Failed to load neighborhood insights. Please try again.", links: [] };
    }
  }
}
