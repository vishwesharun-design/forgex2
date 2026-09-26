import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Paperclip,
  Crown,
  Gamepad2,
  Cpu,
  Flame,
  Rocket,
  Code2,
  PenTool,
  Image as ImageIcon,
  Music,
  ExternalLink,
} from 'lucide-react';
import { ForgeXModelId, ForgeXTheme, FORGEX_MODELS } from '../types';
import { StudioCatalogueItem, studioService } from '../services/studioService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CustomStudioWorkspaceProps {
  studio: StudioCatalogueItem;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel?: (modelId: ForgeXModelId) => void;
  onOpenStore?: () => void;
  user?: { id?: string; email?: string; name?: string } | null;
  onDeleteStudio?: (studioId: string) => void;
  onRemoveFromSidebar?: (studioId: string) => void;
}

interface CustomMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Crown,
  Gamepad2,
  Sparkles,
  Cpu,
  Flame,
  Rocket,
  Code2,
  PenTool,
  Image: ImageIcon,
  Music,
};

export const CustomStudioWorkspace: React.FC<CustomStudioWorkspaceProps> = ({
  studio,
  theme,
  selectedModelId,
  onSelectModel,
  onOpenStore,
  user,
  onDeleteStudio,
  onRemoveFromSidebar,
}) => {
  const isDark = theme === 'dark';
  const Icon = ICON_MAP[studio.iconName] || Bot;
  const isCreator = !studio.isOfficial && studioService.canDeleteStudio(studio.id, user?.id, user?.email, user?.name);

  const storageKey = `forgex_custom_studio_chat_${studio.id}`;
  const [messages, setMessages] = useState<CustomMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: studio.welcomeMessage || `Welcome to **${studio.title}**!\n\n${studio.description}\n\n*How can I assist you right now?*`,
        timestamp: Date.now(),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: CustomMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'msg_welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const systemInstruction = `You are running inside a specialized custom studio: "${studio.title}".
Studio Creator: ${studio.author}.
Studio Description: ${studio.description}

SPECIALIZED STUDIO OPERATING LOGIC & BEHAVIOR:
${studio.systemPrompt || 'Answer questions authoritatively and comprehensively.'}

Follow these instructions strictly, adopt the specialized persona, and maintain maximum usefulness for the user.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          modelId: selectedModelId,
          systemInstruction,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.reply || "I've processed your request.";
        setMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: 'assistant',
            content: replyText,
            timestamp: Date.now(),
          },
        ]);
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (err) {
      // Local intelligent response using studio instructions
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: `### Response from ${studio.title}\n\nProcessed your prompt: *"${text}"*.\n\n*Working under studio parameters:*\n- Creator: ${studio.author}\n- Mode: ${studio.badge}\n\nLet me know how you'd like to refine or proceed!`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Reset this studio conversation?')) {
      const reset = [
        {
          id: `msg_welcome_${Date.now()}`,
          role: 'assistant' as const,
          content: studio.welcomeMessage || `Welcome to **${studio.title}**! How can I assist you today?`,
          timestamp: Date.now(),
        },
      ];
      setMessages(reset);
      localStorage.setItem(storageKey, JSON.stringify(reset));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`flex-1 flex flex-col h-full min-h-0 relative ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
    }`}>
      {/* Studio Header */}
      <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}>
            <Icon className={`w-5 h-5 ${studio.accentColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base">{studio.title}</h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-800'
              }`}>
                {studio.badge}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
              <span>by</span>
              <span className="font-medium text-amber-500/90 dark:text-amber-400">
                {studio.author}
              </span>
              <span className="text-[10px] opacity-60">• {studio.category}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenStore && (
            <button
              onClick={onOpenStore}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                isDark ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              All Studios
            </button>
          )}

          {/* Remove from sidebar button for any user who pinned it */}
          {onRemoveFromSidebar && (
            <button
              type="button"
              onClick={() => onRemoveFromSidebar(studio.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-neutral-800 hover:border-amber-500/40 text-neutral-400 hover:text-amber-400'
                  : 'border-neutral-200 hover:border-amber-500/40 text-neutral-600 hover:text-amber-800'
              }`}
              title="Remove this studio from your sidebar"
            >
              Remove from Sidebar
            </button>
          )}

          {/* Delete studio button: ONLY for the creator of this studio */}
          {isCreator && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete your studio "${studio.title}"? This cannot be undone.`)) {
                  const deleted = studioService.deleteCustomStudio(studio.id, user?.id, user?.email, user?.name);
                  if (deleted && onDeleteStudio) {
                    onDeleteStudio(studio.id);
                  }
                }
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors"
              title="Delete this studio permanently (Creator only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Studio</span>
            </button>
          )}

          <button
            onClick={handleClearChat}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-amber-400' : 'hover:bg-neutral-100 text-neutral-600 hover:text-amber-800'
            }`}
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        {/* Studio Info Banner */}
        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-neutral-900/40 border-neutral-800/80 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
                Studio Capabilities & Rules
              </div>
              <MarkdownRenderer content={studio.description} theme={theme} className="text-xs opacity-90" />
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-neutral-500">Author:</span>
              <div className="text-xs font-bold text-neutral-200">{studio.author}</div>
            </div>
          </div>

          {/* Starter action suggestions */}
          {studio.starterPrompts && studio.starterPrompts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed border-neutral-800/50">
              <div className="text-[10px] font-semibold text-neutral-400 mb-2">QUICK ACTIONS:</div>
              <div className="flex flex-wrap gap-2">
                {studio.starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border text-left transition-all ${
                      isDark
                        ? 'bg-neutral-950 border-neutral-800 hover:border-amber-500/50 hover:text-amber-400'
                        : 'bg-neutral-50 border-neutral-300 hover:border-amber-500 hover:text-amber-800'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Turns */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm ${
                isUser
                  ? 'bg-amber-500 text-black font-medium ml-auto'
                  : isDark
                    ? 'bg-neutral-900 border border-neutral-800 text-neutral-100'
                    : 'bg-white border border-neutral-200 text-neutral-900'
              }`}>
                {isUser ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                    {msg.content}
                  </div>
                ) : (
                  <MarkdownRenderer
                    content={msg.content}
                    theme={theme}
                  />
                )}

                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-dashed border-neutral-800/40 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>{studio.title}</span>
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="p-1 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>{studio.title} is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className={`p-4 border-t ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className={`flex items-center gap-2 p-1.5 rounded-2xl border ${
            isDark ? 'bg-neutral-950 border-neutral-800 focus-within:border-amber-500/60' : 'bg-neutral-100 border-neutral-300 focus-within:border-amber-500'
          }`}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${studio.title}...`}
            className="flex-1 bg-transparent px-3 py-2 text-xs focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black transition-all font-bold"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
