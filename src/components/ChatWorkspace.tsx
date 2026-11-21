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
  Search,
  Brain,
  Music,
  Bot,
  BarChart3,
  Database,
  PenTool,
  Presentation,
  LayoutDashboard,
  BellRing,
  Volume2,
  Loader2,
  Clock,
} from 'lucide-react';
import { ActiveReminderAlert, CHAT_ROLES, ChatMessage, ChatRoleId, ChatSession, ComposerToolId, ForgeXModelId, ForgeXProject, ForgeXTheme, FORGEX_MODELS, ScheduledTask } from '../types';
import { chatService } from '../services/chatService';
import { imageService } from '../services/imageService';
import { libraryService } from '../services/libraryService';
import { projectService } from '../services/projectService';
import { documentService } from '../services/documentService';
import { vaultService } from '../services/vaultService';
import { voiceController } from '../services/voiceService';
import {
  executeInlineAgentTool,
  executeInlineCanvasTool,
  executeInlineCodeTool,
  executeInlineDataAnalysisTool,
  executeInlineDocumentTool,
  executeInlineMusicTool,
  executeInlinePresentationTool,
  executeInlineSpotifySearch,
  executeInlineWritingTool,
} from '../services/inlineChatToolExecutor';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { detectWebSearchIntent } from '../utils/searchIntent';
import { detectImageGenerationIntent } from '../utils/imageIntent';
import { detectMusicGenerationIntent } from '../utils/musicIntent';
import { musicService } from '../services/musicService';
import { ImageGeneratingAnimation } from './ImageGeneratingAnimation';
import { FullscreenImageModal } from './FullscreenImageModal';
import { InlineDeepResearchCard } from './InlineDeepResearchCard';
import {
  InlineAgentCard,
  InlineCanvasCard,
  InlineDataAnalysisCard,
  InlinePresentationCard,
  InlineSongCard,
  InlineSpotifyCard,
  InlineWritingCard,
} from './InlineToolCards';
import { InteractiveQuiz } from './InteractiveQuiz';
import { SketchModal } from './SketchModal';
import { isDirectScheduleChatIntent } from '../services/scheduledTaskService';

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
  selectedRoleId?: ChatRoleId;
  theme: ForgeXTheme;
  initialComposerTool?: ComposerToolId;
  onConsumeInitialTool?: () => void;
  initialDraftPrompt?: string;
  onConsumeInitialPrompt?: () => void;
  onNavigateToLibrary?: () => void;
  onOpenVoiceMode?: () => void;
  activeReminder?: ActiveReminderAlert | null;
  isReminderSpeaking?: boolean;
  onReplayReminder?: () => void;
  onDismissReminder?: () => void;
  linkedScheduledTask?: ScheduledTask | null;
  isLinkedTaskRunning?: boolean;
  onCreateScheduleInChat?: (rawPrompt: string) => void;
  onOpenVaultSettings?: () => void;
}

const TOOL_CHIP_META: Record<
  Exclude<ComposerToolId, 'none'>,
  { label: string; placeholder: string; badgeClass: string; iconColor?: string }
