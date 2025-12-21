
import { ChatSession, ChatMessage } from '../types';

const STORAGE_KEY = 'bfhs_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'bfhs_active_session_v1';

export const getSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: ChatSession[] = JSON.parse(raw);
    // Restore dates from JSON strings
    return sessions.map(s => ({
        ...s,
        messages: s.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
        }))
    })).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    console.error("Failed to load sessions", e);
    return [];
  }
};

export const saveSession = (session: ChatSession) => {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  
  if (idx >= 0) {
      sessions[idx] = session;
  } else {
      sessions.unshift(session);
  }

  // Keep top 20 sessions to avoid overflow
  const trimmed = sessions.slice(0, 20);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
};

export const deleteSession = (id: string) => {
    const sessions = getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const createNewSession = (initialMessage?: ChatMessage): ChatSession => {
    // Standard Welcome Message for fresh chats
    const welcomeMessage: ChatMessage = {
        id: 'welcome-' + Date.now(),
        role: 'model',
        text: "Hi there! I'm **BFHS Help**. \n\nMy main focus is providing **Homework Help** and **Tutoring** to help you succeed in your classes. I can also help you find information in the **Student Handbook** or clarify school policies.\n\n_How can I help you today?_",
        timestamp: new Date()
    };

    const newSession: ChatSession = {
        id: Date.now().toString(),
        title: initialMessage ? (initialMessage.text.slice(0, 30) + (initialMessage.text.length > 30 ? '...' : '')) : 'New Chat',
        messages: initialMessage ? [welcomeMessage, initialMessage] : [welcomeMessage],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    saveSession(newSession);
    return newSession;
};

export const getLastActiveSessionId = (): string | null => {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
};
