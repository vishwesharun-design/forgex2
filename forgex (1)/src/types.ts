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

export type ActiveWorkspace = 'chat' | 'image' | 'video' | 'music' | 'research';

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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
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
export type ImageStyle = 'Realistic' | 'Cinematic' | 'Anime' | '3D' | 'Illustration' | 'Minimal' | 'Custom';

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

export type VideoDuration = '5s' | '10s' | '15s';
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
}

export type SongGenre = 'Synthwave' | 'Lo-Fi' | 'Cinematic' | 'EDM' | 'Rock' | 'Acoustic' | 'Ambient' | 'Hip-Hop';
export type SongMood = 'Energetic' | 'Chill' | 'Dark' | 'Dreamy' | 'Uplifting' | 'Melancholic';

export interface GeneratedSong {
  id: string;
  title: string;
  prompt: string;
  genre: SongGenre;
  mood: SongMood;
  tempoBpm: number;
  durationSeconds: number;
  lyrics?: string;
  coverUrl: string;
  modelId: ForgeXModelId;
  createdAt: number;
  isFavorite?: boolean;
  audioSeed?: number;
}

export interface UserSettings {
  theme: ForgeXTheme;
  defaultModel: ForgeXModelId;
  responsePreference: 'Creative' | 'Balanced' | 'Precise';
  defaultImageRatio: ImageAspectRatio;
  defaultVideoDuration: VideoDuration;
  autoEnhancePrompts: boolean;
  enableAnimations: boolean;
  enableStarBackground: boolean;
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
  theme: 'dark',
  defaultModel: 'unreal-5',
  responsePreference: 'Balanced',
  defaultImageRatio: '16:9',
  defaultVideoDuration: '10s',
  autoEnhancePrompts: true,
  enableAnimations: true,
  enableStarBackground: true,
  reduceMotion: false,
};
