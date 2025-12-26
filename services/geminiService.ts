import { GoogleGenAI, Chat } from "@google/genai";
import { BFHS_SYSTEM_PROMPT } from '../constants';
import { UserProfile, MemoryNote } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Missing API Key! check your .env file");
}
let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentUserId: string | null = null;

const CACHE_KEY_PREFIX = 'bfhs_gemini_cache_v1_';
const CACHE_TTL = 1000 * 60 * 60 * 24;
const memCache = new Map<string, { response: string, timestamp: number }>();

const FAQ_SHORT_CIRCUITS: Record<string, string> = {
    "dress code": "**BFHS Dress Code Policy (2025-2026)**\n\nThe dress code prioritizes safety and comfort.\n\n**Must Wear:**\n- Tops: Opaque material (covering front, back, and sides under arms).\n- Bottoms: Pants, sweatpants, shorts, skirts, dresses, or leggings (opaque).\n- Shoes: Must have a back (no flip-flops/slides). Closed-toe may be required for labs/PE.\n- **School ID**: Must be visible around the neck or clipped to upper body at all times.",
    "wifi": "**How to Connect to BFHS WiFi**\n\n1. Select the network **BFHS_Student**.\n2. **Identity**: School email.\n3. **Password**: Google password.",
};

export const initializeGenAI = () => {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
};

export const resetChatSession = () => {
  chatSession = null;
};

export const getChatSession = async (): Promise<Chat> => {
  if (!ai) initializeGenAI();
  if (!ai) throw new Error("Gemini API not initialized");

  if (!chatSession) {
    chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: BFHS_SYSTEM_PROMPT,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      },
    });
  }
  return chatSession;
};

function normalizePrompt(text: string): string {
    return text.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

export const sendMessageToGemini = async (
  message: string,
  imageBase64?: string,
  userContext?: { profile: UserProfile | null, notes: MemoryNote[] }
): Promise<string> => {
  try {
    const session = await getChatSession();
    const result = await session.sendMessage({ message });
    return result.text || "No response";
  } catch (error) {
    return "Error connecting to AI service.";
  }
};

export const generateProfileCardImages = async (

    prompt: string,

    aspectRatio: '1:1' | '4:5' = '1:1',

    count: number = 1

): Promise<string[]> => {

    console.log("[Profile Card] Generating High-End Vibe Background...");

    

    if (!ai) initializeGenAI();

    if (!ai) throw new Error("Gemini API not initialized");



    try {

        const tempSession = ai.chats.create({

            model: "gemini-3-pro-image-preview",

            config: {

                response_modalities: ['image']

            } as any

        });

        

        // We ensure the prompt is strictly for an abstract background

        const bgPrompt = `A high-fidelity, minimalist abstract background for a professional recognition card. 

        STYLE: ${prompt}. 

        COMPOSITION: Vertical 2:3 layout. Mesh gradients, soft liquid glass textures, and clean geometric light-leaks. 

        COLOR PALETTE: Ben Franklin Teal, Electric Gold, and Deep Charcoal. 

        STRICT RULE: NO TEXT, NO WORDS, NO FACES, NO PEOPLE. 

        It should look like a premium digital asset texture.`;



        const result = await tempSession.sendMessage({ message: bgPrompt });

        

        const response = (result as any).response || result;

        const candidate = response?.candidates?.[0];

        

        console.group("🎨 Vibe Background Debug");

        console.log("Finish Reason:", candidate?.finishReason);

        console.groupEnd();



        const images: string[] = [];

        const parts = candidate?.content?.parts || [];

        

        for (const part of parts) {

            if (part.inlineData?.data) {

                images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);

            } 

            else if (part.data) {

                images.push(`data:image/png;base64,${part.data}`);

            }

            else if (part.blob?.data) {

                images.push(`data:${part.blob.mimeType || 'image/png'};base64,${part.blob.data}`);

            }

        }



        if (images.length > 0) return images;

        throw new Error("No background data found.");

    } catch (error) {

        console.error("Background Generation failed:", error);

        return ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"];

    }

};

        

        // ============================================================================

        

        // CONTENT GENERATION

        

        // ============================================================================