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
  AlertCircle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { ChatMessage, ChatSession, ForgeXModelId, ForgeXTheme, FORGEX_MODELS } from '../types';
import { chatService } from '../services/chatService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useVoiceInput } from '../hooks/useVoiceInput';

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
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ type: 'file' | 'image'; name: string; url?: string }[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [pendingUserTurn, setPendingUserTurn] = useState<{
    text: string;
    attachments?: ChatMessage['attachments'];
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === 'dark';
  const currentModel = FORGEX_MODELS.find((m) => m.id === selectedModelId) || FORGEX_MODELS[4];

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
  ];

  const hasMessages = displayMessages.length > 0;
  const baseTextRef = useRef<string>('');

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
    onTranscript: (transcript: string, isFinal: boolean) => {
      const base = baseTextRef.current.trim();
      const combined = base ? `${base} ${transcript.trim()}` : transcript.trim();
      setInputText(combined);
      if (isFinal) {
        baseTextRef.current = combined;
      }
    },
  });

  const toggleListening = () => {
    if (!isListening) {
      baseTextRef.current = inputText;
    }
    rawToggleListening();
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, isSubmitting]);

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
    setIsSubmitting(true);

    try {
      const sessionId = currentSession?.id || 'new';
      const { updatedSession } = await chatService.sendMessage(
        sessionId,
        text,
        selectedModelId,
        filesToAttach
      );
      setPendingUserTurn(null);
      onUpdateSession(updatedSession);
    } catch (error) {
      console.error('Failed to send message', error);
      setPendingUserTurn(null);
    } finally {
      setIsSubmitting(false);
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

  const handleDeleteMessage = (messageId: string) => {
    if (!currentSession) return;
    const updated = chatService.deleteMessage(currentSession.id, messageId);
    if (updated) {
      onUpdateSession(updated);
    }
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
          /* Empty Initial State */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8 sm:py-12 select-none animate-in fade-in duration-300">
            {/* How can ForgeX help you today? */}
            <h2 id="chat-empty-title" className="font-display font-bold text-2xl sm:text-4xl tracking-tight mb-2">
              How can ForgeX help you today?
            </h2>

            {/* Clean subtitle without video reference */}
            <p className={`text-sm sm:text-lg mb-6 sm:mb-8 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Chat, create images, or explore ideas.
            </p>

            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full text-left">
              <button
                id="prompt-btn-explain"
                onClick={() => handleSendMessage('Explain how transformer neural networks process attention mechanisms.')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                  isDark
                    ? 'bg-neutral-900/60 border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-850 text-neutral-200'
                    : 'bg-white border-neutral-200 hover:border-amber-400 hover:bg-neutral-50 text-neutral-800 shadow-sm'
                }`}
              >
                <span className="text-amber-400 text-xs font-semibold block mb-1">Concept</span>
                <p className="font-medium text-sm">Explain something</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Deep dive into complex technical mechanisms
                </p>
              </button>

              <button
                id="prompt-btn-image"
                onClick={() => handleSendMessage('Create a prompt for a photorealistic cybernetic sanctuary in 8k.')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                  isDark
                    ? 'bg-neutral-900/60 border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-850 text-neutral-200'
                    : 'bg-white border-neutral-200 hover:border-amber-400 hover:bg-neutral-50 text-neutral-800 shadow-sm'
                }`}
              >
                <span className="text-amber-400 text-xs font-semibold block mb-1">Visual</span>
                <p className="font-medium text-sm">Create an image</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Craft hyper-detailed prompts for Image Studio
                </p>
              </button>

              <button
                id="prompt-btn-music"
                onClick={() => handleSendMessage('Compose lyrics and chord progression for an atmospheric synth track.')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                  isDark
                    ? 'bg-neutral-900/60 border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-850 text-neutral-200'
                    : 'bg-white border-neutral-200 hover:border-amber-400 hover:bg-neutral-50 text-neutral-800 shadow-sm'
                }`}
              >
                <span className="text-amber-400 text-xs font-semibold block mb-1">Audio & Song</span>
                <p className="font-medium text-sm">Compose a song</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Structure rhythm, BPM, vocal style, and lyrics
                </p>
              </button>

              <button
                id="prompt-btn-brainstorm"
                onClick={() => handleSendMessage('Brainstorm 4 innovative features for an AI creative suite.')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                  isDark
                    ? 'bg-neutral-900/60 border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-850 text-neutral-200'
                    : 'bg-white border-neutral-200 hover:border-amber-400 hover:bg-neutral-50 text-neutral-800 shadow-sm'
                }`}
              >
                <span className="text-amber-400 text-xs font-semibold block mb-1">Ideation</span>
                <p className="font-medium text-sm">Brainstorm an idea</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Generate out-of-the-box creative perspectives
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Messages */
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {/* Chat Control Bar */}
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-neutral-800/80' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`font-semibold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                  {currentSession?.title || 'Current Chat'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-400 font-semibold shrink-0">
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
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1 shadow-sm">
                      <Zap className="w-4 h-4 fill-amber-400 text-amber-400 glow-lightning" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 transition-all text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-medium rounded-tr-sm shadow-md shadow-amber-500/15'
                        : isDark
                          ? 'bg-neutral-900/90 border border-neutral-800 text-neutral-100 rounded-tl-sm shadow-md shadow-black/40'
                          : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm shadow-sm'
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
                                isUser ? 'bg-neutral-950/20 text-neutral-950' : 'bg-neutral-800/60 text-neutral-300'
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
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-sans space-y-2">
                        {message.content}
                      </div>
                    ) : (
                      <MarkdownRenderer
                        content={message.content}
                        theme={theme}
                      />
                    )}

                    {/* Action Bar for User Messages */}
                    {isUser && (
                      <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          title="Copy message"
                          className="p-1 rounded-md hover:bg-black/10 text-neutral-950/80 hover:text-neutral-950 transition-colors"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3 h-3 text-green-800" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Delete message"
                          className="p-1 rounded-md hover:bg-red-600 hover:text-white text-neutral-950/80 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Model badge & actions on assistant reply */}
                    {!isUser && (
                      <div className="mt-3 pt-2.5 border-t border-neutral-800/40 flex items-center justify-between text-xs text-neutral-400">
                        <span className="text-[11px] font-mono text-amber-400 inline-flex items-center gap-1">
                          <Zap className="w-3 h-3 shrink-0" />
                          <span>
                            {message.modelUsed && !/gemini/i.test(message.modelUsed)
                              ? message.modelUsed
                              : currentModel.name || 'ForgeX Neural Engine'}
                          </span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-green-400 text-[11px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            title="Delete message"
                            className="flex items-center gap-1 text-neutral-400 hover:text-red-400 transition-colors ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSubmitting && (
              <div className="flex gap-3.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-400 glow-lightning animate-bounce" />
                </div>
                <div
                  className={`rounded-2xl p-4 text-xs font-mono flex items-center gap-2 ${
                    isDark ? 'bg-neutral-900 border border-neutral-800 text-amber-400' : 'bg-white border border-neutral-200 text-amber-600'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <span>{currentModel.name} is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Area: Quick Actions & Large Rounded Chat Input */}
      <div className="px-3 sm:px-6 pt-0 pb-2 sm:pb-4 max-w-3xl w-full mx-auto shrink-0">
        {/* Quick Actions (Section 12) */}
        <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            id="quick-action-image"
            onClick={onNavigateToImage}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all shrink-0 ${
              isDark
                ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-amber-400 hover:border-amber-500/40'
                : 'bg-white hover:bg-neutral-100 border-neutral-200 text-amber-700 hover:border-amber-300 shadow-sm'
            }`}
          >
            <span>+ Image</span>
          </button>

          {onNavigateToMusic && (
            <button
              id="quick-action-music"
              onClick={onNavigateToMusic}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all shrink-0 ${
                isDark
                  ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-amber-400 hover:border-amber-500/40'
                  : 'bg-white hover:bg-neutral-100 border-neutral-200 text-amber-700 hover:border-amber-300 shadow-sm'
              }`}
            >
              <span>+ Song</span>
            </button>
          )}

          <button
            id="quick-action-analyze"
            onClick={() => handleSendMessage('Analyze the technical trade-offs of latent diffusion vs auto-regressive transformers.')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all shrink-0 ${
              isDark
                ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
                : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700 shadow-sm'
            }`}
          >
            <span>Analyze</span>
          </button>

          <button
            id="quick-action-write"
            onClick={() => handleSendMessage('Write a compelling product script for the launch of ForgeX Studio.')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all shrink-0 ${
              isDark
                ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
                : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700 shadow-sm'
            }`}
          >
            <span>Write</span>
          </button>
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs"
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
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="hover:text-white ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Large Rounded Chat Input (Section 11) */}
        <div
          id="chat-input-container"
          className={`relative rounded-3xl p-3 border transition-all duration-200 shadow-xl ${
            isDark
              ? 'bg-neutral-900/90 border-neutral-800 focus-within:border-amber-500/60 shadow-black/50'
              : 'bg-white border-neutral-300 focus-within:border-amber-500 shadow-neutral-200/80'
          }`}
        >
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ForgeX anything..."
            className={`w-full bg-transparent px-3 py-1.5 text-sm resize-none outline-none max-h-48 leading-relaxed ${
              isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'
            }`}
          />

          {/* Action toolbar inside input bottom */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/30 px-1">
            <div className="flex items-center gap-1">
              {/* Attach File Button */}
              <button
                id="btn-attach-file"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Image Attachment Button */}
              <button
                id="btn-attach-image"
                type="button"
                onClick={() => imageInputRef.current?.click()}
                title="Attach image"
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Voice Button */}
              <button
                id="btn-voice-input"
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Stop recording & transcribe' : 'Voice input (Speak to ForgeX)'}
                className={`p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-sm shadow-red-500/20'
                    : isProcessing
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                    : isDark
                      ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                      : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {isListening ? (
                  <StopCircle className="w-4 h-4 text-red-400 animate-pulse" />
                ) : isProcessing ? (
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Active Audio Visualizer & State Badge */}
              {isListening && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  <span className="text-[11px] font-mono font-bold">
                    00:{durationSeconds < 10 ? '0' : ''}{durationSeconds}
                  </span>
                  {/* Dynamic Sound Wave Bars */}
                  <div className="flex items-center gap-0.5 h-3">
                    <span
                      className="w-0.5 bg-red-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, (audioLevel / 100) * 12)}px` }}
                    />
                    <span
                      className="w-0.5 bg-red-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(4, (audioLevel / 100) * 16)}px` }}
                    />
                    <span
                      className="w-0.5 bg-red-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, (audioLevel / 100) * 10)}px` }}
                    />
                  </div>
                  <span className="text-[10px] hidden sm:inline font-medium text-neutral-300">
                    Listening...
                  </span>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[11px] font-medium">Processing voice input...</span>
                </div>
              )}
            </div>

            {/* Voice Error Banner */}
            {voiceError && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs my-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] truncate flex-1">{voiceError}</span>
                <button
                  type="button"
                  onClick={clearVoiceError}
                  className="hover:text-red-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Enter to send
              </span>

              {/* Send Button */}
              <button
                id="btn-chat-send"
                type="button"
                disabled={(!inputText.trim() && attachedFiles.length === 0) || isSubmitting}
                onClick={() => handleSendMessage()}
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                  inputText.trim() || attachedFiles.length > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/25 active:scale-95'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
