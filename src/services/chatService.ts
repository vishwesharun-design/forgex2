import { ChatMessage, ChatSession, ForgeXModelId, FORGEX_MODELS, GeneratedImage } from '../types';
import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';
import { generateExpertChatReply } from './knowledgeEngine';
import { imageService } from './imageService';

export function detectImageGenerationIntent(text: string): { isImage: boolean; prompt: string } {
  if (!text || typeof text !== 'string') return { isImage: false, prompt: '' };
  const clean = text.trim();
  if (!clean) return { isImage: false, prompt: '' };

  // 1. Explicit slash commands (/image, /img, /flux, /picture, /pic, /draw, /paint, /art, /generate)
  const slashMatch = clean.match(/^\/(?:image|img|flux|picture|pic|draw|paint|art|generate|visual|render)\b\s*(.*)$/i);
  if (slashMatch) {
    const p = (slashMatch[1] || '').trim();
    return { isImage: true, prompt: p || 'A stunning creative visual masterpiece with intricate details' };
  }

  // 2. Colon prefix (image:, img:, draw:, paint:, visual:, wallpaper:, flux:, picture:)
  const colonMatch = clean.match(/^(?:image|img|draw|paint|picture|photo|artwork|illustration|visual|wallpaper|render|flux)\s*:\s*(.+)$/i);
  if (colonMatch && colonMatch[1]) {
    return { isImage: true, prompt: colonMatch[1].trim().replace(/[?!.]+$/, '') };
  }

  // 3. Short standalone phrases requesting creation without arguments
  // e.g. "create an image", "generate a picture", "draw something", "can u create one"
  if (/^(?:hey|hi|hello)?\s*(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:u\s+|you\s+)?(?:create|generate|make|draw|paint|give(?:\s+me)?|show(?:\s+me)?)(?:\s+something|\s+one|\s+an?\s+image|\s+an?\s+picture|\s+an?\s+art|\s+an?\s+artwork|\s+an?\s+visual)?\s*[?!.]*$/i.test(clean)) {
    return { isImage: true, prompt: 'A breathtaking futuristic digital artwork masterpiece with vibrant neon lighting and intricate details' };
  }

  // 4. Broad Action Verb + Image Noun + Subject
  // Examples:
  // "give me an image of a red sports car"
  // "can you give me an image of a cat"
  // "create an image showing an astronaut on mars"
  // "generate photos of cyberpunk streets"
  // "make a picture depicting deep ocean life"
  // "draw me an illustration of a dragon"
  // "show me a wallpaper of snowy mountains"
  const actionNounMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:i\s+(?:want|need|would\s+like)(?:\s+you)?\s+(?:to\s+)?)?(?:generate|create|make|draw|paint|render|show(?:\s+me)?|give(?:\s+me)?|send(?:\s+me)?|produce|design|craft|illustrate|sketch|visualize|imagine|display|provide(?:\s+me)?)\s+(?:an?\s+|some\s+|the\s+)?(?:images?|pictures?|pics?|photos?|photographs?|illustrations?|drawings?|artworks?|graphics?|wallpapers?|portraits?|scenes?|visuals?|art|renders?)\s*(?:of|with|depicting|showing|featuring|having|containing|about|that\s+shows|where|for)?\s*(.*)$/i
  );
  if (actionNounMatch) {
    const rawPrompt = (actionNounMatch[1] || '').trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm)\b/i.test(rawPrompt)) {
      const finalPrompt = rawPrompt.replace(/[?!.]+$/, '').trim() || 'A stunning creative visual composition with vibrant lighting';
      return { isImage: true, prompt: finalPrompt };
    }
  }

  // 5. Direct artistic verbs without image noun:
  // "draw me a cat", "paint a sunset over mountains", "sketch a futuristic mech", "visualize a magical kingdom"
  const directVerbMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:draw|paint|sketch|illustrate|visualize|imagine|render)\s+(?:me\s+)?(?:a|an|the|some)?\s*(.+?)[?!.]*$/i
  );
  if (directVerbMatch && directVerbMatch[1]) {
    const candidate = directVerbMatch[1].trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|diagram|chart|graph|flowchart|essay|story|poem|song)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 6. Direct "create / generate / make me <subject>"
  const directCreateMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:create|generate|make)\s+(?:me\s+)?(?:a|an)\s+([^.\n?!]+)[?!.]*$/i
  );
  if (directCreateMatch && directCreateMatch[1]) {
    const candidate = directCreateMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm|test|report|summary|presentation|document)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 7. Direct "image / picture / photo / wallpaper of <subject>"
  const nounOfMatch = clean.match(
    /^(?:an?\s+|the\s+)?(?:images?|pictures?|pics?|photos?|photographs?|wallpapers?|illustrations?|drawings?|artworks?|portraits?|renders?|graphics?|visuals?)\s+(?:of|with|depicting|showing|featuring|for|about)\s+(.+?)[?!.]*$/i
  );
  if (nounOfMatch && nounOfMatch[1]) {
    const candidate = nounOfMatch[1].trim();
    if (!/^(?:code|function|script|component|table|list|essay|story|poem|song)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 8. Style descriptors: "a realistic photo of...", "cinematic shot of...", "digital art of..."
  const photoStyleMatch = clean.match(
    /^(?:a|an)\s+(?:realistic\s+photo|photorealistic\s+image|cinematic\s+shot|digital\s+art|concept\s+art|watercolor\s+painting|oil\s+painting|3d\s+render|detailed\s+drawing)\s+(?:of|with|showing|depicting)?\s*(.+?)[?!.]*$/i
  );
  if (photoStyleMatch && photoStyleMatch[1]) {
    return { isImage: true, prompt: clean.replace(/[?!.]+$/, '').trim() };
  }

  // 9. Edit / transform patterns: "edit this image to...", "modify image...", "change to..."
  const editMatch = clean.match(
    /^(?:please\s+)?(?:can|could)?\s*(?:you|u)?\s*(?:edit|modify|alter|change|transform|remix)\s+(?:this\s+|the\s+)?(?:image|picture|photo)?\s*(?:to|with|into)?\s*(.+?)[?!.]*$/i
  ) || clean.match(/^(?:now\s+)?(?:make\s+it|change\s+it\s+to|turn\s+it\s+into|edit\s+it\s+to|regenerate\s+with)\s+(.+?)[?!.]*$/i);
  if (editMatch && editMatch[1]) {
    const candidate = editMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|test)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  return { isImage: false, prompt: '' };
}

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

  createSession(modelId: ForgeXModelId = 'forge-2-ultra', initialTitle = 'New Chat'): ChatSession {
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

  createNewSession(modelId: ForgeXModelId = 'forge-2-ultra'): ChatSession {
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
    attachments?: ChatMessage['attachments'],
    onStreamChunk?: (streamedText: string, modelName?: string, sources?: any[]) => void,
    searchMode: 'auto' | 'on' | 'off' = 'auto',
    onSearchStatus?: (searching: boolean, searchQuery?: string) => void,
    onImageProgress?: (progress: number) => void
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

    // Image Generation in Chat via Black Forest Labs FLUX
    // When generating image: do NOT output conversational text!
    // After created: ONLY show the image!
    const imgIntent = detectImageGenerationIntent(userContent);
    if (imgIntent.isImage && imgIntent.prompt) {
      let generatedImagesForTurn: GeneratedImage[] = [];
      try {
        const generated = await imageService.generateImages(
          {
            prompt: imgIntent.prompt,
            aspectRatio: '16:9',
            count: 1,
            style: 'None', // Obey exact prompt fidelity without conflicting style injections
            modelId,
          },
          onImageProgress
        );
        if (generated && generated.length > 0) {
          generatedImagesForTurn = generated;
        }
      } catch (imgErr) {
        console.warn('Image generation in chat notice:', imgErr);
      }

      const assistantMessage: ChatMessage = {
        id: 'asst_msg_' + Date.now(),
        role: 'assistant',
        content: '', // NO TEXT! ONLY THE IMAGE!
        timestamp: Date.now(),
        modelUsed: 'Black Forest Labs FLUX (Puter)',
        generatedImages: generatedImagesForTurn,
      };

      session.messages.push(assistantMessage);
      session.updatedAt = Date.now();
      this.saveSessions(sessions);
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        firestoreStorageService.saveUserChat(userId, session).catch(() => {});
      }
      return { updatedSession: session, assistantMessage };
    }

    const rawApiKey = localStorage.getItem('forgex_api_key') || undefined;
    const geminiApiKey = rawApiKey && rawApiKey.startsWith('AIza') ? rawApiKey : undefined;
    const modelMeta = FORGEX_MODELS.find((m) => m.id === modelId) || FORGEX_MODELS[4];
    let assistantReplyText = '';
    let modelUsedName = modelMeta.name;
    let responseSearchedWeb = false;
    let responseSearchQueries: string[] = [];
    let responseGroundingSources: any[] = [];

    const isCreatorQuery = /(?:who\s+(?:created|made|developed|built|designed|programmed|coded|founded|invented)\s+(?:you|forgex|this\s+(?:app|ai|website|platform|software|system))|who\s+is\s+your\s+(?:creator|maker|developer|author|architect|father|founder|boss|programmer)|who\s+created\s+you|who\s+made\s+you|who\s+are\s+your\s+creators|who\s+owns\s+you|who\s+built\s+forgex|creator\s+of\s+forgex|who\s+is\s+vishwesh|who\s+is\s+vishweshvarman|what\s+is\s+the\s+creator(?:'s)?\s+name)/i.test(userContent);

    const history = session.messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 1. Try real-time streaming first for instant token output
    let streamedSuccessfully = false;
    try {
      const streamRes = await fetch('/api/chat/stream', {
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
          searchMode,
        }),
      });

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payloadStr = trimmed.slice(5).trim();
            if (!payloadStr) continue;
            try {
              const data = JSON.parse(payloadStr);
              if (data.searching && onSearchStatus) {
                onSearchStatus(true, data.searchQuery);
              }
              if (data.groundingSources && Array.isArray(data.groundingSources)) {
                responseGroundingSources = data.groundingSources;
              }
              if (data.searchedWeb !== undefined) {
                responseSearchedWeb = Boolean(data.searchedWeb);
              }
              if (Array.isArray(data.searchQueries)) {
                responseSearchQueries = data.searchQueries;
              }
              if (data.model) {
                modelUsedName = /gemini/i.test(data.model) ? 'ForgeX Neural Engine' : data.model;
              }
              if (data.text) {
                if (onSearchStatus) onSearchStatus(false);
                accumulated += data.text;
                if (onStreamChunk) {
                  onStreamChunk(accumulated, modelUsedName, responseGroundingSources);
                }
              }
            } catch (_parseErr) {
              // Ignore partial chunk parsing
            }
          }
        }

        if (accumulated.trim().length > 0) {
          assistantReplyText = accumulated;
          streamedSuccessfully = true;
        }
      }
    } catch (_streamErr) {
      // Fall through to non-streaming endpoint
    } finally {
      if (onSearchStatus) onSearchStatus(false);
    }

    // 2. Fallback to /api/chat if streaming was not available or produced no output
    if (!streamedSuccessfully) {
      try {
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
            searchMode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            assistantReplyText = data.reply;
            if (data.model) {
              modelUsedName = /gemini/i.test(data.model) ? 'ForgeX Neural Engine' : data.model;
            }
            if (data.searchedWeb !== undefined) {
              responseSearchedWeb = Boolean(data.searchedWeb);
            }
            if (Array.isArray(data.searchQueries)) {
              responseSearchQueries = data.searchQueries;
            }
            if (Array.isArray(data.groundingSources)) {
              responseGroundingSources = data.groundingSources;
            }
          }
        }
      } catch (_networkErr) {
        // Proceed to procedural synthesizer fallback
      }
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
      searchedWeb: responseSearchedWeb,
      searchQueries: responseSearchQueries,
      groundingSources: responseGroundingSources,
      generatedImages: undefined,
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
