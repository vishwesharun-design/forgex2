import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  CornerDownLeft, 
  X, 
  FileText, 
  StopCircle, 
  ArrowRight, 
  ArrowUp,
  AlertCircle, 
  Trash2, 
  RotateCcw,
  AudioLines,
  Plus,
  Headphones,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ChatMessage, ChatSession, ForgeXModelId, ForgeXTheme, FORGEX_MODELS } from '../types';
import { chatService } from '../services/chatService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { detectWebSearchIntent } from '../utils/searchIntent';

interface ChatWorkspaceProps {
  currentSession: ChatSession | null;
  onUpdateSession: (updatedSession: ChatSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  selectedModelId: ForgeXModelId;
  theme: ForgeXTheme;
  onNavigateToImage: () => void;
  onNavigateToVideo?: () => void;
  onNavigateToMusic?: () => void;
  onOpenVoiceMode?: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  currentSession,
  onUpdateSession,
  onDeleteSession,
  onNewChat,
  selectedModelId,
  theme,
  onNavigateToImage,
  onNavigateToVideo,
  onNavigateToMusic,
  onOpenVoiceMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingQuery, setSearchingQuery] = useState<string | null>(null);
  const [searchedForQueryDuringTurn, setSearchedForQueryDuringTurn] = useState<string | null>(null);
  const [expandedDomainGroup, setExpandedDomainGroup] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ type: 'file' | 'image'; name: string; url?: string }[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [pendingUserTurn, setPendingUserTurn] = useState<{
    text: string;
    attachments?: ChatMessage['attachments'];
  } | null>(null);
  const [streamingReply, setStreamingReply] = useState<{
    text: string;
    modelUsed?: string;
    groundingSources?: any[];
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === 'dark';
  const currentModel = FORGEX_MODELS.find((m) => m.id === selectedModelId) || FORGEX_MODELS[4];

  // Group sources by domain for compact ChatGPT-style pills
  const renderSourcePills = (sources: any[] | undefined, messageId: string) => {
    if (!sources || sources.length === 0) return null;

    const domainGroups: { domain: string; primary: any; items: any[] }[] = [];
    const domainMap = new Map<string, { domain: string; primary: any; items: any[] }>();

    for (const s of sources) {
      let domain = s.sourceDomain || '';
      if (!domain) {
        try {
          domain = new URL(s.url).hostname.replace(/^www\./, '');
        } catch {
          domain = 'web';
        }
      }
      const key = domain.toLowerCase();
      if (!domainMap.has(key)) {
        const group = { domain, primary: s, items: [s] };
        domainMap.set(key, group);
        domainGroups.push(group);
      } else {
        domainMap.get(key)!.items.push(s);
      }
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 pb-0.5">
        {domainGroups.map((group) => {
          const hasMultiple = group.items.length > 1;
          const popoverKey = `${messageId}-${group.domain}`;
          const isExpanded = expandedDomainGroup === popoverKey;

          return (
            <div key={group.domain} className="relative inline-flex items-center">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border transition-colors select-none ${
                  isDark
                    ? 'bg-neutral-800/90 hover:bg-neutral-700/90 border-neutral-700/80 text-neutral-200'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 border-neutral-200/90 text-neutral-800 shadow-2xs'
                }`}
              >
                {/* Circular Favicon */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${group.domain}&sz=32`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full object-contain shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Primary Link / Title */}
                <a
                  href={group.primary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${group.primary.title}\n${group.primary.url}`}
                  className="truncate max-w-[125px] sm:max-w-[155px] hover:underline"
                >
                  {group.primary.title || group.domain}
                </a>

                {/* +N multiple count pill badge if more than 1 source from this domain */}
                {hasMultiple && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDomainGroup(isExpanded ? null : popoverKey);
                    }}
                    title={`${group.items.length} sources from ${group.domain}`}
                    className={`text-[10px] font-mono font-medium px-1 py-0.2 rounded-full cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
                        : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'
                    }`}
                  >
                    +{group.items.length - 1}
                  </button>
                )}
              </div>

              {/* Popover showing all sources in this cluster if +N is clicked */}
              {isExpanded && (
                <div
                  className={`absolute left-0 bottom-full mb-2 z-50 w-64 p-2 rounded-xl border shadow-xl text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-200 shadow-black/60'
                      : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/60'
                  }`}
                >
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-200/60 dark:border-neutral-800 text-[11px] font-medium text-neutral-500">
                    <span>{group.domain} ({group.items.length} links)</span>
                    <button
                      type="button"
                      onClick={() => setExpandedDomainGroup(null)}
                      className="hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {group.items.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block p-1.5 rounded-lg transition-colors truncate ${
                          isDark ? 'hover:bg-neutral-800 text-neutral-300 hover:text-white' : 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950'
                        }`}
                        title={item.title}
                      >
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{item.url}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const displayMessages: ChatMessage[] = [
    ...(currentSession?.messages || []),
    ...(pendingUserTurn
      ? [
          {
            id: 'pending_user_turn',
            role: 'user' as const,
            content: pendingUserTurn.text,
            timestamp: Date.now(),
            attachments: pendingUserTurn.attachments,
          },
        ]
      : []),
    ...(streamingReply && streamingReply.text
      ? [
          {
            id: 'streaming_asst_turn',
            role: 'assistant' as const,
            content: streamingReply.text,
            timestamp: Date.now(),
            modelUsed: streamingReply.modelUsed || currentModel.name,
            isStreaming: true,
            searchedWeb: Boolean(searchedForQueryDuringTurn || (streamingReply.groundingSources && streamingReply.groundingSources.length > 0)),
            searchQueries: searchedForQueryDuringTurn ? [searchedForQueryDuringTurn] : undefined,
            groundingSources: streamingReply.groundingSources,
          },
        ]
      : []),
  ];

  const hasMessages = displayMessages.length > 0;
  const baseTextRef = useRef<string>('');
  const [voiceModeState, setVoiceModeState] = useState<'idle' | 'listening' | 'transcribing' | 'typing'>('idle');
  const typingTimerRef = useRef<any>(null);
  const transcribingSafetyTimerRef = useRef<any>(null);

  // Typewriter effect to smoothly type what user spoke
  const typeOutTranscript = (speech: string) => {
    if (transcribingSafetyTimerRef.current) {
      clearTimeout(transcribingSafetyTimerRef.current);
      transcribingSafetyTimerRef.current = null;
    }

    const cleanSpeech = speech.trim();
    if (!cleanSpeech) {
      setVoiceModeState('idle');
      if (baseTextRef.current) {
        setInputText(baseTextRef.current);
      }
      return;
    }

    setVoiceModeState('transcribing');

    // Show "Transcribing..." in the chat bar for ~450ms before typing out what was spoken
    setTimeout(() => {
      setVoiceModeState('typing');
      const prefix = baseTextRef.current.trim() ? `${baseTextRef.current.trim()} ` : '';
      const fullText = prefix + cleanSpeech;
      let currLength = prefix.length;
      setInputText(prefix);

      const stepDuration = Math.max(12, Math.min(22, Math.floor(600 / Math.max(1, cleanSpeech.length))));

      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }

      typingTimerRef.current = setInterval(() => {
        currLength++;
        setInputText(fullText.slice(0, currLength));

        if (currLength >= fullText.length) {
          if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          setVoiceModeState('idle');
          baseTextRef.current = fullText;
          textareaRef.current?.focus();
        }
      }, stepDuration);
    }, 450);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
      if (transcribingSafetyTimerRef.current) {
        clearTimeout(transcribingSafetyTimerRef.current);
      }
    };
  }, []);

  // Dual-Engine Web Speech & Gemini Audio Transcription integration
  const {
    isListening,
    isProcessing,
    audioLevel,
    durationSeconds,
    error: voiceError,
    toggleListening: rawToggleListening,
    clearError: clearVoiceError,
  } = useVoiceInput({
    onSpeechFinished: (transcript: string) => {
      typeOutTranscript(transcript);
    },
  });

  // Revert voiceModeState if voice error occurs
  useEffect(() => {
    if (voiceError) {
      setVoiceModeState('idle');
      if (baseTextRef.current && !inputText) {
        setInputText(baseTextRef.current);
      }
    }
  }, [voiceError]);

  const toggleListening = () => {
    if (voiceModeState === 'listening' || isListening) {
      setVoiceModeState('transcribing');
      rawToggleListening();

      if (transcribingSafetyTimerRef.current) {
        clearTimeout(transcribingSafetyTimerRef.current);
      }
      transcribingSafetyTimerRef.current = setTimeout(() => {
        setVoiceModeState((prev) => {
          if (prev === 'transcribing') {
            if (baseTextRef.current) setInputText(baseTextRef.current);
            return 'idle';
          }
          return prev;
        });
      }, 6000);
    } else {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      baseTextRef.current = inputText;
      setInputText('');
      setVoiceModeState('listening');
      rawToggleListening();
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, streamingReply?.text, isSubmitting]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 180)}px`;
    }
  }, [inputText]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && attachedFiles.length === 0) || isSubmitting) return;

    const filesToAttach = [...attachedFiles];
    setAttachedFiles([]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Set optimistic message so user never sees input vanish without response
    setPendingUserTurn({ text, attachments: filesToAttach });
    setStreamingReply(null);

    // Fast-path web search intent detection: Immediately activate the shiny web search UI
    // for web search queries so the user NEVER sees "Thinking..." during web search
    const localSearchIntent = detectWebSearchIntent(text);
    if (localSearchIntent.shouldSearch) {
      const q = localSearchIntent.searchQuery || text;
      setSearchingQuery(q);
      setSearchedForQueryDuringTurn(q);
    } else {
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
    }

    setIsSubmitting(true);

    try {
      const sessionId = currentSession?.id || 'new';
      const { updatedSession } = await chatService.sendMessage(
        sessionId,
        text,
        selectedModelId,
        filesToAttach,
        (streamedText, modelName, sources) => {
          setStreamingReply({
            text: streamedText,
            modelUsed: modelName || currentModel.name,
            groundingSources: sources,
          });
        },
        'auto',
        (isSearching, q) => {
          if (isSearching) {
            const query = q || localSearchIntent.searchQuery || text;
            setSearchingQuery(query);
            setSearchedForQueryDuringTurn(query);
          } else {
            setSearchingQuery(null);
          }
        }
      );
      setStreamingReply(null);
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setPendingUserTurn(null);
      onUpdateSession(updatedSession);
    } catch (error) {
      console.error('Failed to send message', error);
      setStreamingReply(null);
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setPendingUserTurn(null);
    } finally {
      setIsSubmitting(false);
      setStreamingReply(null);
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setPendingUserTurn(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          setAttachedFiles((prev) => [...prev, { type, name: file.name, url }]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachedFiles((prev) => [...prev, { type, name: file.name }]);
      }
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleClearChat = () => {
    if (!currentSession) return;
    const updated = chatService.clearSession(currentSession.id);
    if (updated) {
      onUpdateSession(updated);
    }
  };

  const handleDeleteSession = () => {
    if (!currentSession) return;
    if (onDeleteSession) {
      onDeleteSession(currentSession.id);
    } else {
      chatService.deleteSession(currentSession.id);
      if (onNewChat) onNewChat();
    }
  };


  const renderChatInput = () => {
    const hasContent = Boolean(inputText.trim() || attachedFiles.length > 0);

    return (
      <div className="w-full relative">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs border ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-800 font-medium'
                }`}
              >
                {file.type === 'image' && file.url ? (
                  <img src={file.url} alt={file.name} className="w-5 h-5 rounded object-cover border border-amber-500/40" />
                ) : file.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                <span className="truncate max-w-[140px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className={`${isDark ? 'hover:text-white' : 'hover:text-neutral-900'} ml-1`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ChatGPT Style Rounded Capsule Input Container */}
        <div
          id="chat-input-container"
          className={`relative rounded-3xl p-2 sm:p-2.5 border transition-all duration-200 shadow-sm flex items-center gap-2 ${
            isDark
              ? 'bg-neutral-900/90 border-neutral-800 focus-within:border-neutral-700 shadow-black/40'
              : 'bg-white border-neutral-300 focus-within:border-neutral-400 shadow-neutral-200/60'
          }`}
        >
          {/* Plus Attach Button on Left */}
          <div className="relative shrink-0">
            <button
              id="btn-chat-attach"
              type="button"
              onClick={() => setAttachMenuOpen(!attachMenuOpen)}
              title="Attach files or images"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isDark
                  ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Attach Dropdown Menu */}
            {attachMenuOpen && (
              <div
                className={`absolute bottom-full left-0 mb-2 w-48 rounded-2xl border p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white'
                    : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Upload Document</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="flex-1 min-w-0 flex items-center">
            <textarea
              ref={textareaRef}
              id="chat-textarea"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceModeState === 'listening' || isListening
                  ? 'Listening...'
                  : voiceModeState === 'transcribing' || isProcessing
                  ? 'Transcribing...'
                  : 'Ask ForgeX'
              }
              className={`w-full bg-transparent px-2 py-1 text-sm sm:text-base resize-none outline-none max-h-36 leading-normal transition-colors ${
                isDark ? 'text-white' : 'text-neutral-900'
              } ${
                voiceModeState === 'listening' || isListening
                  ? 'placeholder:text-red-400 placeholder:animate-pulse font-medium'
                  : voiceModeState === 'transcribing' || isProcessing
                  ? 'placeholder:text-amber-500 dark:placeholder:text-amber-400 font-medium'
                  : isDark
                  ? 'placeholder:text-neutral-500'
                  : 'placeholder:text-neutral-500'
              }`}
            />
          </div>

          {/* Action buttons on Right */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Dictation Mic Button */}
            <button
              id="btn-voice-input"
              type="button"
              onClick={toggleListening}
              title={
                voiceModeState === 'listening' || isListening
                  ? 'Stop recording & transcribe'
                  : voiceModeState === 'transcribing' || isProcessing
                  ? 'Transcribing...'
                  : 'Dictate voice input'
              }
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                voiceModeState === 'listening' || isListening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                  : voiceModeState === 'transcribing' || isProcessing
                  ? 'bg-amber-500/20 text-amber-400'
                  : isDark
                  ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {voiceModeState === 'listening' || isListening ? (
                <StopCircle className="w-4 h-4 text-red-400 animate-pulse" />
              ) : voiceModeState === 'transcribing' || isProcessing ? (
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Live Voice Mode Button (near mic icon with distinct audio lines / sound wave icon) */}
            {onOpenVoiceMode && (
              <button
                id="btn-live-voice-mode"
                type="button"
                onClick={onOpenVoiceMode}
                title="Live Voice Mode (real-time voice conversation)"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isDark
                    ? 'hover:bg-neutral-800 text-neutral-400 hover:text-amber-400'
                    : 'hover:bg-neutral-100 text-neutral-600 hover:text-amber-600'
                }`}
              >
                <AudioLines className="w-4 h-4" />
              </button>
            )}

            {/* Circular Send Button with Up Arrow (ChatGPT style) */}
            <button
              id="btn-chat-send"
              type="button"
              disabled={!hasContent || isSubmitting}
              onClick={() => handleSendMessage()}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                hasContent
                  ? isDark
                    ? 'bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95 shadow-sm'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95 shadow-sm'
                  : isDark
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice error notice */}
        {voiceError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs my-1.5 mx-auto max-w-md">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] truncate flex-1">{voiceError}</span>
            <button type="button" onClick={clearVoiceError} className="hover:text-red-200">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleAttachFile(e, 'file')}
      />
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleAttachFile(e, 'image')}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
        {!hasMessages ? (
          /* Empty Initial State: Centered ChatGPT Style */
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full px-2 py-8 select-none animate-in fade-in duration-300">
            <h2 id="chat-empty-title" className="font-display font-medium text-3xl sm:text-4xl tracking-tight mb-8 text-neutral-900 dark:text-white">
              Where should we begin?
            </h2>

            {/* Centered Input Container */}
            <div className="w-full mb-4">
              {renderChatInput()}
            </div>

            {/* What can you do? Button */}
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                type="button"
                id="btn-what-can-you-do"
                onClick={() => handleSendMessage('What can you do?')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                    : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 shadow-sm'
                }`}
              >
                What can you do?
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Messages */
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {/* Chat Control Bar */}
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-neutral-800/80' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`font-semibold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
                  {currentSession?.title || 'Current Chat'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold shrink-0 ${
                  isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {displayMessages.length} {displayMessages.length === 1 ? 'msg' : 'msgs'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-clear-chat-msgs"
                  onClick={handleClearChat}
                  title="Clear all messages in this conversation"
                  className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-colors border ${
                    isDark
                      ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>

                <button
                  id="btn-delete-chat-session"
                  onClick={handleDeleteSession}
                  title="Delete this entire chat conversation"
                  className="px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Chat</span>
                </button>
              </div>
            </div>

            {displayMessages.map((message: ChatMessage) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`group flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {isUser ? (
                    <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
                      {/* Attachments if any */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex flex-col gap-1 items-end">
                              {att.type === 'image' && att.url && (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className={`max-h-48 max-w-xs rounded-xl object-cover border shadow-sm ${
                                    isDark ? 'border-neutral-700' : 'border-neutral-200'
                                  }`}
                                />
                              )}
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs w-fit ${
                                  isDark ? 'bg-neutral-800/80 text-neutral-300' : 'bg-neutral-200 text-neutral-800 font-medium'
                                }`}
                              >
                                {att.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                <span className="truncate max-w-[140px]">{att.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* User message text bubble: Clean light/white style for light theme, neutral dark for dark theme */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 font-normal rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap font-sans transition-colors ${
                          isDark
                            ? 'bg-neutral-800 border border-neutral-700/70 text-neutral-100 shadow-md shadow-black/25'
                            : 'bg-neutral-100/95 border border-neutral-200/90 text-neutral-900 shadow-sm'
                        }`}
                      >
                        {message.content}
                      </div>

                      {/* Action Bar for User Messages */}
                      <div className="mt-1 flex items-center justify-end px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          title="Copy message"
                          className={`flex items-center gap-1 py-0.5 px-1.5 rounded-md text-xs transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                              : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/80'
                          }`}
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 transition-all text-sm leading-relaxed ${
                        isDark
                          ? 'bg-neutral-900/90 border border-neutral-800 text-neutral-100 rounded-tl-sm shadow-md shadow-black/40'
                          : 'bg-white border border-neutral-200 text-neutral-900 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {/* Attachments if any */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex flex-col gap-1">
                              {att.type === 'image' && att.url && (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="max-h-48 max-w-xs rounded-xl object-cover border border-amber-500/20 shadow-sm"
                                />
                              )}
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs w-fit ${
                                  isDark ? 'bg-neutral-800/60 text-neutral-300' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                                }`}
                              >
                                {att.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                <span className="truncate max-w-[140px]">{att.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Body with rich Markdown rendering */}
                      <div className="relative">
                        <MarkdownRenderer
                          content={message.content}
                          theme={theme}
                        />
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse rounded-xs align-middle shadow-sm shadow-amber-400/50" />
                        )}
                      </div>

                      {/* Web Search Sources Pills (ChatGPT Style — rendered at the bottom of the response) */}
                      {message.groundingSources && message.groundingSources.length > 0 ? (
                        renderSourcePills(message.groundingSources, message.id)
                      ) : message.searchedWeb ? (
                        <div className="flex items-center gap-1.5 pt-2 pb-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <Globe className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                          <span>Searched the web{message.searchQueries?.[0] ? ` for "${message.searchQueries[0]}"` : ''}</span>
                        </div>
                      ) : null}

                      {/* Model badge & copy action on assistant reply */}
                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-xs ${
                        isDark ? 'border-neutral-800/40 text-neutral-400' : 'border-neutral-200 text-neutral-600'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-mono inline-flex items-center gap-1 ${
                            isDark ? 'text-amber-400' : 'text-amber-700 font-semibold'
                          }`}>
                            <Zap className="w-3 h-3 shrink-0" />
                            <span>
                              {message.isStreaming 
                                ? `${currentModel.name} is streaming...`
                                : (message.modelUsed && !/gemini/i.test(message.modelUsed)
                                    ? message.modelUsed
                                    : currentModel.name || 'ForgeX Neural Engine')}
                            </span>
                          </span>

                          {message.searchedWeb && (
                            <span className="text-[10px] text-blue-500 dark:text-blue-400 inline-flex items-center gap-1 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                              <Globe className="w-2.5 h-2.5" />
                              <span>Web Search</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className={`flex items-center gap-1 transition-colors ${
                              isDark ? 'hover:text-white text-neutral-400' : 'hover:text-neutral-950 text-neutral-600'
                            }`}
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isSubmitting && !streamingReply && (
              <div className="py-2 px-1 select-none animate-in fade-in duration-150">
                {searchingQuery ? (
                  /* Searching the Web — Minimal, clean inline style matching Screenshot 1 */
                  <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin-slow shrink-0" />
                    <span>Searching {searchingQuery ? searchingQuery : 'the web...'}</span>
                  </div>
                ) : (
                  /* Thinking State — Classic Old Clean UI (No shiny animation, subtle clean pill) */
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      isDark
                        ? 'bg-neutral-900/70 border-neutral-800 text-neutral-400'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500/85 dark:text-amber-400/85 animate-spin-slow" />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* When messages exist: Bottom pinned input container */}
      {hasMessages && (
        <div className="px-3 sm:px-6 pt-0 pb-2 max-w-2xl w-full mx-auto shrink-0">
          {renderChatInput()}
        </div>
      )}

      {/* Footer disclaimer */}
      <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-600 pb-2 select-none shrink-0">
        ForgeX can make mistakes. Check important info.
      </p>
    </div>
  );
};
