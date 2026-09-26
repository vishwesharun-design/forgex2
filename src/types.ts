export type ForgeXTheme = 'dark' | 'light';

export type ForgeXModelId = 
  | 'forge-1'
  | 'forge-1.5'
  | 'forge-2'
  | 'forge-2-pro'
  | 'forge-2-ultra'
  | 'unreal-1' 
  | 'unreal-2' 
  | 'unreal-3' 
  | 'unreal-4' 
  | 'unreal-5';

export interface ForgeXModel {
  id: ForgeXModelId;
  name: string;
  badge: string; // e.g. 'F1', 'F2 Ultra'
  description: string;
  capabilityLevel: number;
}

export const FORGEX_MODELS: ForgeXModel[] = [
  {
    id: 'forge-1',
    name: 'Forge 1',
    badge: 'F1',
    description: 'Ultra-fast basic AI',
    capabilityLevel: 1,
  },
  {
    id: 'forge-1.5',
    name: 'Forge 1.5',
    badge: 'F1.5',
    description: 'Fast balanced reasoning',
    capabilityLevel: 2,
  },
  {
    id: 'forge-2',
    name: 'Forge 2',
    badge: 'F2',
    description: 'Advanced responses & logic',
    capabilityLevel: 3,
  },
  {
    id: 'forge-2-pro',
    name: 'Forge 2 Pro',
    badge: 'F2 Pro',
    description: 'Advanced creative precision',
    capabilityLevel: 4,
  },
  {
    id: 'forge-2-ultra',
    name: 'Forge 2 Ultra',
    badge: 'F2 Ultra',
    description: 'Highest capability flagship',
    capabilityLevel: 5,
  },
];

export type ActiveWorkspace = 
  | 'chat' 
  | 'image' 
  | 'video' 
  | 'music' 
  | 'spotify'
  | 'research' 
  | 'code'
  | 'search'
  | 'agents'
  | 'files'
  | 'writing'
  | 'presentation'
  | 'canvas'
  | 'projects'
  | 'data_analysis'
  | (string & {});

export interface UserStudioProfile {
  studioName: string;
  email: string;
  userId?: string;
  bio?: string;
  iconName?: string;
  accentColor?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface CustomStudio {
  id: string;
  title: string;
  creatorName: string; // Shows below studio WITHOUT tick, e.g. "Panda" or Studio Name
  creatorId?: string; // UID / ID of user who created the studio
  creatorEmail?: string; // Email of user who created the studio (locked to their logged-in email)
  studioBrandName?: string; // Registered Studio Brand Name for this user's email
  description: string;
  category: 'creative' | 'intelligence' | 'productivity' | 'utility' | 'gaming';
  iconName: string;
  accentColor: string;
  badge: string;
  systemPrompt: string;
  starterPrompts?: string[];
  welcomeMessage?: string;
  uiTemplate?: 'chat' | 'prompt-pad' | 'interactive';
  customHtml?: string;
  createdAt: number;
}

export type CodeLanguage = 
  | 'typescript' 
  | 'javascript' 
  | 'python' 
  | 'html' 
  | 'css' 
  | 'json' 
  | 'sql' 
  | 'rust' 
  | 'cpp' 
  | 'go';

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: CodeLanguage;
  createdAt: number;
  updatedAt: number;
  modelId?: ForgeXModelId;
  isFavorite?: boolean;
}

export type CodeAlterMode = 'correct' | 'refactor' | 'optimize' | 'types' | 'custom';

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  sourceDomain?: string;
}

export interface ResearchStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
}

export interface DeepResearchReport {
  id: string;
  query: string;
  depth: 'deep' | 'quick';
  timestamp: number;
  answer: string;
  summary: string;
  keyFindings: string[];
  detailedAnalysis?: string;
  sources: ResearchSource[];
  steps: ResearchStep[];
  modelId: ForgeXModelId;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  creditsUsed: number;
  creditsLimit: number;
  username?: string;
  isGoogleUser?: boolean;
}

