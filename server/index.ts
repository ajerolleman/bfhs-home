import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Chat } from '@google/genai';
import { BFHS_SYSTEM_PROMPT } from '../constants';

const app = express();
app.use(express.json({ limit: '10mb' }));

const port = Number(process.env.PORT) || 8080;
let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentUserId: string | null = null;

const initializeGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  ai = new GoogleGenAI({ apiKey });
};

const getChatSession = () => {
  if (!ai) initializeGenAI();
  if (!chatSession) {
    chatSession = ai!.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: BFHS_SYSTEM_PROMPT,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      },
    });
  }
  return chatSession;
};

app.post('/api/gemini', async (req, res) => {
  try {
    const { message, imageBase64, userId } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (userId && userId !== currentUserId) {
      chatSession = null;
      currentUserId = userId;
    }

    const session = getChatSession();
    let contentToSend: any = message;

    if (imageBase64) {
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      contentToSend = [
        { text: message },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
      ];
    }

    const result = await session.sendMessage({ message: contentToSend });
    let textResponse = result.text || "I'm sorry, I couldn't generate a response.";

    if (result.usageMetadata) {
      console.group('💎 Gemini Token Usage');
      console.log('Prompt Tokens:', result.usageMetadata.promptTokenCount);
      console.log('Output Tokens:', result.usageMetadata.candidatesTokenCount);
      console.log('Total Tokens:', result.usageMetadata.totalTokenCount);
      console.groupEnd();
    }

    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const uniqueSources = new Map();
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          uniqueSources.set(chunk.web.uri, chunk.web.title);
        }
      });

      if (uniqueSources.size > 0) {
        textResponse += '\n\n---\n**Sources found via Google Search:**\n';
        let index = 1;
        uniqueSources.forEach((title, uri) => {
          textResponse += `${index}. [${title}](${uri})\n`;
          index++;
        });
      }
    }

    return res.json({ text: textResponse });
  } catch (error) {
    console.error('Error in Gemini proxy:', error);
    return res.status(500).json({ error: 'Failed to contact Gemini.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, '..', 'dist');

  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
