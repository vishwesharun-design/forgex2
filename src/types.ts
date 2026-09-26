export type ForgeXTheme = 'dark' | 'light';

export type ForgeXModelId = 
  | 'unreal-1' 
  | 'unreal-2' 
  | 'unreal-3' 
  | 'unreal-4' 
  | 'unreal-5';

export interface ForgeXModel {
  id: ForgeXModelId;
  name: string;
  badge: string; // e.g. 'U1', 'U5'
  description: string;
  capabilityLevel: number;
}

export const FORGEX_MODELS: ForgeXModel[] = [
  {
    id: 'unreal-1',
    name: 'Unreal Engine 1',
    badge: 'U1',
    description: 'Basic AI',
    capabilityLevel: 1,
  },
  {
    id: 'unreal-2',
    name: 'Unreal Engine 2',
    badge: 'U2',
    description: 'Improved reasoning',
    capabilityLevel: 2,
  },
  {
    id: 'unreal-3',
    name: 'Unreal Engine 3',
    badge: 'U3',
    description: 'Advanced responses',
    capabilityLevel: 3,
  },
  {
    id: 'unreal-4',
    name: 'Unreal Engine 4',
    badge: 'U4',
    description: 'Advanced creative intelligence',
    capabilityLevel: 4,
  },
  {
    id: 'unreal-5',
    name: 'Unreal Engine 5',
    badge: 'U5',
    description: 'Highest capability',
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
  | 'data_analysis';

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  isStreaming?: boolean;
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
  defaultModel: 'unreal-5',
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
// 2. AI AGENTS TYPES
// ==========================================
export type AgentCategory = 
  | 'Research Agent'
  | 'Coding Agent'
  | 'Marketing Agent'
  | 'Data Analyst'
  | 'Study Agent'
  | 'Website Builder'
  | 'Custom Agent';

export type AgentToolType = 
  | 'web_search'
  | 'code_executor'
  | 'data_cruncher'
  | 'doc_reader'
  | 'visual_designer';

export interface AIAgent {
  id: string;
  name: string;
  role: AgentCategory;
  description: string;
  avatarIcon: string;
  systemPrompt: string;
  enabledTools: AgentToolType[];
  temperature: number;
  isCustom?: boolean;
  capabilities: string[];
  createdAt: number;
}

export interface AgentStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_configured';
  detail?: string;
  toolUsed?: AgentToolType;
  output?: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  taskPrompt: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  steps: AgentStep[];
  finalResponse?: string;
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