> = {
  deep_research: {
    label: 'Deep research',
    placeholder: 'Research a topic...',
    badgeClass: 'bg-rose-500/8 hover:bg-rose-500/15 text-[#C84B82] dark:text-rose-400',
  },
  image: {
    label: 'Image',
    placeholder: 'Describe an image...',
    badgeClass: 'bg-sky-500/12 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400',
  },
  search: {
    label: 'Web search',
    placeholder: 'Search the web...',
    badgeClass: 'bg-sky-500/12 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400',
  },
  thinking: {
    label: 'Thinking',
    placeholder: 'Ask anything...',
    badgeClass: 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200',
  },
  code: {
    label: 'Code',
    placeholder: 'Describe code or app...',
    badgeClass: 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  },
  music: {
    label: 'Make song',
    placeholder: 'Describe a song...',
    badgeClass: 'bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  },
  spotify: {
    label: 'Music player',
    placeholder: 'Search music...',
    badgeClass: 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  },
  agents: {
    label: 'AI Agent',
    placeholder: 'Assign a task...',
    badgeClass: 'bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  },
  data_analysis: {
    label: 'Data analysis',
    placeholder: 'Analyze data...',
    badgeClass: 'bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  },
  vault: {
    label: 'Knowledge Vault',
    placeholder: 'Ask Vault...',
    badgeClass: 'bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  },
  files: {
    label: 'Document AI',
    placeholder: 'Ask about files...',
    badgeClass: 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  },
  writing: {
    label: 'Writing',
    placeholder: 'What to draft?',
    badgeClass: 'bg-violet-500/12 hover:bg-violet-500/20 text-violet-700 dark:text-violet-400',
  },
  presentation: {
    label: 'Presentations',
    placeholder: 'Slide topic...',
    badgeClass: 'bg-orange-500/12 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  },
  canvas: {
    label: 'AI Canvas',
    placeholder: 'Board topic...',
    badgeClass: 'bg-rose-500/12 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400',
  },
  schedule: {
    label: 'Schedule',
    placeholder: 'e.g. Remind me at 3:30 PM or Daily news at 8:30 AM...',
    badgeClass: 'bg-sky-500/12 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400',
  },
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  currentSession,
  onUpdateSession,
  onDeleteSession,
  onNewChat,
  selectedModelId,
  onSelectModel,
  selectedRoleId = 'general',
  theme,
  initialComposerTool,
  onConsumeInitialTool,
  initialDraftPrompt,
  onConsumeInitialPrompt,
  onNavigateToLibrary,
  onOpenVoiceMode,
  activeReminder,
  isReminderSpeaking = false,
  onReplayReminder,
  onDismissReminder,
  linkedScheduledTask,
  isLinkedTaskRunning = false,
  onCreateScheduleInChat,
  onOpenVaultSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineToolStatus, setInlineToolStatus] = useState<string | null>(null);
  const [searchingQuery, setSearchingQuery] = useState<string | null>(null);
  const [searchedForQueryDuringTurn, setSearchedForQueryDuringTurn] = useState<string | null>(null);
  const [expandedDomainGroup, setExpandedDomainGroup] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ type: 'file' | 'image'; name: string; url?: string; rawText?: string }[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [activeComposerTool, setActiveComposerTool] = useState<ComposerToolId>('none');
  const [activeProjectInChat, setActiveProjectInChat] = useState<ForgeXProject | null>(null);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [activeVaultDocsCount, setActiveVaultDocsCount] = useState<number>(() => vaultService.getActiveDocuments().length);
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
  const prevSessionIdRef = useRef<string | null>(currentSession?.id || null);

  useEffect(() => {
    const nextId = currentSession?.id || null;
    const prevId = prevSessionIdRef.current;
    prevSessionIdRef.current = nextId;
    // Reset transient state when switching from one saved session to another or back to New Chat
    if (prevId !== null && prevId !== nextId) {
      setPendingUserTurn(null);
      setStreamingReply(null);
      setSearchingQuery(null);
      setSearchedForQueryDuringTurn(null);
      setGeneratingImageState(null);
      setInlineToolStatus(null);
      setExpandedDomainGroup(null);
      setActiveProjectInChat(null);
      setAttachedFiles([]);
      setIsSubmitting(false);
    }
  }, [currentSession?.id]);

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
        try {
          const parsedDoc = await documentService.parseUploadedFile(file);
          setAttachedFiles((prev) => [
            ...prev,
            { type: resolvedType, name: fallbackName, rawText: parsedDoc.textContent },
          ]);
        } catch {
          setAttachedFiles((prev) => [...prev, { type: resolvedType, name: fallbackName }]);
        }
      }
    }
  };

  useEffect(() => {
    const syncCount = () => setActiveVaultDocsCount(vaultService.getActiveDocuments().length);
    window.addEventListener('forgex:vault_updated', syncCount);
    return () => window.removeEventListener('forgex:vault_updated', syncCount);
  }, []);

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

  useEffect(() => {
    if (initialComposerTool && initialComposerTool !== 'none') {
      setActiveComposerTool(initialComposerTool);
      onConsumeInitialTool?.();
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
  }, [initialComposerTool, onConsumeInitialTool]);

  useEffect(() => {
    if (initialDraftPrompt && initialDraftPrompt.trim()) {
      setInputText(initialDraftPrompt);
      onConsumeInitialPrompt?.();
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [initialDraftPrompt, onConsumeInitialPrompt]);

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
                  src={`https://icons.duckduckgo.com/ip3/${group.domain}.ico`}
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
  const showActiveLayout = hasMessages || isLinkedTaskRunning;
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

    const updateProgress = (
      completedCount: number,
      sourcesFound = 0,
      extra?: {
        phase?: any;
        phaseLabel?: string;
        metrics?: any;
        executedQueries?: string[];
        sources?: any[];
      }
    ) => {
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
            ...(extra?.phase ? { phase: extra.phase } : {}),
            ...(extra?.phaseLabel ? { phaseLabel: extra.phaseLabel } : {}),
            ...(extra?.metrics ? { metrics: extra.metrics } : {}),
            ...(extra?.executedQueries ? { executedQueries: extra.executedQueries } : {}),
            ...(extra?.sources ? { sources: extra.sources } : {}),
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
    let latestExtra: {
      phase?: any;
      phaseLabel?: string;
      metrics?: any;
      executedQueries?: string[];
      sources?: any[];
    } = {};

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

    const advanceVisualStepsTo = async (targetCount: number, stepDelayMs = 150) => {
      const clampedTarget = Math.min(steps.length, Math.max(visualCompleted, targetCount));
      if (clampedTarget === visualCompleted) {
        updateProgress(visualCompleted, latestSourcesFound, latestExtra);
        return;
      }
      while (visualCompleted < clampedTarget) {
        if (abortController.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        visualCompleted += 1;
        updateProgress(visualCompleted, latestSourcesFound, latestExtra);
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
        if (evt.type === 'step' || evt.type === 'phase' || evt.type === 'metrics') {
          if (typeof evt.sourcesFound === 'number') {
            latestSourcesFound = Math.max(latestSourcesFound, evt.sourcesFound);
          }
          latestExtra = {
            phase: evt.phase || latestExtra.phase,
            phaseLabel: evt.phaseLabel || evt.label || latestExtra.phaseLabel,
            metrics: evt.metrics || latestExtra.metrics,
            executedQueries: evt.executedQueries || latestExtra.executedQueries,
            sources: evt.recentSources || latestExtra.sources,
          };
          const target = Math.min(steps.length, Math.max(0, Number(evt.completedCount ?? visualCompleted)));
          await advanceVisualStepsTo(target, 120);
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
            ...s,
            title: s.title || s.sourceDomain || 'Source',
            url: s.url || '#',
            snippet: s.snippet || '',
            sourceDomain: s.sourceDomain,
          }))
        : [];
      latestSourcesFound = Math.max(latestSourcesFound, sources.length);

      await advanceVisualStepsTo(steps.length, 150);

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
            status: finalReport.failureReason && sources.length === 0 ? 'failed' : 'completed',
            researchDurationSec: durationSec,
            phase: finalReport.failureReason && sources.length === 0 ? 'failed' : 'completed',
            metrics: finalReport.metrics,
            executedQueries: finalReport.searchQueriesUsed,
            sources: finalReport.allDiscoveredSources || sources,
            evidenceRecords: finalReport.evidenceRecords,
            factCheck: finalReport.factCheck,
            unresolvedQuestions: finalReport.unresolvedQuestions,
            failureReason: finalReport.failureReason,
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
          status: 'failed',
          phase: 'failed',
          failureReason: rawErrMsg,
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

  const handleConfirmAgentAction = async (
    sessionId: string,
    messageId: string,
    taskPrompt: string,
    req: NonNullable<ChatMessage['agentRun']>['requiresConfirmation'],
    approved: boolean
  ) => {
    if (!req) return;
    const runningSession = chatService.updateMessageInSession(sessionId, messageId, (m) =>
      m.agentRun
        ? {
            ...m,
            agentRun: {
              ...m.agentRun,
              status: 'running',
              logs: [...m.agentRun.logs, `${approved ? 'Approved' : 'Denied'}: ${req.title}`],
            },
          }
        : m
    );
    if (runningSession) onUpdateSession(runningSession);

    try {
      const res = await executeInlineAgentTool(taskPrompt, selectedModelId, {
        actionId: req.actionId,
        toolName: req.toolName,
        parameters: req.parameters,
        confirmed: approved,
      });
      const doneSession = chatService.updateMessageInSession(sessionId, messageId, (m) => ({
        ...m,
        content: res.reply || (approved ? 'Action executed.' : 'Action cancelled by user.'),
        agentRun: {
          task: taskPrompt,
          status: res.requiresConfirmation ? 'awaiting_confirmation' : 'completed',
          steps: res.steps,
          logs: [...(m.agentRun?.logs || []), ...(res.logs || [])],
          requiresConfirmation: res.requiresConfirmation,
          openBrowser: res.openBrowser,
          browserUrl: res.browserUrl,
        },
      }));
      if (doneSession) onUpdateSession(doneSession);
    } catch (err: any) {
      const errSession = chatService.updateMessageInSession(sessionId, messageId, (m) => ({
        ...m,
        content: `Agent action error: ${err?.message || 'Execution failed.'}`,
        agentRun: {
          ...(m.agentRun || { task: taskPrompt, steps: [], logs: [] }),
          status: 'error',
        },
      }));
      if (errSession) onUpdateSession(errSession);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    voiceController.unlockAudio();
    musicService.unlockAudio();
    const rawTyped = (textToSend !== undefined ? textToSend : inputText).trim();
    const activeToolSnapshot = activeComposerTool;
    const canSubmitEmptyPrompt =
      activeToolSnapshot === 'spotify' || activeToolSnapshot === 'data_analysis';

    if ((!rawTyped && attachedFiles.length === 0 && !canSubmitEmptyPrompt) || isSubmitting) {
      return;
    }

    const defaultPromptForTool =
      activeToolSnapshot === 'spotify'
        ? 'Featured hits'
        : activeToolSnapshot === 'data_analysis'
        ? attachedFiles.length > 0
          ? `Analyze ${attachedFiles[0].name}`
          : 'Analyze sample performance metrics'
        : activeToolSnapshot === 'files'
        ? 'Summarize attached document'
        : '';
    const text = rawTyped || defaultPromptForTool;

    const rawAttachmentsSnapshot = [...attachedFiles];
    const filesToAttach: ChatMessage['attachments'] = rawAttachmentsSnapshot.map((a) => ({
      type: a.type,
      name: a.name,
      ...(a.url ? { url: a.url } : {}),
    }));
    setAttachedFiles([]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setActiveComposerTool('none');

    const activeToolBadge: ChatMessage['toolBadge'] | undefined =
      activeToolSnapshot !== 'none' ? activeToolSnapshot : undefined;

    const effectiveModelForTurn: ForgeXModelId =
      activeToolSnapshot === 'thinking' || activeToolSnapshot === 'deep_research'
        ? 'forge-2-ultra'
        : selectedModelId;

    // 0. Schedule or Reminder creation directly inside Chat
    if (
      onCreateScheduleInChat &&
      (activeToolSnapshot === 'schedule' ||
        (activeToolSnapshot === 'none' && !linkedScheduledTask && isDirectScheduleChatIntent(text)))
    ) {
      onCreateScheduleInChat(text);
      return;
    }

    // 1. Inline Deep Research Plan -> Countdown -> Report workflow
    if (activeToolSnapshot === 'deep_research') {
      await handleStartDeepResearchPlan(
        text || 'Analyze the attached content deeply',
        effectiveModelForTurn,
        filesToAttach
      );
      return;
    }

    // 2. Specialized Inline Studio Tools (stay 100% inside Chat just like Deep Research)
    const inlineSpecialTools: ComposerToolId[] = [
      'music',
      'spotify',
      'presentation',
      'canvas',
      'data_analysis',
      'writing',
      'files',
      'code',
      'agents',
    ];

    const autoMusicIntent =
      activeToolSnapshot === 'none' && attachedFiles.length === 0
        ? detectMusicGenerationIntent(text)
        : { isMusic: false, prompt: '' };
    const effectiveInlineTool: ComposerToolId =
      activeToolSnapshot === 'none' && autoMusicIntent.isMusic
        ? 'music'
        : activeToolSnapshot;
    const effectiveToolBadge: ChatMessage['toolBadge'] | undefined =
      effectiveInlineTool !== 'none' ? effectiveInlineTool : activeToolBadge;

    if (inlineSpecialTools.includes(effectiveInlineTool)) {
      const targetSessionId = currentSession?.id || 'chat_' + Date.now();
      const userMsg: ChatMessage = {
        id: 'usr_msg_' + Date.now(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        attachments: filesToAttach.length > 0 ? filesToAttach : undefined,
        toolBadge: effectiveToolBadge,
      };

      const statusLabels: Record<string, string> = {
        music: 'Composing song, vocals & arrangement...',
        spotify: 'Searching tracks for inline playback...',
        presentation: 'Designing presentation slides...',
        canvas: 'Generating visual node canvas...',
        data_analysis: 'Computing statistics & charts...',
        writing: 'Drafting structured prose...',
        files: 'Analyzing documents...',
        code: 'Synthesizing & verifying code...',
        agents: 'Running autonomous AI Agent...',
      };

      setPendingUserTurn({ text, attachments: filesToAttach, toolBadge: effectiveToolBadge });
      setInlineToolStatus(statusLabels[effectiveInlineTool] || 'Running tool...');
      setIsSubmitting(true);

      try {
        let assistantMsg: ChatMessage = {
          id: 'asst_msg_' + (Date.now() + 1),
          role: 'assistant',
          content: '',
          timestamp: Date.now() + 1,
          toolBadge: effectiveToolBadge,
          modelUsed: currentModel.name,
        };

        if (effectiveInlineTool === 'music') {
          const songPrompt = autoMusicIntent.isMusic && autoMusicIntent.prompt ? autoMusicIntent.prompt : text;
          const song = await executeInlineMusicTool(songPrompt, effectiveModelForTurn);
          assistantMsg.modelUsed = 'ForgeX Song Synthesizer';
          assistantMsg.content = `Created **${song.title}** (${song.genre} · ${song.mood} · ${song.tempoBpm} BPM).`;
          assistantMsg.generatedSong = song;
        } else if (effectiveInlineTool === 'spotify') {
          const res = executeInlineSpotifySearch(rawTyped);
          assistantMsg.modelUsed = 'ForgeX Music Player';
          assistantMsg.content = res.summary;
          assistantMsg.spotifyTracks = res.tracks;
        } else if (effectiveInlineTool === 'presentation') {
          const deck = await executeInlinePresentationTool(text, isDark);
          assistantMsg.modelUsed = 'ForgeX Presentations';
          assistantMsg.content = `Generated **${deck.title}** (${deck.slides.length} slides).`;
          assistantMsg.presentationDeck = deck;
        } else if (effectiveInlineTool === 'canvas') {
          const board = await executeInlineCanvasTool(text);
          assistantMsg.modelUsed = 'ForgeX AI Canvas';
          assistantMsg.content = `Built interactive board **${board.name}** (${board.nodes.length} nodes).`;
          assistantMsg.canvasBoard = board;
        } else if (effectiveInlineTool === 'data_analysis') {
          const { report, datasetSummary } = await executeInlineDataAnalysisTool(
            text,
            rawAttachmentsSnapshot
          );
          assistantMsg.modelUsed = 'ForgeX Data Analysis';
          assistantMsg.content = report.executiveSummary || report.summary;
          assistantMsg.dataReport = report;
          assistantMsg.dataDataset = datasetSummary;
        } else if (effectiveInlineTool === 'writing') {
          const res = await executeInlineWritingTool(text);
          assistantMsg.modelUsed = 'ForgeX Writing Assistant';
          assistantMsg.content = res.content;
          assistantMsg.writingMeta = { category: res.category, tone: res.tone };
        } else if (effectiveInlineTool === 'files') {
          const res = await executeInlineDocumentTool(text, rawAttachmentsSnapshot);
          assistantMsg.modelUsed = 'ForgeX Document AI';
          assistantMsg.content = res.result || 'Document analysis complete.';
          if (Array.isArray(res.quiz) && res.quiz.length > 0) {
            assistantMsg.documentQuiz = res.quiz;
          }
        } else if (effectiveInlineTool === 'code') {
          const codeMarkdown = await executeInlineCodeTool(
            text,
            rawAttachmentsSnapshot,
            effectiveModelForTurn
          );
          assistantMsg.modelUsed = 'ForgeX Code Engine';
          assistantMsg.content = codeMarkdown;
        } else if (effectiveInlineTool === 'agents') {
          const res = await executeInlineAgentTool(
            text,
            effectiveModelForTurn,
            undefined,
            (stepText) => setInlineToolStatus(stepText)
          );
          assistantMsg.modelUsed = 'ForgeX AI Agent';
          assistantMsg.content = res.reply;
          assistantMsg.agentRun = {
            task: text,
            status: res.requiresConfirmation ? 'awaiting_confirmation' : 'completed',
            steps: res.steps,
            logs: res.logs,
            requiresConfirmation: res.requiresConfirmation,
            openBrowser: res.openBrowser,
            browserUrl: res.browserUrl,
          };
        }

        const updatedSession = chatService.appendMessagesToSession(
          targetSessionId,
          [userMsg, assistantMsg],
          effectiveModelForTurn,
          text
        );
        setPendingUserTurn(null);
        setInlineToolStatus(null);
        onUpdateSession(updatedSession);
      } catch (err: any) {
        const errMsg: ChatMessage = {
          id: 'asst_err_' + (Date.now() + 1),
          role: 'assistant',
          content: `Could not complete ${TOOL_CHIP_META[effectiveInlineTool as Exclude<ComposerToolId, 'none'>]?.label || 'tool'} request: ${err?.message || 'Unexpected error'}.`,
          timestamp: Date.now() + 1,
          toolBadge: effectiveToolBadge,
        };
        const updatedSession = chatService.appendMessagesToSession(
          targetSessionId,
          [userMsg, errMsg],
          effectiveModelForTurn,
          text
        );
        setPendingUserTurn(null);
        setInlineToolStatus(null);
        onUpdateSession(updatedSession);
      } finally {
        setIsSubmitting(false);
        setInlineToolStatus(null);
        setPendingUserTurn(null);
      }
      return;
    }

    // 3. Standard Chat, Image, Web Search, Thinking, and Knowledge Vault Grounded Q&A
    // Set optimistic message so user never sees input vanish without response
    setPendingUserTurn({ text, attachments: filesToAttach, toolBadge: activeToolBadge });
    setStreamingReply(null);

    // Check for image generation intent vs web search vs general chat
    const hasAttachedImage = filesToAttach.some((f) => f.type === 'image');
    const attachedTextSnippets = rawAttachmentsSnapshot
      .filter((a) => a.type === 'file' && a.rawText)
      .map((a) => `\n\n[Attached File: ${a.name}]\n${a.rawText!.slice(0, 6000)}`)
      .join('');
    const enrichedUserText = attachedTextSnippets ? `${text}${attachedTextSnippets}` : text;

    const rawTextForService =
      activeToolSnapshot === 'image' && !/^\/image\b/i.test(text) && !detectImageGenerationIntent(text, hasAttachedImage).isImage
        ? `/image ${text}`
        : activeProjectInChat && !detectImageGenerationIntent(text, hasAttachedImage).isImage
        ? `${enrichedUserText}\n\n[Project Context — ${activeProjectInChat.name}: ${activeProjectInChat.description || ''}${activeProjectInChat.contextNotes ? ` | Notes: ${activeProjectInChat.contextNotes}` : ''}]`
        : enrichedUserText;
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
      const activeRolePreset =
        CHAT_ROLES.find((r) => r.id === (selectedRoleId || currentSession?.roleId || 'general')) ||
        CHAT_ROLES[0];
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
        activeToolBadge,
        activeRolePreset.systemInstruction,
        activeRolePreset.id
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
    const hasContent = Boolean(
      inputText.trim() ||
        attachedFiles.length > 0 ||
        activeComposerTool === 'spotify' ||
        activeComposerTool === 'data_analysis'
    );

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
          className={`relative rounded-3xl p-2 sm:p-2.5 border transition-all duration-200 shadow-sm flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 ${
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

            {/* Plus Popover Menu with attachments, chat modes, and all ForgeX tools */}
            {attachMenuOpen && (
              <div
                id="chat-plus-popover"
                className={`absolute ${
                  showActiveLayout ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
                } left-0 w-[min(348px,calc(100vw-2.25rem))] max-h-[min(400px,52dvh)] overflow-y-auto custom-scrollbar rounded-2xl border p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.16)] z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/60'
                    : 'bg-white border-neutral-200/90 text-neutral-900'
                }`}
              >
                <div className={`px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Attach & Context
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <MenuLibraryIcon className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Add from library</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Browse saved files
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setIsSketchOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <MenuSketchIcon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Sketch</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Draw and attach
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setIsProjectPickerOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
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
                      Ground chat context
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    onOpenVaultSettings?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex items-baseline gap-2 truncate">
                    <span className="text-[13px] font-medium shrink-0">Knowledge Vault</span>
                    <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {activeVaultDocsCount} active docs
                    </span>
                  </div>
                </button>

                <div className={`my-1.5 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200/80'}`} />
                <div className={`px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wide ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Inline Chat Tools
                </div>

                {(
                  [
                    {
                      id: 'image' as Exclude<ComposerToolId, 'none'>,
                      label: 'Create image',
                      desc: 'Generate visuals inline',
                      icon: ImageIcon,
                      color: 'text-sky-500',
                    },
                    {
                      id: 'search' as Exclude<ComposerToolId, 'none'>,
                      label: 'Web search',
                      desc: 'Real-time cited answers',
                      icon: Globe,
                      color: 'text-sky-500',
                    },
                    {
                      id: 'deep_research' as Exclude<ComposerToolId, 'none'>,
                      label: 'Deep research',
                      desc: 'Multi-step report in chat',
                      icon: Telescope,
                      color: 'text-sky-500',
                    },
                    {
                      id: 'thinking' as Exclude<ComposerToolId, 'none'>,
                      label: 'Thinking',
                      desc: 'Deep step-by-step logic',
                      icon: Lightbulb,
                      color: isDark ? 'text-amber-400' : 'text-amber-600',
                      onExtra: () => onSelectModel?.('forge-2-ultra'),
                    },
                    {
                      id: 'code' as Exclude<ComposerToolId, 'none'>,
                      label: 'Code workspace',
                      desc: 'Generate, fix & preview inline',
                      icon: Code2,
                      color: 'text-emerald-500',
                    },
                    {
                      id: 'music' as Exclude<ComposerToolId, 'none'>,
                      label: 'Make song',
                      desc: 'Audio track & lyrics in chat',
                      icon: Music,
                      color: 'text-amber-500',
                    },
                    {
                      id: 'spotify' as Exclude<ComposerToolId, 'none'>,
                      label: 'Music player',
                      desc: 'Stream tracks inline',
                      icon: Headphones,
                      color: 'text-emerald-500',
                    },
                    {
                      id: 'agents' as Exclude<ComposerToolId, 'none'>,
                      label: 'AI Agents',
                      desc: 'Autonomous tasks in chat',
                      icon: Bot,
                      color: 'text-amber-500',
                    },
                    {
                      id: 'data_analysis' as Exclude<ComposerToolId, 'none'>,
                      label: 'Data analysis',
                      desc: 'CSV/JSON stats & charts',
                      icon: BarChart3,
                      color: 'text-amber-500',
                    },
                    {
                      id: 'files' as Exclude<ComposerToolId, 'none'>,
                      label: 'Document AI',
                      desc: 'Summaries, tables & quizzes',
                      icon: FileText,
                      color: 'text-emerald-500',
                    },
                    {
                      id: 'writing' as Exclude<ComposerToolId, 'none'>,
                      label: 'Writing assistant',
                      desc: 'Draft & refine prose inline',
                      icon: PenTool,
                      color: 'text-violet-500',
                    },
                    {
                      id: 'presentation' as Exclude<ComposerToolId, 'none'>,
                      label: 'Presentations',
                      desc: 'Interactive slide decks',
                      icon: Presentation,
                      color: 'text-orange-500',
                    },
                    {
                      id: 'canvas' as Exclude<ComposerToolId, 'none'>,
                      label: 'AI Canvas',
                      desc: 'Mindmap & flow diagrams',
                      icon: LayoutDashboard,
                      color: 'text-rose-500',
                    },
                    {
                      id: 'vault' as Exclude<ComposerToolId, 'none'>,
                      label: 'Knowledge Vault',
                      desc: `${activeVaultDocsCount} docs · Q&A in chat`,
                      icon: Database,
                      color: 'text-amber-500',
                    },
                    {
                      id: 'schedule' as Exclude<ComposerToolId, 'none'>,
                      label: 'Schedule & Reminder',
                      desc: 'Daily updates & timed alerts',
                      icon: Clock,
                      color: 'text-sky-500',
                    },
                  ] as const
                ).map((tool) => {
                  const ToolIcon = tool.icon;
                  const isActive = activeComposerTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      id={`btn-chat-plus-tool-${tool.id}`}
                      type="button"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setActiveComposerTool(tool.id);
                        if ('onExtra' in tool && tool.onExtra) tool.onExtra();
                        textareaRef.current?.focus();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isActive
                          ? isDark
                            ? 'bg-neutral-800'
                            : 'bg-neutral-100'
                          : isDark
                          ? 'hover:bg-neutral-800'
                          : 'hover:bg-neutral-100'
                      }`}
                    >
                      <ToolIcon className={`w-4 h-4 shrink-0 ${tool.color}`} />
                      <div className="min-w-0 flex items-baseline gap-2 truncate">
                        <span className="text-[13px] font-medium shrink-0">{tool.label}</span>
                        <span className={`text-[12px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {tool.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Project & Composer Tool Chips (wrap cleanly above input on narrow mobile) */}
          {(activeProjectInChat || activeComposerTool !== 'none') && (
            <div className="order-first w-full flex flex-wrap items-center gap-1.5 px-1 pb-1 sm:order-none sm:w-auto sm:px-0 sm:pb-0 sm:shrink-0">
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

              {activeComposerTool !== 'none' && (
                <button
                  type="button"
                  onClick={() => setActiveComposerTool('none')}
                  title="Clear selected tool"
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    TOOL_CHIP_META[activeComposerTool]?.badgeClass ||
                    'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  {activeComposerTool === 'deep_research' && <Telescope className="w-3.5 h-3.5 text-sky-500" />}
                  {activeComposerTool === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'search' && <Globe className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'thinking' && <Brain className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'code' && <Code2 className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'music' && <Music className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'spotify' && <Headphones className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'agents' && <Bot className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'data_analysis' && <BarChart3 className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'vault' && <Database className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'files' && <FileText className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'writing' && <PenTool className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'presentation' && <Presentation className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'canvas' && <LayoutDashboard className="w-3.5 h-3.5" />}
                  {activeComposerTool === 'schedule' && <Clock className="w-3.5 h-3.5" />}
                  <span>{TOOL_CHIP_META[activeComposerTool]?.label || activeComposerTool}</span>
                  <X className="w-3 h-3 opacity-70" />
                </button>
              )}
            </div>
          )}

          {/* Text Area */}
          <div className="flex-1 min-w-[110px] flex items-center">
            <textarea
              ref={textareaRef}
              id="chat-textarea"
              rows={1}
              value={inputText}
              onFocus={() => voiceController.unlockAudio()}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                voiceModeState === 'listening' || isListening
                  ? 'Listening...'
                  : voiceModeState === 'transcribing' || isProcessing
                  ? 'Transcribing...'
                  : activeComposerTool !== 'none'
                  ? TOOL_CHIP_META[activeComposerTool]?.placeholder || 'Ask ForgeX'
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
              onClick={() => {
                voiceController.unlockAudio();
                toggleListening();
              }}
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

        {/* Scheduled reminder announcement below while user is talking/chatting */}
        {activeReminder && (
          <div
            id="chat-reminder-below-bar"
            role="status"
            aria-live="polite"
            className={`mt-2 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                : 'bg-amber-50/90 border-amber-300/70 text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BellRing
                className={`w-4 h-4 shrink-0 ${
                  isReminderSpeaking ? 'text-amber-500 animate-bounce' : 'text-amber-500'
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-[13px] font-medium truncate">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Reminder: </span>
                  {activeReminder.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onReplayReminder && (
                <button
                  type="button"
                  onClick={() => {
                    voiceController.unlockAudio();
                    onReplayReminder();
                  }}
                  title="Say reminder aloud"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'hover:bg-amber-500/20 text-amber-300'
                      : 'hover:bg-amber-200/60 text-amber-800'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isReminderSpeaking ? 'Speaking...' : 'Say'}</span>
                </button>
              )}
              {onDismissReminder && (
                <button
                  type="button"
                  onClick={onDismissReminder}
                  title="Dismiss reminder"
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-black/5 text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
        {!showActiveLayout ? (
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
                  className={`group flex gap-3.5 min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {isUser ? (
                    <div className="flex flex-col items-end max-w-[88%] sm:max-w-[78%] min-w-0">
                      {/* Attachments if any */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end max-w-full">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex flex-col gap-1 items-end max-w-full">
                              {att.type === 'image' && att.url && (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className={`max-h-48 max-w-full sm:max-w-xs rounded-xl object-cover border shadow-sm ${
                                    isDark ? 'border-neutral-700' : 'border-neutral-200'
                                  }`}
                                />
                              )}
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs w-fit max-w-full ${
                                  isDark ? 'bg-neutral-800/80 text-neutral-300' : 'bg-neutral-200 text-neutral-800 font-medium'
                                }`}
                              >
                                {att.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 shrink-0" /> : <FileText className="w-3.5 h-3.5 shrink-0" />}
                                <span className="truncate max-w-[140px]">{att.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* User message text bubble: Clean light/white style or tool-tinted badge matching Screenshot 2 */}
                      <div
                        className={`max-w-full break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 font-normal rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap font-sans transition-colors ${
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
                            {message.toolBadge === 'deep_research' ? (
                              <>
                                <Telescope className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span className="text-[#C84B82] dark:text-rose-400 font-medium">Deep research</span>
                              </>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  TOOL_CHIP_META[message.toolBadge]?.badgeClass ||
                                  'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                <span>{TOOL_CHIP_META[message.toolBadge]?.label || message.toolBadge}</span>
                              </span>
                            )}
                          </span>
                        )}
                        <span>{message.content}</span>
                      </div>

                      {/* Action Bar for User Messages */}
                      <div className="mt-1 flex items-center justify-end px-1 opacity-75 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                            onOpenInCodeStudio={(code) => {
                              setActiveComposerTool('code');
                              setInputText(`Refactor or modify this code:\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\`\n`);
                              textareaRef.current?.focus();
                            }}
                            onOpenInImageStudio={() => {
                              setActiveComposerTool('image');
                              textareaRef.current?.focus();
                            }}
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
                          <div className="flex flex-col gap-3 max-w-xl w-full min-w-0 animate-in fade-in duration-200">
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

                      // Specialized Inline Tool Cards (stay inside Chat just like Deep Research)
                      if (message.generatedSong) {
                        const targetSessionId = currentSession?.id || '';
                        return (
                          <InlineSongCard
                            song={message.generatedSong}
                            theme={theme}
                            onSongUpdated={(updatedSong) => {
                              const next = chatService.updateMessageInSession(
                                targetSessionId,
                                message.id,
                                (m) => ({ ...m, generatedSong: updatedSong })
                              );
                              if (next) onUpdateSession(next);
                            }}
                            onDeleteMessage={() => {
                              const next = chatService.deleteMessage(targetSessionId, message.id);
                              if (next) onUpdateSession(next);
                            }}
                          />
                        );
                      }

                      if (message.spotifyTracks && message.spotifyTracks.length > 0) {
                        return (
                          <InlineSpotifyCard
                            tracks={message.spotifyTracks}
                            theme={theme}
                          />
                        );
                      }

                      if (message.presentationDeck) {
                        return (
                          <InlinePresentationCard
                            deck={message.presentationDeck}
                            theme={theme}
                          />
                        );
                      }

                      if (message.canvasBoard) {
                        return (
                          <InlineCanvasCard
                            board={message.canvasBoard}
                            theme={theme}
                          />
                        );
                      }

                      if (message.dataReport) {
                        return (
                          <InlineDataAnalysisCard
                            report={message.dataReport}
                            dataset={message.dataDataset}
                            theme={theme}
                          />
                        );
                      }

                      if (message.agentRun) {
                        const targetSessionId = currentSession?.id || '';
                        return (
                          <InlineAgentCard
                            task={message.agentRun.task}
                            status={message.agentRun.status}
                            steps={message.agentRun.steps}
                            logs={message.agentRun.logs}
                            content={message.content}
                            requiresConfirmation={message.agentRun.requiresConfirmation}
                            openBrowser={message.agentRun.openBrowser}
                            browserUrl={message.agentRun.browserUrl}
                            theme={theme}
                            onConfirmAction={
                              message.agentRun.requiresConfirmation
                                ? (approved) =>
                                    void handleConfirmAgentAction(
                                      targetSessionId,
                                      message.id,
                                      message.agentRun!.task,
                                      message.agentRun!.requiresConfirmation,
                                      approved
                                    )
                                : undefined
                            }
                          />
                        );
                      }

                      return (
                        <div
                          className={`relative w-full max-w-3xl min-w-0 py-1 transition-colors text-sm sm:text-[15px] leading-[1.75] ${
                            isDark ? 'text-neutral-100' : 'text-neutral-900'
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
                                      className="max-h-48 max-w-full sm:max-w-xs rounded-xl object-cover border border-neutral-700 shadow-sm"
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

                          {/* Message Body with rich Markdown rendering, Writing controls, or Document Quiz */}
                          <div className="relative min-w-0">
                            {message.writingMeta ? (
                              <InlineWritingCard
                                content={message.content}
                                meta={message.writingMeta}
                                theme={theme}
                                onUpdateContent={(nextContent) => {
                                  const next = chatService.updateMessageInSession(
                                    currentSession?.id || '',
                                    message.id,
                                    (m) => ({ ...m, content: nextContent })
                                  );
                                  if (next) onUpdateSession(next);
                                }}
                              />
                            ) : message.documentQuiz && message.documentQuiz.length > 0 ? (
                              <InteractiveQuiz
                                quiz={{
                                  title: 'Document Comprehension Quiz',
                                  questions: message.documentQuiz.map((q, idx) => ({
                                    id: q.id || idx + 1,
                                    question: q.question,
                                    options: q.options,
                                    correctIndex: q.correctAnswerIndex,
                                    explanation: q.explanation,
                                  })),
                                }}
                                theme={theme}
                              />
                            ) : (
                              <MarkdownRenderer
                                content={message.content}
                                theme={theme}
                                onOpenInCodeStudio={(code) => {
                                  setActiveComposerTool('code');
                                  setInputText(`Refactor or modify this code:\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\`\n`);
                                  textareaRef.current?.focus();
                                }}
                                onOpenInImageStudio={(_url, prompt) => {
                                  setActiveComposerTool('image');
                                  if (prompt) setInputText(prompt);
                                  textareaRef.current?.focus();
                                }}
                                onViewImageFullscreen={(url, prompt) => {
                                  setFullscreenImage({ url, prompt });
                                }}
                              />
                            )}
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
                            <div className="flex items-center gap-1.5 pt-2.5 pb-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                              <Globe className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                              <span>Searched the web{message.searchQueries?.[0] ? ` for "${message.searchQueries[0]}"` : ''}</span>
                            </div>
                          ) : null}

                          {/* Minimal borderless action row matching clean chat prose layout */}
                          {!message.isStreaming && (
                            <div
                              className={`mt-2.5 flex items-center gap-2 text-xs ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => copyToClipboard(message.content, message.id)}
                                title="Copy response"
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                  isDark
                                    ? 'hover:bg-neutral-800/70 hover:text-neutral-100 text-neutral-400'
                                    : 'hover:bg-neutral-200/70 hover:text-neutral-900 text-neutral-500'
                                }`}
                              >
                                {copiedMessageId === message.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">Copied</span>
                                  </>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {message.searchedWeb && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                    isDark ? 'text-sky-400/90' : 'text-sky-600'
                                  }`}
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>Web Search</span>
                                </span>
                              )}
                            </div>
                          )}
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
                {inlineToolStatus ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                    <Cpu className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                    <span>{inlineToolStatus}</span>
                  </div>
                ) : searchingQuery ? (
                  /* Searching the Web — Minimal, clean inline style */
                  <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin-slow shrink-0" />
                    <span>Searching {searchingQuery ? searchingQuery : 'the web...'}</span>
                  </div>
                ) : (
                  /* Thinking State — Mature, clean greyish ChatGPT style */
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

            {isLinkedTaskRunning && (
              <div
                id="chat-scheduled-running-indicator"
                className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 py-2 px-1 select-none animate-in fade-in duration-150"
              >
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                <span>
                  Running <strong className="font-medium text-neutral-800 dark:text-neutral-200">{linkedScheduledTask?.title || 'schedule'}</strong> — fetching live update directly into this chat...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* When messages or active scheduled chat exist: Bottom pinned input container */}
      {showActiveLayout && (
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
        onOpenInImageStudio={(promptText) => {
          setFullscreenImage(null);
          setActiveComposerTool('image');
          if (promptText) setInputText(promptText);
          textareaRef.current?.focus();
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
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] ${
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
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Work in a project</h3>
              </div>
              <div className="flex items-center gap-2">
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
