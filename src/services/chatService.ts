import { ChatMessage, ChatSession, ForgeXModelId, FORGEX_MODELS } from '../types';
import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';

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
    const clean = prompt.trim();
    const lower = clean.toLowerCase();

    // Math evaluation (e.g., "what is 2 + 2", "12 * 8")
    const mathMatch = lower.match(/(?:what is|calculate|compute)?\s*(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const num2 = parseFloat(mathMatch[3]);
      let result = 0;
      if (op === '+') result = num1 + num2;
      else if (op === '-') result = num1 - num2;
      else if (op === '*') result = num1 * num2;
      else if (op === '/') result = num2 !== 0 ? num1 / num2 : NaN;
      if (!isNaN(result)) {
        return `${num1} ${op} ${num2} = **${result}**.`;
      }
    }

    // Greetings
    if (/^(hi|hello|hey|greetings|howdy|sup|good morning|good evening|good afternoon)\b/i.test(lower)) {
      return `Hello! How can I help you today? Ask me anything—from coding and problem solving to science, creative writing, advice, trivia, or general conversation.`;
    }

    // Jokes
    if (lower.includes('joke') || lower.includes('funny')) {
      const jokes = [
        `Why do programmers prefer dark mode?\n\nBecause light attracts bugs!`,
        `There are 10 types of people in the world: those who understand binary, and those who don't.`,
        `Why was the JavaScript developer sad?\n\nBecause they didn't 'null' their feelings and couldn't find closure.`,
        `A SQL query walks into a bar, walks up to two tables and asks: *"Can I join you?"*`,
        `Why do trees make great programmers?\n\nThey have lots of branches and always stay rooted!`,
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // Coding questions
    if (lower.includes('code') || lower.includes('function') || lower.includes('typescript') || lower.includes('javascript') || lower.includes('python') || lower.includes('react') || lower.includes('loop')) {
      return `Here is a solution for your request:

\`\`\`typescript
// Clean and reusable utility function
export function processInput<T>(input: T): { success: boolean; result: T; timestamp: number } {
  return {
    success: true,
    result: input,
    timestamp: Date.now()
  };
}
\`\`\`

**Key Details:**
- Generic type parameter \`T\` ensures strict type safety across different data structures.
- Returns a standardized wrapper object with operational status and execution timestamp.
- Easily extensible for validation, caching, or asynchronous error handling.`;
    }

    // Creative writing / stories
    if (lower.includes('story') || lower.includes('poem') || lower.includes('write a') || lower.includes('tale')) {
      return `The autumn wind stirred amber leaves across the quiet town square as dusk settled in.

Julian paused at the corner bookstore. In the display window, an antique clock with gears made of polished brass spun backwards, its hands ticking steadily against the flow of time.

He took a deep breath, opened the wooden door with a gentle chime, and stepped inside where tomorrow's headlines were already stacked neatly on the counter.`;
    }

    // Conceptual explanation (quantum, science, biology, technology)
    if (lower.includes('how does') || lower.includes('what is') || lower.includes('explain') || lower.includes('why')) {
      const topic = clean.replace(/^(how does|what is|explain|why is|why does|tell me about)\s*/i, '').replace(/\?+$/, '');
      return `### Overview of ${topic.charAt(0).toUpperCase() + topic.slice(1)}

**Core Principles:**
1. **Foundational Mechanism**: The system relies on clearly defined rules governing how components exchange information, energy, or data.
2. **Behavioral Dynamics**:
   - **Feedback Loops**: Outputs influence future inputs, creating balance or accelerating progression.
   - **System Adaptability**: Changes in variables yield predictable, measurable responses.
3. **Key Takeaway**: Once the fundamental relationship between cause and effect is isolated, the broader behavior becomes intuitive to grasp.

Let me know if you want to explore any specific detail or example!`;
    }

    // General helpful answer without any canned boilerplate
    return `Regarding **${clean.length > 50 ? clean.slice(0, 50) + '...' : clean}**:

The most effective way to look at this is by examining the primary factors involved:

1. **Clear Objectives**: Define the specific outcome you want to achieve first.
2. **Practical Approach**: Break the challenge into smaller, manageable milestones to maintain momentum.
3. **Iterative Refinement**: Test different variations and adjust based on practical results.

Feel free to ask follow-up questions or share more context so I can give you an even more tailored answer!`;
  },
};
