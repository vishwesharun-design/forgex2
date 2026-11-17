import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  Cpu, 
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
  Download,
  Code2,
  Maximize2,
  Pencil,
  Folder,
  Telescope,
  Lightbulb,
  LayoutTemplate,
  Search,
  Brain
} from 'lucide-react';
import { ChatMessage, ChatSession, ForgeXModelId, ForgeXProject, ForgeXTheme, FORGEX_MODELS } from '../types';
import { chatService } from '../services/chatService';
import { imageService } from '../services/imageService';
import { libraryService } from '../services/libraryService';
import { projectService } from '../services/projectService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { detectWebSearchIntent } from '../utils/searchIntent';
import { detectImageGenerationIntent } from '../utils/imageIntent';
import { ImageGeneratingAnimation } from './ImageGeneratingAnimation';
import { FullscreenImageModal } from './FullscreenImageModal';
import { InlineDeepResearchCard } from './InlineDeepResearchCard';
import { SketchModal } from './SketchModal';

const MenuLibraryIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="4" height="16" rx="1" />
    <rect x="10" y="4" width="4" height="16" rx="1" />
    <path d="M16 5.5l3.5-.8 2 14.8-3.5.8z" />
  </svg>
);

const MenuSketchIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 17c2-6 5-10 7-10s1 9 3 9 3.5-6 6-8" />
  </svg>
);

