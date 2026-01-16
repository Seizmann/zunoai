
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Role, Message } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is not configured in the environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const startChatStream = async (
  history: Message[],
  newMessage: string,
  onChunk: (text: string) => void,
  options: { thinking?: boolean; image?: { data: string; mimeType: string } } = {}
) => {
  const ai = getAIClient();
  
  // Decide model: 3-pro-preview for thinking or image analysis, 3-flash-preview for standard chat
  const model = (options.thinking || options.image) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const formattedHistory = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const contents: any = { parts: [] };
  
  // Add image if provided (Image Understanding feature)
  if (options.image) {
    contents.parts.push({
      inlineData: {
        data: options.image.data,
        mimeType: options.image.mimeType,
      },
    });
  }
  
  contents.parts.push({ text: newMessage });

  const config: any = {
    systemInstruction: "You are Zuno, a helpful AI assistant. Format your responses with clear markdown. Be direct, intelligent, and helpful.",
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
  };

  // Add thinking budget for complex reasoning (Thinking Mode feature)
  if (options.thinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    // For Pro model with thinking or image, we use generateContentStream
    // We recreate history as part of the contents or use chat.
    // For simplicity with streaming and specialized config, we use chat for standard but generateContentStream for specialized.
    
    // We'll use generateContentStream directly to ensure thinkingBudget is respected correctly
    const streamResponse = await ai.models.generateContentStream({
      model,
      contents: [...formattedHistory.map(h => ({ role: h.role, parts: h.parts })), { role: 'user', parts: contents.parts }],
      config,
    });
    
    let fullText = "";
    for await (const chunk of streamResponse) {
      const c = chunk as GenerateContentResponse;
      const text = c.text || "";
      fullText += text;
      onChunk(text);
    }
    
    return fullText;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("entity was not found")) {
      throw new Error("The API configuration seems invalid. Please check your project settings.");
    }
    throw error;
  }
};

/**
 * Handles image editing or generation tasks using Gemini 2.5 Flash Image.
 */
export const processImageTask = async (
  prompt: string,
  imageData?: { data: string; mimeType: string }
) => {
  const ai = getAIClient();
  const model = 'gemini-2.5-flash-image';

  const parts: any[] = [{ text: prompt }];
  if (imageData) {
    parts.unshift({
      inlineData: {
        data: imageData.data,
        mimeType: imageData.mimeType,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
    });

    let resultText = "";
    let resultImage = null;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          resultImage = {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        } else if (part.text) {
          resultText += part.text;
        }
      }
    }

    return { text: resultText || "Here is your edited image.", image: resultImage };
  } catch (error: any) {
    console.error("Image Processing Error:", error);
    throw error;
  }
};
