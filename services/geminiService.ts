
import { GoogleGenAI } from "@google/genai";
import { GroundingSource } from "../types";

// Using gemini-2.5-flash-image (Nano Banana series) for high-speed multimodal performance
const MODEL_NAME = 'gemini-2.5-flash-image';

export const getGeminiStream = async (
  prompt: string,
  image?: string, // base64 encoded string
  userLocation?: { latitude: number; longitude: number },
  onChunk?: (text: string) => void
): Promise<{ text: string; sources: GroundingSource[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const parts: any[] = [];
  
  if (image) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: image.split(',')[1] || image,
      },
    });
  }
  
  parts.push({ text: prompt });

  const config: any = {
    tools: [
      { googleMaps: {} },
      { googleSearch: {} }
    ],
    temperature: 0.7,
    systemInstruction: `You are Shakil AI, powered by Gemini 2.5 Flash Image. 
    Your specialty is "Location Tagging". 
    1. Identification: If an image is provided, identify exactly what landmark, building, or business it is.
    2. Tagging: Tag the location by providing its official name and a Google Maps link.
    3. Proximity: Use the user's coordinates (${userLocation?.latitude}, ${userLocation?.longitude}) if available to tell the user exactly how far they are from the tagged location.
    4. Language: Always respond in a friendly Bengali/English mix as preferred by the user. 
    Be ultra-precise and concise.`,
  };

  if (userLocation) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      }
    };
  }

  const result = await ai.models.generateContentStream({
    model: MODEL_NAME,
    contents: { parts },
    config
  });

  let fullText = "";
  try {
    for await (const chunk of result) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      if (onChunk) onChunk(fullText);
    }
  } catch (streamError) {
    console.error("Streaming error:", streamError);
    if (fullText === "") fullText = "দুঃখিত, লোকেশন ট্যাগ করতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।";
  }

  let sources: GroundingSource[] = [];
  try {
    const response = await result.response;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk: any) => {
      if (chunk.maps) {
        sources.push({ title: chunk.maps.title || "ম্যাপে ট্যাগ করা হয়েছে", uri: chunk.maps.uri });
      } else if (chunk.web) {
        sources.push({ title: chunk.web.title || "সূত্র", uri: chunk.web.uri });
      }
    });
  } catch (responseError) {
    console.warn("Grounding error:", responseError);
  }

  return { text: fullText, sources };
};