interface ChatWorkspaceProps {
  currentSession: ChatSession | null;
  onUpdateSession: (updatedSession: ChatSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  selectedModelId: ForgeXModelId;
  onSelectModel?: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  onNavigateToImage: () => void;
  onNavigateToVideo?: () => void;
  onNavigateToMusic?: () => void;
  onNavigateToCode?: (initialCode?: string, initialLang?: any) => void;
  onNavigateToLibrary?: () => void;
  onNavigateToProjects?: () => void;
  onNavigateToResearch?: () => void;
  onOpenStudioStore?: () => void;
  onOpenVoiceMode?: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  currentSession,
  onUpdateSession,
  onDeleteSession,
  onNewChat,
  selectedModelId,
  onSelectModel,
  theme,
  onNavigateToImage,
  onNavigateToVideo,
  onNavigateToMusic,
  onNavigateToCode,
  onNavigateToLibrary,
  onNavigateToProjects,
  onNavigateToResearch,
  onOpenStudioStore,
  onOpenVoiceMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingQuery, setSearchingQuery] = useState<string | null>(null);
  const [searchedForQueryDuringTurn, setSearchedForQueryDuringTurn] = useState<string | null>(null);
  const [expandedDomainGroup, setExpandedDomainGroup] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ type: 'file' | 'image'; name: string; url?: string }[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [activeComposerTool, setActiveComposerTool] = useState<'none' | 'image' | 'search' | 'thinking' | 'deep_research'>('none');
  const [activeProjectInChat, setActiveProjectInChat] = useState<ForgeXProject | null>(null);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [pendingUserTurn, setPendingUserTurn] = useState<{
    text: string;
    attachments?: ChatMessage['attachments'];
    toolBadge?: ChatMessage['toolBadge'];
  } | null>(null);
  const [streamingReply, setStreamingReply] = useState<{
    text: string;
    modelUsed?: string;
    groundingSources?: any[];
  } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; prompt: string; id?: string; initialEdit?: boolean } | null>(null);
  const [downloadedImageId, setDownloadedImageId] = useState<string | null>(null);
  const [generatingImageState, setGeneratingImageState] = useState<{ prompt: string; progress: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const attachMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const deepResearchAbortMapRef = useRef<Record<string, AbortController>>({});

  const optimizeImageFileToDataUrl = (file: File, maxDim = 1600, quality = 0.88): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (ev) => {
        const rawDataUrl = ev.target?.result as string;
        if (!rawDataUrl) {
          reject(new Error('Empty image data'));
          return;
        }
        // Keep already compact images directly so lossless text screenshots stay razor-sharp
        if (file.size <= 350 * 1024) {
          resolve(rawDataUrl);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            resolve(rawDataUrl);
            return;
          }
          const scale = Math.min(1, maxDim / Math.max(w, h));
          const targetW = Math.max(1, Math.round(w * scale));
          const targetH = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const outMime = file.type === 'image/png' && targetW * targetH <= 900 * 900 ? 'image/png' : 'image/jpeg';
          try {
            const optimized = canvas.toDataURL(outMime, quality);
            resolve(optimized.length < rawDataUrl.length ? optimized : rawDataUrl);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const attachIncomingFiles = async (files: File[], explicitType?: 'file' | 'image') => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const resolvedType: 'file' | 'image' =
        explicitType === 'image' || file.type.startsWith('image/') ? 'image' : 'file';
      const fallbackName =
        file.name && file.name.trim()
          ? file.name
          : `pasted-image-${Date.now()}${files.length > 1 ? `-${i + 1}` : ''}.png`;
      if (resolvedType === 'image' && (file.type.startsWith('image/') || explicitType === 'image')) {
        try {
          const url = await optimizeImageFileToDataUrl(file);
          setAttachedFiles((prev) => [...prev, { type: 'image', name: fallbackName, url }]);
        } catch (err) {
          console.warn('Could not attach image file:', err);
        }
      } else {
        setAttachedFiles((prev) => [...prev, { type: resolvedType, name: fallbackName }]);
      }
    }
  };

  useEffect(() => {
    if (!attachMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (attachMenuContainerRef.current && !attachMenuContainerRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [attachMenuOpen]);

  const handleDownloadImage = async (imageUrl: string, imageId?: string) => {
    try {
      if (imageId) {
        setDownloadedImageId(imageId);
        setTimeout(() => setDownloadedImageId(null), 2000);
      }
      const filename = `forgex-image-${Date.now()}.jpg`;
      if (imageUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.target = '_blank';
      a.download = `forgex-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageProgressTimerRef = useRef<any>(null);

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
            toolBadge: pendingUserTurn.toolBadge,
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
      if (imageProgressTimerRef.current) {
        clearInterval(imageProgressTimerRef.current);
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
      const el = textareaRef.current;
      el.style.height = 'auto';
      const maxH = 144;
      const scrollH = el.scrollHeight;
      el.style.height = `${Math.min(scrollH, maxH)}px`;
      el.style.overflowY = inputText.trim().length > 0 && scrollH > maxH ? 'auto' : 'hidden';
    }
  }, [inputText, activeComposerTool, activeProjectInChat]);

  const buildDefaultResearchSteps = (query: string): string[] => {
    const topic = query.trim().slice(0, 70) || 'the requested topic';
    return [
      `Survey authoritative sources and recent developments for "${topic}".`,
      `Clarify key definitions, core mechanisms, and primary context around "${topic}".`,
      `Gather concrete data points, real-world examples, and technical details.`,
      `Compare differing viewpoints, trade-offs, and notable trends.`,
      `Synthesize validated findings into a structured report with citations.`,
    ];
  };

  const executeDeepResearchMessage = async (sessionId: string, messageId: string, steps: string[]) => {
    const startTs = Date.now();
    const targetSession = chatService.getSessions().find((s) => s.id === sessionId);
    const targetMsg = targetSession?.messages.find((m) => m.id === messageId);
    const query = targetMsg?.deepResearch?.query || 'requested topic';

    const updateProgress = (completedCount: number, sourcesFound = 0) => {
      const updated = chatService.updateMessageInSession(sessionId, messageId, (msg) => {
        if (msg.deepResearch?.status === 'cancelled') return msg;
        return {
          ...msg,
          deepResearch: {
            ...(msg.deepResearch || { query, steps }),
            query,
            steps,
            status: 'running',
            completedStepsCount: completedCount,
            sourcesFound,
          },
        };
      });
      if (updated) {
        onUpdateSession(updated);
      }
    };

    updateProgress(0, 0);

    const abortController = new AbortController();
    deepResearchAbortMapRef.current[messageId] = abortController;

    let visualCompleted = 0;
    let latestSourcesFound = 0;

    const sleep = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        if (abortController.signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const timer = setTimeout(() => {
          abortController.signal.removeEventListener('abort', onAbort);
          resolve();
        }, ms);
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        abortController.signal.addEventListener('abort', onAbort, { once: true });
      });

    const advanceVisualStepsTo = async (targetCount: number, stepDelayMs = 340) => {
      const clampedTarget = Math.min(steps.length, Math.max(visualCompleted, targetCount));
      while (visualCompleted < clampedTarget) {
        if (abortController.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        visualCompleted += 1;
        updateProgress(visualCompleted, latestSourcesFound);
        if (visualCompleted < clampedTarget) {
          await sleep(stepDelayMs);
        }
      }
    };

    try {
      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      let finalReport: any = null;
      const requestBody = JSON.stringify({
        query,
        projectContext: activeProjectInChat
          ? `${activeProjectInChat.name} — ${activeProjectInChat.description || ''}`
          : undefined,
        planSteps: steps,
        depth: 'deep',
        modelId: selectedModelId,
      });

      const handleSsePayload = async (jsonText: string) => {
        const evt = JSON.parse(jsonText);
        if (evt.type === 'step') {
          if (typeof evt.sourcesFound === 'number') {
            latestSourcesFound = Math.max(latestSourcesFound, evt.sourcesFound);
          }
          const target = Math.min(steps.length, Math.max(1, Number(evt.completedCount || 1)));
          await advanceVisualStepsTo(target, 220);
        } else if (evt.type === 'complete') {
          finalReport = evt.report;
        } else if (evt.type === 'error') {
          throw new Error(evt.error || 'Deep research failed');
        }
      };

      try {
        const res = await fetch('/api/deep-research/stream', {
          method: 'POST',
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
          },
          body: requestBody,
        });

        if (!res.ok) {
          const errPayload = await res.json().catch(() => null);
          throw new Error(errPayload?.error || `Deep research failed (${res.status})`);
        }

        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const rawEvent of events) {
              const line = rawEvent
                .split('\n')
                .find((l) => l.startsWith('data:'));
              if (!line) continue;
              const jsonText = line.slice(5).trim();
              if (!jsonText) continue;
              await handleSsePayload(jsonText);
            }
          }

          if (buffer.trim()) {
            const trailingLine = buffer
              .split('\n')
              .find((l) => l.startsWith('data:'));
            if (trailingLine) {
              const jsonText = trailingLine.slice(5).trim();
              if (jsonText) {
                await handleSsePayload(jsonText);
              }
            }
          }
        } else {
          const data = await res.json();
          finalReport = data.report || data;
        }
      } catch (streamErr: any) {
        if (streamErr?.name === 'AbortError' || abortController.signal.aborted) {
          throw streamErr;
        }
        // Fallback to standard JSON endpoint only if the SSE stream disconnected unexpectedly
        if (!finalReport && /network|fetch|chunked|stream|abort/i.test(String(streamErr?.message || ''))) {
          const fallbackRes = await fetch('/api/deep-research', {
            method: 'POST',
            signal: abortController.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
            },
            body: requestBody,
          });
          if (!fallbackRes.ok) {
            const errPayload = await fallbackRes.json().catch(() => null);
            throw new Error(errPayload?.error || streamErr?.message || `Deep research failed (${fallbackRes.status})`);
          }
          const fallbackData = await fallbackRes.json();
          finalReport = fallbackData.report || fallbackData;
        } else {
          throw streamErr;
        }
      }

      if (!finalReport || !finalReport.answer) {
        throw new Error('Deep research returned an empty report.');
      }

      const sources = Array.isArray(finalReport.sources)
        ? finalReport.sources.map((s: any) => ({
            title: s.title || s.sourceDomain || 'Source',
            url: s.url || '#',
            snippet: s.snippet || '',
            sourceDomain: s.sourceDomain,
          }))
        : [];
      latestSourcesFound = Math.max(latestSourcesFound, sources.length);

      // Ensure all steps show checked and pause briefly so the user sees 100% completion before report opens
      await advanceVisualStepsTo(steps.length, 240);
      await sleep(320);

      if (abortController.signal.aborted) return;

      const durationSec = Math.max(1, Math.round((Date.now() - startTs) / 1000));
      const completedSession = chatService.updateMessageInSession(sessionId, messageId, (msg) => {
        if (msg.deepResearch?.status === 'cancelled') return msg;
        return {
          ...msg,
          content: finalReport.answer || finalReport.summary || 'Research completed.',
          searchedWeb: true,
          searchQueries: Array.isArray(finalReport.searchQueriesUsed) && finalReport.searchQueriesUsed.length > 0
            ? finalReport.searchQueriesUsed
            : [query],
          groundingSources: sources,
          deepResearch: {
            ...(msg.deepResearch || { query, steps }),
            query,
            steps,
            completedStepsCount: steps.length,
            sourcesFound: latestSourcesFound,
            status: 'completed',
            researchDurationSec: durationSec,
          },
        };
      });
      if (completedSession) {
        onUpdateSession(completedSession);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || abortController.signal.aborted) return;
      let rawErrMsg = String(err?.message || 'Network error');
      for (let i = 0; i < 3; i++) {
        const trimmed = rawErrMsg.trim();
        if (!trimmed.startsWith('{')) break;
        try {
          const parsed = JSON.parse(trimmed);
          const inner = parsed?.error?.message || parsed?.message;
          if (typeof inner === 'string' && inner.trim()) rawErrMsg = inner;
          else break;
        } catch {
          break;
        }
      }
      if (/503|unavailable|high demand/i.test(rawErrMsg)) {
        rawErrMsg = 'The AI model is temporarily experiencing high demand (503).';
      }
      const errSession = chatService.updateMessageInSession(sessionId, messageId, (msg) => ({
        ...msg,
        content: `Could not complete deep research: ${rawErrMsg} Please try again.`,
        deepResearch: {
          ...(msg.deepResearch || { query, steps }),
          query,
          steps,
          completedStepsCount: visualCompleted,
          status: 'completed',
          researchDurationSec: Math.max(1, Math.round((Date.now() - startTs) / 1000)),
        },
      }));
      if (errSession) {
        onUpdateSession(errSession);
      }
    } finally {
      delete deepResearchAbortMapRef.current[messageId];
    }
  };

  const handleCancelDeepResearch = (sessionId: string, messageId: string) => {
    const controller = deepResearchAbortMapRef.current[messageId];
    if (controller) {
      controller.abort();
      delete deepResearchAbortMapRef.current[messageId];
    }
    const updated = chatService.updateMessageInSession(sessionId, messageId, (msg) =>
      msg.deepResearch
        ? {
            ...msg,
            deepResearch: { ...msg.deepResearch, status: 'cancelled' },
          }
        : msg
    );
    if (updated) onUpdateSession(updated);
  };

  const handleUpdateDeepResearchSteps = (sessionId: string, messageId: string, steps: string[]) => {
    const updated = chatService.updateMessageInSession(sessionId, messageId, (msg) =>
      msg.deepResearch
        ? {
            ...msg,
            deepResearch: { ...msg.deepResearch, steps },
          }
        : msg
    );
    if (updated) onUpdateSession(updated);
  };

  const handleStartDeepResearchPlan = async (
    query: string,
    effectiveModel: ForgeXModelId,
    filesToAttach: ChatMessage['attachments']
  ) => {
    const planStartTs = Date.now();
    const initialSteps = buildDefaultResearchSteps(query);
    const userMsg: ChatMessage = {
      id: 'usr_msg_' + Date.now(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
      attachments: filesToAttach,
      toolBadge: 'deep_research',
    };
    const planMsgId = 'asst_dr_' + (Date.now() + 1);
    const planMsg: ChatMessage = {
      id: planMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      modelUsed: 'Deep Research',
      deepResearch: {
        query,
        status: 'planning',
        steps: initialSteps,
      },
    };

    const targetSessionId = currentSession?.id || 'chat_' + Date.now();
    const createdSession = chatService.appendMessagesToSession(
      targetSessionId,
      [userMsg, planMsg],
      effectiveModel,
      query
    );
    setPendingUserTurn(null);
    onUpdateSession(createdSession);

    try {
      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const res = await fetch('/api/deep-research/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          const planSecs = Math.max(1, Math.round((Date.now() - planStartTs) / 1000));
          const updated = chatService.updateMessageInSession(createdSession.id, planMsgId, (m) => {
            if (!m.deepResearch || m.deepResearch.status !== 'planning') return m;
            return {
              ...m,
              deepResearch: {
                ...m.deepResearch,
                steps: data.steps.slice(0, 5),
                planDurationSec: planSecs,
              },
            };
          });
          if (updated) onUpdateSession(updated);
        }
      }
    } catch {
      // Keep clean default 5 steps if plan fetch fails
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && attachedFiles.length === 0) || isSubmitting) return;

    const filesToAttach = [...attachedFiles];
    setAttachedFiles([]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const activeToolSnapshot = activeComposerTool;
    setActiveComposerTool('none');

    const activeToolBadge: ChatMessage['toolBadge'] | undefined =
      activeToolSnapshot === 'deep_research'
        ? 'deep_research'
        : activeToolSnapshot === 'image'
        ? 'image'
        : activeToolSnapshot === 'search'
        ? 'search'
        : activeToolSnapshot === 'thinking'
        ? 'thinking'
        : undefined;

    const effectiveModelForTurn: ForgeXModelId =
      activeToolSnapshot === 'thinking' || activeToolSnapshot === 'deep_research'
        ? 'forge-2-ultra'
        : selectedModelId;

    // Inline ChatGPT-style Deep Research Plan -> Countdown -> Report workflow
    if (activeToolSnapshot === 'deep_research') {
      await handleStartDeepResearchPlan(
        text || 'Analyze the attached content deeply',
        effectiveModelForTurn,
        filesToAttach
      );
      return;
    }

    // Set optimistic message so user never sees input vanish without response
    setPendingUserTurn({ text, attachments: filesToAttach, toolBadge: activeToolBadge });
    setStreamingReply(null);

    // Check for image generation intent vs web search vs general chat
    const hasAttachedImage = filesToAttach.some((f) => f.type === 'image');
    const rawTextForService =
      activeToolSnapshot === 'image' && !/^\/image\b/i.test(text) && !detectImageGenerationIntent(text, hasAttachedImage).isImage
        ? `/image ${text}`
        : activeProjectInChat && !detectImageGenerationIntent(text, hasAttachedImage).isImage
        ? `${text}\n\n[Project Context — ${activeProjectInChat.name}: ${activeProjectInChat.description || ''}${activeProjectInChat.contextNotes ? ` | Notes: ${activeProjectInChat.contextNotes}` : ''}]`
        : text;
    const imgIntent = detectImageGenerationIntent(rawTextForService, hasAttachedImage);
    const effectiveSearchMode: 'auto' | 'on' | 'off' = activeToolSnapshot === 'search' ? 'on' : 'auto';
    const localSearchIntent =
      effectiveSearchMode === 'on'
        ? { shouldSearch: true, searchQuery: text }
        : detectWebSearchIntent(text);

    if (imgIntent.isImage) {
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setGeneratingImageState({ prompt: imgIntent.prompt, progress: 5 });
    } else if (localSearchIntent.shouldSearch) {
      const q = localSearchIntent.searchQuery || text;
      setSearchingQuery(q);
      setSearchedForQueryDuringTurn(q);
      setGeneratingImageState(null);
    } else {
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setGeneratingImageState(null);
    }

    setIsSubmitting(true);

    try {
      const sessionId = currentSession?.id || 'new';
      const { updatedSession } = await chatService.sendMessage(
        sessionId,
        rawTextForService,
        effectiveModelForTurn,
        filesToAttach,
        (streamedText, modelName, sources) => {
          // If generating image, never display streaming text!
          if (imgIntent.isImage) return;
          setStreamingReply({
            text: streamedText,
            modelUsed: modelName || currentModel.name,
            groundingSources: sources,
          });
        },
        effectiveSearchMode,
        (isSearching, q) => {
          if (imgIntent.isImage) return;
          if (isSearching) {
            const query = q || localSearchIntent.searchQuery || text;
            setSearchingQuery(query);
            setSearchedForQueryDuringTurn(query);
          } else {
            setSearchingQuery(null);
          }
        },
        (realProgress) => {
          // Real-time progress percentage callback from image synthesis pipeline
          setGeneratingImageState({
            prompt: imgIntent.prompt,
            progress: Math.min(100, Math.max(1, Math.round(realProgress))),
          });
        },
        activeToolBadge
      );

      // Ensure progress reaches exactly 100% before showing the image
      if (imgIntent.isImage) {
        if (imageProgressTimerRef.current) {
          clearInterval(imageProgressTimerRef.current);
          imageProgressTimerRef.current = null;
        }
        setGeneratingImageState({ prompt: imgIntent.prompt, progress: 100 });
        // Give smooth time for user to see the 100% completion before revealing the image
        await new Promise((resolve) => setTimeout(resolve, 550));
      }

      setGeneratingImageState(null);
      setStreamingReply(null);
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setPendingUserTurn(null);
      onUpdateSession(updatedSession);
    } catch (error) {
      if (imageProgressTimerRef.current) {
        clearInterval(imageProgressTimerRef.current);
        imageProgressTimerRef.current = null;
      }
      console.error('Failed to send message', error);
      setGeneratingImageState(null);
      setStreamingReply(null);
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setPendingUserTurn(null);
    } finally {
      if (imageProgressTimerRef.current) {
        clearInterval(imageProgressTimerRef.current);
        imageProgressTimerRef.current = null;
      }
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

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>, explicitType?: 'file' | 'image') => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      void attachIncomingFiles(files, explicitType);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const pastedImages: File[] = [];
    const seenKeys = new Set<string>();

    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const key = `${file.type}:${file.size}:${file.name}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              pastedImages.push(file);
            }
          }
        }
      }
    }

    if (pastedImages.length === 0 && clipboardData.files) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file && file.type.startsWith('image/')) {
          const key = `${file.type}:${file.size}:${file.name}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            pastedImages.push(file);
          }
        }
      }
    }

    if (pastedImages.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      void attachIncomingFiles(pastedImages, 'image');
      textareaRef.current?.focus();
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
      <div className="w-full relative" onPaste={handlePaste}>
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap items-end gap-2.5 mb-2.5 px-1">
            {attachedFiles.map((file, idx) =>
              file.type === 'image' && file.url ? (
                <div
                  key={idx}
                  className={`relative group rounded-2xl overflow-hidden border shadow-sm ${
                    isDark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-300 bg-white'
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    title={file.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover block"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                    title="Remove attached image"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center transition-opacity cursor-pointer shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border ${
                    isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-neutral-100 border-neutral-300 text-neutral-800 font-medium'
                  }`}
                >
                  {file.type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5" />
                  )}
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className={`${isDark ? 'hover:text-white' : 'hover:text-neutral-900'} ml-1 cursor-pointer`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            )}
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
          <div ref={attachMenuContainerRef} className="relative shrink-0">
            <button
              id="btn-chat-attach"
              type="button"
              onClick={() => setAttachMenuOpen(!attachMenuOpen)}
              title="Add photos, files, or tools"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                attachMenuOpen
                  ? isDark
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-200 text-neutral-900'
                  : isDark
                  ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Plus Popover Menu matching ChatGPT reference */}
            {attachMenuOpen && (
              <div
                className={`absolute ${
                  hasMessages ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
                } left-0 w-[308px] sm:w-[336px] max-h-[340px] overflow-y-auto custom-scrollbar rounded-2xl border p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.14)] z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/60'
                    : 'bg-white border-neutral-200/90 text-neutral-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <Paperclip className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Add photos & files</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Upload from computer
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setLibrarySearchQuery('');
                    setIsLibraryPickerOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <MenuLibraryIcon className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Add from library</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Browse and search your files
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setActiveComposerTool('image');
                    textareaRef.current?.focus();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    activeComposerTool === 'image'
                      ? isDark
                        ? 'bg-neutral-800'
                        : 'bg-neutral-100'
                      : isDark
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 shrink-0 text-sky-500" />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Create image</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Visualize anything
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setActiveComposerTool('search');
                    textareaRef.current?.focus();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    activeComposerTool === 'search'
                      ? isDark
                        ? 'bg-neutral-800'
                        : 'bg-neutral-100'
                      : isDark
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0 text-sky-500" />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Web search</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Find real-time news and info
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setIsProjectPickerOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    activeProjectInChat
                      ? isDark
                        ? 'bg-neutral-800'
                        : 'bg-neutral-100'
                      : isDark
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <Folder className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Work in a project</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Start a chat in a project
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setActiveComposerTool('deep_research');
                    textareaRef.current?.focus();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    activeComposerTool === 'deep_research'
                      ? isDark
                        ? 'bg-neutral-800'
                        : 'bg-neutral-100'
                      : isDark
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <Telescope className="w-4 h-4 shrink-0 text-sky-500" />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Deep research</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Get a detailed report
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setIsSketchOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <MenuSketchIcon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Sketch</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Draw and attach an image
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setActiveComposerTool('thinking');
                    if (onSelectModel) onSelectModel('forge-2-ultra');
                    textareaRef.current?.focus();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    activeComposerTool === 'thinking'
                      ? isDark
                        ? 'bg-neutral-800'
                        : 'bg-neutral-100'
                      : isDark
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <Lightbulb className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Thinking</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      For detailed answers
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    if (onOpenStudioStore) {
                      onOpenStudioStore();
                    } else {
                      setInputText('Create a reusable prompt template for: ');
                      textareaRef.current?.focus();
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <LayoutTemplate className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Template Creator</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Create reusable templates saved as skills
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Active Project Chip if working inside a project */}
          {activeProjectInChat && (
            <button
              type="button"
              onClick={() => setActiveProjectInChat(null)}
              title="Detach project context"
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                isDark
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="truncate max-w-[110px]">{activeProjectInChat.name}</span>
              <X className="w-3 h-3 opacity-70" />
            </button>
          )}

          {/* Active Composer Tool Chip when selected from + menu (matches Screenshot 1) */}
          {activeComposerTool !== 'none' && (
            <button
              type="button"
              onClick={() => setActiveComposerTool('none')}
              title="Clear selected tool"
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
                activeComposerTool === 'deep_research'
                  ? 'bg-rose-500/8 hover:bg-rose-500/15 text-[#C84B82] dark:text-rose-400'
                  : activeComposerTool === 'image' || activeComposerTool === 'search'
                  ? 'bg-sky-500/12 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              {activeComposerTool === 'deep_research' && <Telescope className="w-3.5 h-3.5 text-sky-500" />}
              {activeComposerTool === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
              {activeComposerTool === 'search' && <Globe className="w-3.5 h-3.5" />}
              {activeComposerTool === 'thinking' && <Brain className="w-3.5 h-3.5" />}
              <span>
                {activeComposerTool === 'deep_research'
                  ? 'Deep research'
                  : activeComposerTool === 'image'
                  ? 'Image'
                  : activeComposerTool === 'search'
                  ? 'Search'
                  : 'Thinking'}
              </span>
              <X className="w-3 h-3 opacity-70" />
            </button>
          )}

          {/* Text Area */}
          <div className="flex-1 min-w-0 flex items-center">
            <textarea
              ref={textareaRef}
              id="chat-textarea"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                voiceModeState === 'listening' || isListening
                  ? 'Listening...'
                  : voiceModeState === 'transcribing' || isProcessing
                  ? 'Transcribing...'
                  : activeComposerTool === 'deep_research'
                  ? 'Research a topic...'
                  : activeComposerTool === 'image'
                  ? 'Describe an image...'
                  : activeComposerTool === 'search'
                  ? 'Search the web...'
                  : activeComposerTool === 'thinking'
                  ? 'Ask a complex question...'
                  : 'Ask ForgeX'
              }
              className={`w-full bg-transparent px-2 py-1 text-sm sm:text-base resize-none outline-none max-h-36 leading-normal transition-colors ${
                !inputText ? 'overflow-hidden' : ''
              } ${
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
            {/* Think Toggle Pill matching Screenshot 1 */}
            <button
              type="button"
              onClick={() => {
                if (activeComposerTool === 'thinking') {
                  setActiveComposerTool('none');
                } else {
                  setActiveComposerTool('thinking');
                  if (onSelectModel) onSelectModel('forge-2-ultra');
                }
                textareaRef.current?.focus();
              }}
              title="Toggle deep thinking"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeComposerTool === 'thinking'
                  ? isDark
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'bg-neutral-200/80 text-neutral-900 border border-neutral-300'
                  : isDark
                  ? 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Think</span>
            </button>

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
                <Cpu className="w-4 h-4 text-amber-400 animate-spin" />
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
                    ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                    : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
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
    <div
      className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden"
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const droppedFiles = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
        if (droppedFiles.length > 0) {
          void attachIncomingFiles(droppedFiles);
          textareaRef.current?.focus();
        }
      }}
    >
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-3 z-40 rounded-3xl border-2 border-dashed border-sky-500/70 bg-sky-500/10 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
          <ImageIcon className="w-8 h-8 text-sky-500" />
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            Drop images or files here to analyze
          </p>
        </div>
      )}
      {/* Hidden file inputs (accepts both photos & documents for Add photos & files) */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.py,.doc,.docx"
        className="hidden"
        onChange={(e) => handleAttachFile(e)}
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
            <div className="w-full mb-5">
              {renderChatInput()}
            </div>

            {/* Starter Prompts: Left-to-Right Marquee (pauses on mouse hover) */}
            <div className="starter-marquee w-full overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="starter-marquee-track">
                {[0, 1].map((dupIndex) => (
                  <div key={dupIndex} className="flex items-center gap-2.5 pr-2.5 shrink-0" aria-hidden={dupIndex === 1}>
                    {[
                      'What can you do?',
                      'Explain quantum computing simply',
                      'Help me plan a productive week',
                      'Brainstorm startup ideas',
                      'Summarize a complex topic',
                      'Quiz me on space science',
                    ].map((promptText, idx) => (
                      <button
                        key={`${dupIndex}-${idx}`}
                        type="button"
                        id={dupIndex === 0 && idx === 0 ? 'btn-what-can-you-do' : undefined}
                        tabIndex={dupIndex === 1 ? -1 : undefined}
                        onClick={() => handleSendMessage(promptText)}
                        className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isDark
                            ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                            : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 shadow-sm'
                        }`}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Messages */
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
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

                      {/* User message text bubble: Clean light/white style or tool-tinted badge matching Screenshot 2 */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 font-normal rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap font-sans transition-colors ${
                          message.toolBadge === 'deep_research'
                            ? isDark
                              ? 'bg-rose-950/30 border border-rose-800/45 text-neutral-100 shadow-md shadow-black/25'
                              : 'bg-[#FDF2F7] border border-rose-200/70 text-neutral-900 shadow-xs'
                            : isDark
                            ? 'bg-neutral-800 border border-neutral-700/70 text-neutral-100 shadow-md shadow-black/25'
                            : 'bg-neutral-100/95 border border-neutral-200/90 text-neutral-900 shadow-sm'
                        }`}
                      >
                        {message.toolBadge && (
                          <span className="inline-flex items-center gap-1.5 mr-2 align-middle">
                            {message.toolBadge === 'deep_research' && (
                              <>
                                <Telescope className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span className="text-[#C84B82] dark:text-rose-400 font-medium">Deep research</span>
                              </>
                            )}
                            {message.toolBadge === 'image' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/12 text-sky-600 dark:text-sky-400">
                                <ImageIcon className="w-3 h-3" />
                                <span>Image</span>
                              </span>
                            )}
                            {message.toolBadge === 'search' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/12 text-sky-600 dark:text-sky-400">
                                <Globe className="w-3 h-3" />
                                <span>Web search</span>
                              </span>
                            )}
                            {message.toolBadge === 'thinking' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-500/15 text-neutral-700 dark:text-neutral-300">
                                <Brain className="w-3 h-3" />
                                <span>Think</span>
                              </span>
                            )}
                          </span>
                        )}
                        <span>{message.content}</span>
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
                    (() => {
                      if (message.deepResearch) {
                        const targetSessionId = currentSession?.id || '';
                        return (
                          <InlineDeepResearchCard
                            message={message}
                            theme={theme}
                            onStart={(msgId, steps) =>
                              void executeDeepResearchMessage(targetSessionId, msgId, steps)
                            }
                            onCancel={(msgId) => handleCancelDeepResearch(targetSessionId, msgId)}
                            onUpdateSteps={(msgId, steps) =>
                              handleUpdateDeepResearchSteps(targetSessionId, msgId, steps)
                            }
                            onCopy={copyToClipboard}
                            copiedMessageId={copiedMessageId}
                            renderSourcePills={renderSourcePills}
                            onOpenInCodeStudio={(code, lang) => onNavigateToCode?.(code, lang)}
                            onOpenInImageStudio={onNavigateToImage}
                            onViewImageFullscreen={(url, prompt) =>
                              setFullscreenImage({ url, prompt })
                            }
                          />
                        );
                      }

                      const hasImages = Boolean(
                        message.generatedImages &&
                        message.generatedImages.length > 0
                      );

                      // If message contains generated image(s), display ONLY the image with zero assistant text chatter and zero prompt
                      if (hasImages) {
                        return (
                          <div className="flex flex-col gap-3 max-w-xl w-full animate-in fade-in duration-200">
                            {message.generatedImages!.map((img) => (
                              <div
                                key={img.id}
                                className={`relative rounded-2xl sm:rounded-3xl overflow-hidden border shadow-lg group cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.008] ${
                                  isDark
                                    ? 'border-neutral-800 bg-neutral-900/80 hover:border-amber-500/50'
                                    : 'border-neutral-200 bg-neutral-50 hover:border-amber-500/50'
                                }`}
                                onClick={() => setFullscreenImage({ url: img.imageUrl, prompt: img.prompt, id: img.id, initialEdit: false })}
                                title="Click to view full screen, edit or download"
                              >
                                <img
                                  src={img.imageUrl}
                                  alt={img.prompt}
                                  className="w-full h-auto object-cover rounded-2xl sm:rounded-3xl max-h-[520px] transition-transform duration-300"
                                />

                                {/* Floating Quick Actions on Image: Edit, Download, Fullscreen */}
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 sm:gap-2 z-10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  {/* Edit Icon Button in Chat */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFullscreenImage({ url: img.imageUrl, prompt: img.prompt, id: img.id, initialEdit: true });
                                    }}
                                    title="Edit image"
                                    className="p-2 rounded-xl backdrop-blur-md bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 shadow-md cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                                  </button>

                                  {/* Download Icon Button in Chat */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadImage(img.imageUrl, img.id);
                                    }}
                                    title="Download image"
                                    className="p-2 rounded-xl backdrop-blur-md bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 shadow-md cursor-pointer"
                                  >
                                    {downloadedImageId === img.id ? (
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                                    ) : (
                                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                    )}
                                  </button>

                                  {/* Fullscreen Icon Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFullscreenImage({ url: img.imageUrl, prompt: img.prompt, id: img.id, initialEdit: false });
                                    }}
                                    title="View Fullscreen"
                                    className="p-2 rounded-xl backdrop-blur-md bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 shadow-md cursor-pointer"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div
                          className={`relative w-full max-w-[96%] sm:max-w-[88%] md:max-w-[82%] lg:max-w-[78%] rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all text-xs sm:text-sm leading-relaxed ${
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
                                      className="max-h-48 max-w-xs rounded-xl object-cover border border-neutral-700 shadow-sm"
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
                              onOpenInCodeStudio={(code, lang) => {
                                if (onNavigateToCode) {
                                  onNavigateToCode(code, lang);
                                }
                              }}
                              onOpenInImageStudio={() => {
                                onNavigateToImage();
                              }}
                              onViewImageFullscreen={(url, prompt) => {
                                setFullscreenImage({ url, prompt });
                              }}
                            />
                            {message.isStreaming && (
                              <span className="inline-block w-1.5 h-4 ml-1 bg-neutral-400 dark:bg-neutral-500 animate-pulse rounded-xs align-middle" />
                            )}
                          </div>

                          {/* Generated Images in Chat */}
                          {message.generatedImages && message.generatedImages.length > 0 && (
                            <div className="mt-3.5 space-y-3">
                              {message.generatedImages.map((img) => (
                                <div
                                  key={img.id}
                                  className={`relative rounded-2xl overflow-hidden border shadow-md group cursor-pointer ${
                                    isDark ? 'border-neutral-800 bg-neutral-950/80' : 'border-neutral-200 bg-neutral-100'
                                  }`}
                                  onClick={() => setFullscreenImage({ url: img.imageUrl, prompt: img.prompt, id: img.id })}
                                  title="Click to view full screen, edit or download"
                                >
                                  <img
                                    src={img.imageUrl}
                                    alt={img.prompt}
                                    className="w-full h-auto rounded-xl object-cover max-h-72 transition-transform duration-300 group-hover:scale-[1.01]"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Web Search Sources Pills */}
                          {message.groundingSources && message.groundingSources.length > 0 ? (
                            renderSourcePills(message.groundingSources, message.id)
                          ) : message.searchedWeb ? (
                            <div className="flex items-center gap-1.5 pt-2 pb-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                              <Globe className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                              <span>Searched the web{message.searchQueries?.[0] ? ` for "${message.searchQueries[0]}"` : ''}</span>
                            </div>
                          ) : null}

                          {/* Reply footer actions */}
                          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-xs ${
                            isDark ? 'border-neutral-800/40 text-neutral-400' : 'border-neutral-200 text-neutral-600'
                          }`}>
                            <div className="flex items-center gap-2">
                              {message.searchedWeb && (
                                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1 font-medium bg-neutral-500/10 px-2 py-0.5 rounded-full border border-neutral-500/20">
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
                      );
                    })()
                  )}
                </div>
              );
            })}

            {/* Image Generating Animation: GPU-accelerated canvas with percentage counter */}
            {generatingImageState && (
              <div className="py-2 px-0.5 select-none animate-in fade-in duration-200">
                <ImageGeneratingAnimation
                  progress={generatingImageState.progress}
                  theme={theme}
                />
              </div>
            )}

            {isSubmitting && !streamingReply && !generatingImageState && (
              <div className="py-2 px-1 select-none animate-in fade-in duration-150">
                {searchingQuery ? (
                  /* Searching the Web — Minimal, clean inline style matching Screenshot 1 */
                  <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin-slow shrink-0" />
                    <span>Searching {searchingQuery ? searchingQuery : 'the web...'}</span>
                  </div>
                ) : (
                  /* Thinking State — Mature, clean greyish ChatGPT style (No colourful childish UI) */
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-normal text-neutral-500 dark:text-neutral-400 py-2 px-1 select-none animate-in fade-in duration-150">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-400 dark:bg-neutral-500"></span>
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400 tracking-wide font-sans font-medium text-xs sm:text-sm">Thinking...</span>
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

      {/* Fullscreen Image Modal matching ChatGPT screenshot */}
      <FullscreenImageModal
        isOpen={Boolean(fullscreenImage)}
        onClose={() => setFullscreenImage(null)}
        imageUrl={fullscreenImage?.url || ''}
        prompt={fullscreenImage?.prompt || ''}
        initialEdit={fullscreenImage?.initialEdit || false}
        theme={theme}
        galleryImages={displayMessages
          .flatMap((m) => m.generatedImages || [])
          .map((img) => ({
            id: img.id,
            url: img.imageUrl,
            prompt: img.prompt,
          }))}
        onSelectImage={(img) => {
          setFullscreenImage({
            url: img.url,
            prompt: img.prompt,
            id: img.id,
            initialEdit: false,
          });
        }}
        onOpenInImageStudio={(promptText, url) => {
          setFullscreenImage(null);
          onNavigateToImage();
        }}
        onEditPromptAndRegenerate={(newPrompt) => {
          setFullscreenImage(null);
          handleSendMessage(newPrompt);
        }}
      />

      {/* Add from Library Picker Modal */}
      {isLibraryPickerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLibraryPickerOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2">
                <MenuLibraryIcon className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Add from Library</h3>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToLibrary && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLibraryPickerOpen(false);
                      onNavigateToLibrary();
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Open Library
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsLibraryPickerOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 border-b border-neutral-200/70 dark:border-neutral-800">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
              }`}>
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  placeholder="Search saved images and references..."
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(() => {
                const q = librarySearchQuery.trim().toLowerCase();
                const refItems = libraryService.getReferences().map((r) => ({
                  id: r.id,
                  name: r.title || 'Reference Image',
                  url: r.imageUrl,
                }));
                const genItems = imageService.getImages().map((img) => ({
                  id: img.id,
                  name: img.prompt || 'Generated Image',
                  url: img.imageUrl,
                }));
                const all = [...refItems, ...genItems].filter(
                  (item) => !q || item.name.toLowerCase().includes(q)
                );

                if (all.length === 0) {
                  return (
                    <div className="col-span-full py-10 text-center text-xs text-neutral-500">
                      No matching images found in your Library yet.
                    </div>
                  );
                }

                return all.slice(0, 24).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAttachedFiles((prev) => [
                        ...prev,
                        { type: 'image', name: item.name.slice(0, 40), url: item.url },
                      ]);
                      setIsLibraryPickerOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className={`group rounded-xl border overflow-hidden text-left transition-all cursor-pointer ${
                      isDark ? 'border-neutral-800 hover:border-neutral-600 bg-neutral-950' : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50'
                    }`}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                    <p className="px-2 py-1.5 text-[11px] truncate font-medium">{item.name}</p>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ChatGPT-style Sketch Pad Modal */}
      <SketchModal
        isOpen={isSketchOpen}
        onClose={() => setIsSketchOpen(false)}
        onAttachSketch={(dataUrl) => {
          setAttachedFiles((prev) => [
            ...prev,
            { type: 'image', name: 'sketch.png', url: dataUrl },
          ]);
          textareaRef.current?.focus();
        }}
      />

      {/* Inline Project Picker Modal ("Work in a project") */}
      {isProjectPickerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProjectPickerOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Work in a project</h3>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToProjects && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectPickerOpen(false);
                      onNavigateToProjects();
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Open Projects Studio
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProjectPickerOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = newProjectTitle.trim();
                  if (!title) return;
                  const created = projectService.createProject({
                    name: title,
                    description: 'Inline chat project workspace',
                  });
                  setActiveProjectInChat(created);
                  setNewProjectTitle('');
                  setIsProjectPickerOpen(false);
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Create new project name..."
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newProjectTitle.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-40 cursor-pointer"
                >
                  Create
                </button>
              </form>

              <div className="space-y-1.5">
                {projectService.getProjects().length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-6">
                    No saved projects yet. Create one above to ground your chat.
                  </p>
                ) : (
                  projectService.getProjects().map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        projectService.setActiveProjectId(proj.id);
                        setActiveProjectInChat(proj);
                        setIsProjectPickerOpen(false);
                        textareaRef.current?.focus();
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        activeProjectInChat?.id === proj.id
                          ? isDark
                            ? 'bg-neutral-800 border-neutral-700'
                            : 'bg-neutral-100 border-neutral-300'
                          : isDark
                          ? 'border-neutral-800 hover:bg-neutral-800/70'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{proj.name}</p>
                        {proj.description && (
                          <p className="text-[11px] text-neutral-500 truncate">{proj.description}</p>
                        )}
                      </div>
                      {activeProjectInChat?.id === proj.id && (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