export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
  sourceDomain?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  isStreaming?: boolean;
  searchedWeb?: boolean;
  searchQueries?: string[];
  groundingSources?: GroundingSource[];
  attachments?: {
    type: 'image' | 'file';
    name: string;
    url?: string;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  modelId: ForgeXModelId;
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
export type ImageStyle = 
  | 'Realistic' 
  | 'Cinematic' 
  | 'Anime' 
  | '3D' 
  | 'Illustration' 
  | 'Minimal' 
  | 'Cyberpunk' 
  | 'Fantasy' 
  | 'Watercolor' 
  | 'Pixel Art' 
  | 'Custom';

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: ImageAspectRatio;
  style: ImageStyle;
  modelId: ForgeXModelId;
  createdAt: number;
  isFavorite?: boolean;
  referenceImage?: string;
}

export type VideoDuration = '5s' | '10s' | '15s' | '20s' | '30s' | '60s' | string;
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';
export type VideoQuality = 'Standard' | 'High';
export type VideoGenerationType = 'text-to-video' | 'image-to-video';

export type CameraMotion = 'zoom-in' | 'zoom-out' | 'pan-left-to-right' | 'pan-right-to-left' | 'orbit';

export interface VideoSlide {
  id: string;
  title: string;
  imageUrl: string;
  cameraMotion: CameraMotion;
  caption: string;
  durationSeconds: number;
}

export interface GeneratedVideo {
  id: string;
  prompt: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: VideoDuration;
  aspectRatio: VideoAspectRatio;
  quality: VideoQuality;
  generationType: VideoGenerationType;
  modelId: ForgeXModelId;
  createdAt: number;
  isFavorite?: boolean;
  referenceImage?: string;
  slides?: VideoSlide[];
  slideCount?: number;
}

export type SongGenre = 'Synthwave' | 'Lo-Fi' | 'Cinematic' | 'EDM' | 'Rock' | 'Acoustic' | 'Ambient' | 'Hip-Hop' | 'Classical';
export type SongMood = 'Energetic' | 'Chill' | 'Dark' | 'Dreamy' | 'Uplifting' | 'Melancholic';
export type SongVoiceProfile = 'Zephyr' | 'Puck' | 'Kore' | 'Fenrir' | 'Aoede' | 'Charon';
export type SongVocalStyle = 'Melodic Singing' | 'Rhythm Flow' | 'Harmonized Vocals' | 'Ambient Chant';

export interface GeneratedSong {
  id: string;
  title: string;
  prompt: string;
  genre: SongGenre;
  mood: SongMood;
  tempoBpm: number;
  durationSeconds: number; // 30 up to 300 seconds (5:00 min)
  lyrics?: string;
  coverUrl: string;
  modelId: ForgeXModelId;
  createdAt: number;
  isFavorite?: boolean;
  audioSeed?: number;
  isRealLifeHit?: boolean;
  isNoCopyright?: boolean;
  copyrightStatus?: string;
  artist?: string;
  audioUrl?: string;
  cloudStorageUrl?: string;
  // AI Voice Synthesis fields
  hasVoice?: boolean;
  voiceProfile?: SongVoiceProfile;
  vocalStyle?: SongVocalStyle;
  vocalAudioUrl?: string;
}

export type ThemeEffectType = 
  | 'stars' 
  | 'connected_dots' 
  | 'cyber_matrix' 
  | 'neon_waves' 
  | 'floating_particles' 
  | 'geometric_grid' 
  | 'none';

export interface UserSettings {
  theme: ForgeXTheme;
  defaultModel: ForgeXModelId;
  responsePreference: 'Creative' | 'Balanced' | 'Precise';
  defaultImageRatio: ImageAspectRatio;
  defaultVideoDuration?: VideoDuration;
  autoEnhancePrompts: boolean;
  enableAnimations: boolean;
  enableStarBackground: boolean;
  themeEffect: ThemeEffectType;
  reduceMotion: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'system' | 'creation' | 'update';
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  defaultModel: 'forge-2-ultra',
  responsePreference: 'Balanced',
  defaultImageRatio: '16:9',
  defaultVideoDuration: '10s',
  autoEnhancePrompts: true,
  enableAnimations: true,
  enableStarBackground: true,
  themeEffect: 'connected_dots',
  reduceMotion: false,
};

