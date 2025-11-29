import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, AiFinding } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    riskLevel: { type: Type.STRING, enum: ['High', 'Moderate', 'Low', 'Clear'] },
    confidenceScore: { type: Type.NUMBER, description: "Confidence between 0 and 1" },
    summary: { type: Type.STRING, description: "A professional and concise medical summary of the image analysis." },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
        }
      }
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    detailedMetrics: {
      type: Type.OBJECT,
      description: "Quantitative scores (1-10) for specific radiomic features.",
      properties: {
        spiculation: { type: Type.NUMBER, description: "Degree of spiky borders (1=smooth, 10=very spiky)" },
        density: { type: Type.NUMBER, description: "Opacity density (1=low/ground glass, 10=solid)" },
        marginDefinition: { type: Type.NUMBER, description: "Clarity of margins (1=ill-defined, 10=sharp)" },
        calcification: { type: Type.NUMBER, description: "Presence of calcium (1=none, 10=heavy)" },
        sizeScore: { type: Type.NUMBER, description: "Relative size significance (1=tiny, 10=large mass)" }
      },
      required: ['spiculation', 'density', 'marginDefinition', 'calcification', 'sizeScore']
    }
  },
  required: ['riskLevel', 'confidenceScore', 'summary', 'findings', 'recommendations', 'detailedMetrics']
};

export const analyzeMedicalImage = async (base64Image: string, mimeType: string): Promise<Partial<AnalysisResult>> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    // Chain-of-Thought Prompting for higher accuracy
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `You are a Senior Radiologist Consultant with 20 years of experience in Thoracic Oncology.
            
            Analyze the provided chest medical image (CT or X-Ray).
            
            Methodology:
            1. Scan the lung fields for nodules, masses, or infiltrates.
            2. Scan the mediastinum for lymphadenopathy.
            3. Evaluate any detected abnormalities for malignancy features:
               - Spiculation (Star-like pattern) -> High Malignancy Probability
               - Ground Glass Opacity (GGO) -> Moderate Probability
               - Calcification -> Often Benign (unless eccentric)
            
            Output Requirements:
            - If no abnormalities are found, be definitive and state "Clear".
            - If it is NOT a medical image, return Risk Level "Low" and state "Invalid Image Format" in summary.
            - Provide detailed scores (1-10) for the metrics based strictly on visual evidence.
            
            Double check your reasoning before generating the JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
        // Lower temperature for more deterministic/accurate medical results
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("The AI model returned an empty response. Please try again.");

    try {
        return JSON.parse(text);
    } catch (parseError) {
        throw new Error("Failed to parse AI response. The service might be experiencing issues.");
    }

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);

    // Provide specific guidance based on error type
    let userMessage = "AI Analysis Service failed.";

    if (error.message?.includes('API_KEY') || !process.env.API_KEY) {
        userMessage = "Configuration Error: API Key is missing or invalid. Please check your environment settings.";
    } else if (error.status === 400 || error.message?.includes('400')) {
        userMessage = "Image Error: The provided image format is not supported or the file is corrupted. Please try a different JPEG or PNG file.";
    } else if (error.status === 401 || error.status === 403 || error.message?.includes('403')) {
        userMessage = "Authentication Error: Access denied. Please check your API permissions and quotas.";
    } else if (error.status === 429 || error.message?.includes('429')) {
        userMessage = "Service Busy: Too many requests. Please wait a moment and try again.";
    } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        userMessage = "Network Error: Unable to connect to AI service. Please check your internet connection.";
    } else if (error.message?.includes('blocked')) {
        userMessage = "Safety Filter: The image was flagged by safety filters and could not be analyzed. Please ensure the image is appropriate.";
    } else if (error.message) {
        userMessage = `System Error: ${error.message}`;
    }

    throw new Error(userMessage);
  }
};

export const chatWithRadiologist = async (
  currentHistory: {role: 'user' | 'model', text: string}[], 
  newMessage: string, 
  base64Image: string
) => {
  try {
    const prompt = `
        Context: You are Dr. AI, a specialized lung cancer assistant helping a user understand their scan.
        
        User Question: ${newMessage}
        
        Instructions:
        - Answer based strictly on the visible features of the provided image and general medical knowledge.
        - Be empathetic but professional.
        - If the user asks about treatment, provide general guidelines but disclaim that you are an AI.
        - Keep responses short and conversational.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
        parts: [
            { inlineData: { data: base64Image, mimeType: "image/png" } },
            { text: prompt }
        ]
        }
    });

    return response.text;
  } catch (error: any) {
    console.error("Chat Error:", error);
    return "I apologize, but I'm having trouble connecting to the service right now. Please try again in a moment.";
  }
};
