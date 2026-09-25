import { ChatMessage, ChatSession, ForgeXModelId, FORGEX_MODELS } from '../types';
import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';
import { generateExpertChatReply } from './knowledgeEngine';

const MOCK_CHAT_IDS = new Set(['chat_1', 'chat_2', 'chat_3', 'chat_4']);

function getChatStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_chat_sessions_${partition}`;
}

export const chatService = {
  getSessions(): ChatSession[] {
    try {
      const key = getChatStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        // Clean out any legacy mock sessions to strictly adhere to NO default/false data
        const realSessions = Array.isArray(parsed) 
          ? parsed.filter((s) => !MOCK_CHAT_IDS.has(s.id)) 
          : [];
        if (realSessions.length !== parsed.length) {
          this.saveSessions(realSessions);
        }
        return realSessions;
      }
    } catch (e) {
      console.error('Failed to load chat sessions', e);
    }
    return [];
  },

  async syncWithFirestore(): Promise<ChatSession[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        const cloudSessions = await firestoreStorageService.loadUserChats(userId);
        if (cloudSessions.length > 0) {
          this.saveSessions(cloudSessions);
          return cloudSessions;
        } else {
          // Push existing local sessions to cloud for this user
          const localSessions = this.getSessions();
          for (const s of localSessions) {
            await firestoreStorageService.saveUserChat(userId, s);
          }
        }
      }
    } catch (err) {
      console.warn('Chat sync error:', err);
    }
    return this.getSessions();
  },

  saveSessions(sessions: ChatSession[]): void {
    try {
      const key = getChatStorageKey();
      localStorage.setItem(key, JSON.stringify(sessions));
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        sessions.slice(0, 15).forEach((s) => {
          firestoreStorageService.saveUserChat(userId, s).catch(() => {});
        });
      }
    } catch (e) {
      console.error('Failed to save chat sessions', e);
    }
  },

  createSession(modelId: ForgeXModelId = 'unreal-5', initialTitle = 'New Chat'): ChatSession {
    const sessions = this.getSessions();
    const newSession: ChatSession = {
      id: 'chat_' + Date.now(),
      title: initialTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId,
      messages: [],
    };
    const updated = [newSession, ...sessions];
    this.saveSessions(updated);
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.saveUserChat(userId, newSession).catch(() => {});
    }
    return newSession;
  },

  createNewSession(modelId: ForgeXModelId = 'unreal-5'): ChatSession {
    return this.createSession(modelId, 'New Chat');
  },

  renameSession(sessionId: string, newTitle: string): ChatSession[] {
    const sessions = this.getSessions().map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s));
    this.saveSessions(sessions);
    return sessions;
  },

  deleteSession(sessionId: string): ChatSession[] {
    const sessions = this.getSessions().filter((s) => s.id !== sessionId);
    this.saveSessions(sessions);
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.deleteUserChat(userId, sessionId).catch(() => {});
    }
    return sessions;
  },

  deleteMessage(sessionId: string, messageId: string): ChatSession | null {
    const sessions = this.getSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    session.messages = session.messages.filter((m) => m.id !== messageId);
    session.updatedAt = Date.now();
    this.saveSessions(sessions);
    return session;
  },

  clearSession(sessionId: string): ChatSession | null {
    const sessions = this.getSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    session.messages = [];
    session.updatedAt = Date.now();
    this.saveSessions(sessions);
    return session;
  },

  async sendMessage(
    sessionId: string,
    userContent: string,
    modelId: ForgeXModelId,
    attachments?: ChatMessage['attachments']
  ): Promise<{ updatedSession: ChatSession; assistantMessage: ChatMessage }> {
    let sessions = this.getSessions();
    let session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      session = {
        id: 'chat_' + Date.now(),
        title: userContent.slice(0, 28) + (userContent.length > 28 ? '...' : '') || 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId,
        messages: [],
      };
      sessions = [session, ...sessions.filter((s) => s.id !== session!.id)];
    }

    const userMessage: ChatMessage = {
      id: 'usr_msg_' + Date.now(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
      attachments,
    };

    session.messages.push(userMessage);
    if (session.title === 'New Chat' || session.title === 'New project') {
      session.title = userContent.slice(0, 28) + (userContent.length > 28 ? '...' : '');
    }
    session.updatedAt = Date.now();
    session.modelId = modelId;

    // Immediately persist user turn so messages are never lost
    this.saveSessions(sessions);

    const rawApiKey = localStorage.getItem('forgex_api_key') || undefined;
    const geminiApiKey = rawApiKey && rawApiKey.startsWith('AIza') ? rawApiKey : undefined;
    const modelMeta = FORGEX_MODELS.find((m) => m.id === modelId) || FORGEX_MODELS[4];
    let assistantReplyText = '';
    let modelUsedName = modelMeta.name;

    const isCreatorQuery = /(?:who\s+(?:created|made|developed|built|designed|programmed|coded|founded|invented)\s+(?:you|forgex|this\s+(?:app|ai|website|platform|software|system))|who\s+is\s+your\s+(?:creator|maker|developer|author|architect|father|founder|boss|programmer)|who\s+created\s+you|who\s+made\s+you|who\s+are\s+your\s+creators|who\s+owns\s+you|who\s+built\s+forgex|creator\s+of\s+forgex|who\s+is\s+vishwesh|who\s+is\s+vishweshvarman|what\s+is\s+the\s+creator(?:'s)?\s+name)/i.test(userContent);

    // Call full-stack /api/chat endpoint
    try {
      const history = session.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'x-api-key': geminiApiKey } : {}),
        },
        body: JSON.stringify({
          message: userContent,
          history,
          modelId,
          attachments,
          apiKey: geminiApiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.reply) {
          assistantReplyText = data.reply;
          if (data.model) {
            modelUsedName = /gemini/i.test(data.model) ? 'ForgeX Neural Engine' : data.model;
          }
        }
      }
    } catch (_networkErr) {
      // Proceed to procedural synthesizer fallback
    }

    // Fallback if network or server did not return text
    if (!assistantReplyText) {
      assistantReplyText = this.generateResponse(userContent);
    }

    // Enforce creator attribution to VishweshVarman
    if (isCreatorQuery && !assistantReplyText.toLowerCase().includes('vishweshvarman')) {
      assistantReplyText = `I was created by **VishweshVarman** as part of **ForgeX** — an all-in-one AI creation platform for conversations, image creation, AI song making, deep research, and Code Studio.`;
    }

    const assistantMessage: ChatMessage = {
      id: 'asst_msg_' + Date.now(),
      role: 'assistant',
      content: assistantReplyText,
      timestamp: Date.now(),
      modelUsed: modelUsedName,
    };

    session.messages.push(assistantMessage);
    session.updatedAt = Date.now();

    // Re-fetch in case other sessions updated, ensure current session is updated
    const finalSessions = this.getSessions().map((s) => (s.id === session!.id ? session! : s));
    if (!finalSessions.some((s) => s.id === session!.id)) {
      finalSessions.unshift(session!);
    }
    this.saveSessions(finalSessions);

    return { updatedSession: session, assistantMessage };
  },

  generateResponse(prompt: string): string {
    return generateExpertChatReply(prompt);
  },
};