// ==========================================
// 1. FILE / DOCUMENT AI TYPES
// ==========================================
export type DocumentFileType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'csv' | 'image' | 'markdown';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ExtractedTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface DocumentItem {
  id: string;
  name: string;
  fileType: DocumentFileType;
  fileSize: number;
  uploadTime: number;
  textContent: string;
  previewUrl?: string;
  summary?: string;
  keyPoints?: string[];
  tables?: ExtractedTable[];
  notes?: string;
  quizzes?: QuizQuestion[];
  entities?: { label: string; count: number }[];
}

export interface DocQAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  documentIds?: string[];
  citations?: { docName: string; pageOrSection?: string; snippet: string }[];
}

// ==========================================
// 2. AI AGENTS & AGENT LAB TYPES
// ==========================================
export type AgentCategory = 
  | 'Email Agent'
  | 'File Manager Agent'
  | 'Browser Agent'
  | 'Research Agent'
  | 'Coding Agent'
  | 'Computer Agent'
  | 'General Assistant'
  | 'Marketing Agent'
  | 'Data Analyst'
  | 'Study Agent'
  | 'Website Builder'
  | 'Custom Agent';

export type AgentToolType = 
  | 'web_search'
  | 'browser_open'
  | 'browser_read'
  | 'browser_search'
  | 'browser_click'
  | 'browser_type'
  | 'browser_scroll'
  | 'file_list'
  | 'file_read'
  | 'file_create'
  | 'file_move'
  | 'file_rename'
  | 'file_delete'
  | 'folder_create'
  | 'file_organize'
  | 'email_search'
  | 'email_read'
  | 'email_draft'
  | 'email_send'
  | 'code_execute'
  | 'computer_action'
  | 'code_executor'
  | 'data_cruncher'
  | 'doc_reader'
  | 'visual_designer';

export interface AgentPermissions {
  browser: boolean;
  webSearch: boolean;
  files: boolean;
  email: boolean;
  computerControl: boolean;
  codeExecution: boolean;
}

export interface AIAgent {
  id: string;
  name: string;
  role: AgentCategory;
  description: string;
  avatarIcon: string;
  systemPrompt: string;
  enabledTools: string[];
  permissions: AgentPermissions;
  temperature: number;
  modelId?: ForgeXModelId;
  memory?: string;
  isActive: boolean;
  isCustom?: boolean;
  capabilities: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface AgentStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_configured';
  detail?: string;
  toolUsed?: string;
  output?: string;
  actionLog?: string;
  durationMs?: number;
}

export interface ActionConfirmationRequest {
  actionId: string;
  agentId: string;
  toolName: string;
  title: string;
  description: string;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: {
    name: string;
    args: Record<string, any>;
    result?: any;
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'requires_confirmation';
    durationMs?: number;
  }[];
  actionLogs?: string[];
  requiresConfirmation?: ActionConfirmationRequest;
  openBrowser?: boolean;
  browserUrl?: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  taskPrompt: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'awaiting_confirmation';
  steps: AgentStep[];
  actionLogs?: string[];
  finalResponse?: string;
  requiresConfirmation?: ActionConfirmationRequest;
  timestamp: number;
}

// ==========================================
// 3. IMAGE STUDIO TYPES
// ==========================================
export type ImageStudioMode = 
  | 'text-to-image'
  | 'image-to-image'
  | 'remove-background'
  | 'remove-object'
  | 'upscale'
  | 'transform';

// ==========================================
// 4. PRESENTATION GENERATOR TYPES
// ==========================================
export interface SlideItem {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  keyTakeaway?: string;
  visualNote?: string;
  layout: 'title' | 'split' | 'bullets' | 'quote' | 'stats';
  statsData?: { value: string; label: string }[];
}

export interface PresentationDeck {
  id: string;
  topic: string;
  title: string;
  themeStyle: 'dark-amber' | 'cyber-neon' | 'minimal-clean' | 'deep-sapphire';
  slides: SlideItem[];
  createdTime: number;
}

// ==========================================
// 6. WRITING STUDIO TYPES
// ==========================================
export type WritingCategory = 
  | 'Essay'
  | 'Article'
  | 'Blog'
  | 'Story'
  | 'Email'
  | 'Resume'
  | 'Script'
  | 'Documentation';

export type WritingTone = 
  | 'Professional'
  | 'Casual'
  | 'Persuasive'
  | 'Academic'
  | 'Creative'
  | 'Confident'
  | 'Empathetic';

