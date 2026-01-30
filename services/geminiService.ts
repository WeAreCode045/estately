

import { GoogleGenAI, Type } from "@google/genai";
import { Project, User, ContractTemplate } from "../types";
import type { FormSchema } from "../components/form-builder/types";

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
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
    return new GoogleGenAI({ apiKey });
  }

  // Fix: Upgraded model to 'gemini-3-pro' for advanced reasoning task of legal contract generation
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

  // Fix: Using gemini-3-flash-preview for Maps Grounding tasks
  async getPropertyLocationInsights(address: string, userLatLng?: { latitude: number, longitude: number }): Promise<LocationInsightsResponse> {
    const prompt = `Provide detailed neighborhood insights for the property at "${address}". 
    Include information about nearby amenities like schools, parks, transportation, and popular local spots. 
    Use real-time map data to ensure accuracy.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
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

  private getFieldSchema() {
    return {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        type: { 
          type: Type.STRING, 
          description: "One of: text, textarea, number, select, checkbox, radio, date, email, tel, section" 
        },
        label: { type: Type.STRING },
        placeholder: { type: Type.STRING },
        required: { type: Type.BOOLEAN },
        helpText: { type: Type.STRING },
        isCollapsed: { type: Type.BOOLEAN },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING }
            },
            required: ["label", "value"]
          }
        },
        children: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              label: { type: Type.STRING },
              placeholder: { type: Type.STRING },
              required: { type: Type.BOOLEAN },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["id", "type", "label"]
          }
        }
      },
      required: ["id", "type", "label", "required"]
    };
  }

  async generateFormFromPrompt(prompt: string): Promise<FormSchema> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Generate a complete form schema JSON for: ${prompt}` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            submitButtonText: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: this.getFieldSchema()
            }
          },
          required: ["title", "description", "fields", "submitButtonText"]
        }
      }
    });

    return this.parseResponse(response.text);
  }

  async generateFormFromPDF(base64DataUri: string): Promise<FormSchema> {
    const base64Data = base64DataUri.split(',')[1] || base64DataUri;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf"
            }
          },
          {
            text: "Extract all form elements from this PDF. Group related fields into logical sections using the 'section' type. Identify labels, logical field types, and any multiple choice options."
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            submitButtonText: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: this.getFieldSchema()
            }
          },
          required: ["title", "description", "fields", "submitButtonText"]
        }
      }
    });

    return this.parseResponse(response.text);
  }

  private parseResponse(text: string | undefined): FormSchema {
    try {
      const cleanedText = text?.trim() || '{}';
      return JSON.parse(cleanedText) as FormSchema;
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      throw new Error("The AI generated an invalid schema structure. Please try again with a clearer prompt or document.");
    }
  }
}



