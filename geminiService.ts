
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  // Instantiation moved inside methods to ensure it uses the most up-to-date API_KEY from process.env.API_KEY

  /**
   * Edits an image using the gemini-2.5-flash-image model.
   * Following guidelines to instantiate GoogleGenAI right before the call.
   */
  async editImage(base64Image: string, prompt: string): Promise<string | null> {
    try {
      // Create a new GoogleGenAI instance right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: 'image/png',
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      // Iterate through candidates and parts to find the image part as per SDK guidelines
      const candidates = response.candidates;
      if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error editing image:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