export type WritingAction = 
  | 'rewrite'
  | 'improve'
  | 'shorten'
  | 'expand'
  | 'grammar'
  | 'change-tone';

export interface WritingDoc {
  id: string;
  title: string;
  category: WritingCategory;
  tone: WritingTone;
  content: string;
  wordCount: number;
  charCount: number;
  lastModified: number;
}

// ==========================================
// 7. AI CANVAS / WHITEBOARD TYPES
// ==========================================
export type CanvasNodeType = 
  | 'idea' 
  | 'mindmap' 
  | 'process' 
  | 'decision' 
  | 'note' 
  | 'group';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  tags?: string[];
}

export interface CanvasEdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  style?: 'solid' | 'dashed';
}

export interface CanvasBoard {
  id: string;
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  lastModified: number;
}

// ==========================================
// 8. FORGEX PROJECTS TYPES
// ==========================================
export interface ForgeXProject {
  id: string;
  name: string;
  description: string;
  category: string;
  createdTime: number;
  lastActive: number;
  contextNotes: string;
  chatSessionIds: string[];
  fileIds: string[];
  codeSnippetIds: string[];
  imageIds: string[];
  researchQueries: string[];
  tags: string[];
}

// ==========================================
// 9. VOICE MODE TYPES
// ==========================================
export type VoiceModeStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported';

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender?: string;
}

// ==========================================
// 10. DATA ANALYSIS STUDIO TYPES
// ==========================================
export type DataColumnType = 'number' | 'string' | 'date' | 'boolean';

export interface DataColumnStat {
  name: string;
  type: DataColumnType;
  missingCount: number;
  distinctCount: number;
  nullCount?: number;
  uniqueCount?: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  sum?: number;
  sampleValues: (string | number)[];
  topValues?: Array<{ value: string | number; count: number }>;
}

export interface ParsedDataset {
  id: string;
  name: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  fileSizeBytes: number;
  headers: string[];
  rows: Record<string, string | number>[];
  columnStats: DataColumnStat[];
  stats?: DataColumnStat[];
  uploadedAt: number;
}

export interface DataAnalysisReport {
  id: string;
  datasetId: string;
  datasetName: string;
  timestamp: number;
  title?: string;
  summary: string;
  executiveSummary?: string;
  keyMetrics: Array<{ label: string; value: string; change?: string; sentiment?: 'positive' | 'negative' | 'neutral' }>;
  trends: string[];
  anomalies: string[];
  correlations: string[];
  insights?: string[];
  recommendations?: string[];
  actionableInsights: string[];
  suggestedCharts?: Array<{
    type: 'bar' | 'line' | 'pie' | 'scatter';
    title: string;
    xAxis: string;
    yAxis: string;
  }>;
  chartSuggestions?: Array<{
    type: 'bar' | 'line' | 'pie' | 'scatter';
    title: string;
    xAxis: string;
    yAxis: string;
    data?: Array<{ label: string; value: number }>;
  }>;
}

// ==========================================
// 11. SPOTIFY LOUNGE & MUSIC STUDIO TYPES
// ==========================================
export type SpotifyCategoryType = 
  | 'featured'
  | 'cinematic'
  | 'pop'
  | 'electronic'
  | 'lofi'
  | 'rock';

export interface SpotifyTrack {
  id: string;
  title: string;
  creator: string; // Creator name displayed below song
  album: string;
  year: number;
  duration: string; // e.g. "2:06"
  durationSeconds: number;
  spotifyTrackId: string;
  spotifyUrl: string;
  embedUrl: string;
  coverUrl: string;
  category: SpotifyCategoryType;
  categoryLabel: string;
  genre: string;
  mood: string;
  description: string;
  bpm?: number;
  tags?: string[];
  audioUrl?: string; // High-fidelity authentic real master recording audio stream
  youtubeId?: string; // Full-length 3-5 minute complete track streaming ID
  audioFrequencyProfile?: number[]; // for built-in reactive audio synthesis
}

export interface SpotifyCategory {
  id: SpotifyCategoryType;
  name: string;
  description: string;
  iconName: string;
  color: string;
  badge: string;
}
