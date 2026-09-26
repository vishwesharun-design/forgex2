import { CustomStudio, UserStudioProfile } from '../types';
import { firestoreStorageService } from './firestoreStorageService';

export interface StudioCatalogueItem {
  id: string;
  title: string;
  category: 'creative' | 'intelligence' | 'productivity' | 'utility' | 'gaming';
  accentColor: string;
  badge: string;
  description: string;
  author: string;
  creatorId?: string;
  creatorEmail?: string;
  studioBrandName?: string;
  hasVerifiedTick: boolean;
  isOfficial: boolean;
  iconName: string;
  systemPrompt?: string;
  starterPrompts?: string[];
  welcomeMessage?: string;
  uiTemplate?: 'chat' | 'prompt-pad' | 'interactive';
  customHtml?: string;
}

export const OFFICIAL_STUDIOS: StudioCatalogueItem[] = [
  {
    id: 'chat',
    title: 'ForgeX Chat',
    category: 'intelligence',
    accentColor: 'text-amber-400',
    badge: 'Assistant',
    description: 'Multi-turn conversational reasoning with markdown & code',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'MessageSquare',
  },
  {
    id: 'image',
    title: 'Image Studio',
    category: 'creative',
    accentColor: 'text-amber-400',
    badge: 'Visuals',
    description: 'Text-to-image generator with styles, negative prompts & aspect ratios',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Image',
  },
  {
    id: 'music',
    title: 'Make Song',
    category: 'creative',
    accentColor: 'text-yellow-400',
    badge: 'Audio Synth',
    description: 'Web Audio polyphonic synthesizer & song lyrics generator',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Music',
  },
  {
    id: 'spotify',
    title: 'Music Player',
    category: 'creative',
    accentColor: 'text-emerald-400',
    badge: 'Real Audio',
    description: 'Listen to real songs: Interstellar, Levitating, categories & player',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Headphones',
  },
  {
    id: 'search',
    title: 'Web Search',
    category: 'intelligence',
    accentColor: 'text-blue-400',
    badge: 'Grounding',
    description: 'Google search grounding with verified live sources and citation cards',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Globe',
  },
  {
    id: 'research',
    title: 'Deep Research',
    category: 'intelligence',
    accentColor: 'text-cyan-400',
    badge: 'Investigate',
    description: 'Autonomous multi-query web analysis & executive synthesis reports',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Compass',
  },
  {
    id: 'agents',
    title: 'AI Agents',
    category: 'intelligence',
    accentColor: 'text-amber-400',
    badge: 'beta',
    description: 'Autonomous tool-using bots, laptop browser launch & terminal logistics',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Bot',
  },
  {
    id: 'data_analysis',
    title: 'Data Analysis',
    category: 'intelligence',
    accentColor: 'text-amber-400',
    badge: 'BI & Stats',
    description: 'Upload CSV/JSON for automated stats, anomalies, and reports',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'BarChart3',
  },
  {
    id: 'code',
    title: 'Code Studio',
    category: 'productivity',
    accentColor: 'text-emerald-400',
    badge: 'Dev Sandbox',
    description: 'Polyglot coding sandbox with refactoring, execution & formatting',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Code2',
  },
  {
    id: 'files',
    title: 'Document AI',
    category: 'productivity',
    accentColor: 'text-green-400',
    badge: 'Docs & Quiz',
    description: 'Document intelligence, auto-summaries & interactive quizzes',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'FileText',
  },
  {
    id: 'writing',
    title: 'Writing Studio',
    category: 'productivity',
    accentColor: 'text-violet-400',
    badge: 'Prose & Tone',
    description: 'Articles, essays, resumes with tone modifier & rewriter',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'PenTool',
  },
  {
    id: 'presentation',
    title: 'Presentations',
    category: 'productivity',
    accentColor: 'text-orange-400',
    badge: 'Decks',
    description: 'Structured slide architect with themes & HTML export',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'Presentation',
  },
  {
    id: 'canvas',
    title: 'AI Canvas',
    category: 'productivity',
    accentColor: 'text-rose-400',
    badge: 'Whiteboard',
    description: 'Infinite interactive whiteboard & mindmap node graph',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'LayoutDashboard',
  },
  {
    id: 'projects',
    title: 'Projects',
    category: 'productivity',
    accentColor: 'text-amber-500',
    badge: 'Manager',
    description: 'Project portfolios, linked assets and task tracking',
    author: 'ForgeX',
    hasVerifiedTick: true,
    isOfficial: true,
    iconName: 'FolderKanban',
  },
];

const STORAGE_ACTIVE_STUDIOS_KEY = 'forgex_active_studios_v2';
const STORAGE_CUSTOM_STUDIOS_KEY = 'forgex_custom_studios_v1';
const STORAGE_STUDIO_PROFILES_KEY = 'forgex_studio_profiles_by_email_v1';

// Default starter community studio as an example
const DEFAULT_COMMUNITY_STUDIOS: CustomStudio[] = [
  {
    id: 'custom_chess_pro',
    title: 'Chess Master AI',
    creatorName: 'Panda',
    description: 'Interactive grandmaster chess analysis, move evaluation, and tactics simulator',
    category: 'gaming',
    iconName: 'Crown',
    accentColor: 'text-amber-400',
    badge: 'Gaming',
    systemPrompt: `You are Grandmaster Chess AI, an elite chess mentor and opponent. 
1. You can play chess games move by move using standard algebraic notation (e.g., 1. e4, e5 2. Nf3, Nc6).
2. Render an ASCII 8x8 chessboard after every move so the player can clearly visualize the position.
3. Offer deep tactical explanations, blunder checks, and opening strategy tips when asked.
4. Keep commentary energetic, helpful, and analytical.`,
    starterPrompts: [
      'Let\'s play a game! I will play White: 1. e4',
      'Explain the key ideas in the Sicilian Defense',
      'Give me a chess tactic puzzle to solve',
      'What are the best principles for beginners in chess?'
    ],
    welcomeMessage: 'Welcome to Chess Master AI! I am your Grandmaster sparring partner and analyst. Make your first move or ask about any chess strategy!',
    uiTemplate: 'chat',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'custom_prompt_crafter',
    title: 'Prompt Forge Pro',
    creatorName: 'AlexDev',
    description: 'Transform rough one-line thoughts into high-impact, professional system prompts',
    category: 'utility',
    iconName: 'Sparkles',
    accentColor: 'text-cyan-400',
    badge: 'Utility',
    systemPrompt: `You are Prompt Forge Pro, a master prompt engineer specializing in LLM optimization.
When the user shares an idea or prompt, your job is to craft:
1. An Optimized Master Prompt (Role, Context, Constraints, Step-by-step logic, Output Format).
2. Negative constraints (what to avoid).
3. 2-3 Few-shot examples.
4. Prompt effectiveness score out of 100 with recommendations for improvement.`,
    starterPrompts: [
      'Optimize a prompt for generating high-converting sales copy',
      'Create an expert Python code reviewer system prompt',
      'Design a prompt to explain complex physics to a 10-year-old',
      'Turn my idea "fitness coach" into an elite prompt'
    ],
    welcomeMessage: 'Ready to engineer unbeatable AI prompts. Send me any rough idea, goal, or draft prompt!',
    uiTemplate: 'chat',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
];

export const studioService = {
  // Pinned studios in sidebar. Per user request: defaults to ONLY ['chat']!
  getActiveStudioIds(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_STUDIOS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always ensure 'chat' is included
          if (!parsed.includes('chat')) {
            parsed.unshift('chat');
          }
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    // DEFAULT PER SPEC: ONLY 'chat' studio in active sidebar!
    return ['chat'];
  },

  setActiveStudioIds(ids: string[]): void {
    try {
      const unique = Array.from(new Set(ids));
      if (!unique.includes('chat')) {
        unique.unshift('chat');
      }
      localStorage.setItem(STORAGE_ACTIVE_STUDIOS_KEY, JSON.stringify(unique));
      window.dispatchEvent(new Event('forgex_studios_updated'));
    } catch (e) {
      console.error('Failed to save active studio IDs', e);
    }
  },

  addStudioToSidebar(studioId: string): string[] {
    const current = this.getActiveStudioIds();
    if (!current.includes(studioId)) {
      const updated = [...current, studioId];
      this.setActiveStudioIds(updated);
      return updated;
    }
    return current;
  },

  removeStudioFromSidebar(studioId: string): string[] {
    if (studioId === 'chat') return this.getActiveStudioIds(); // chat cannot be removed
    const current = this.getActiveStudioIds();
    const updated = current.filter((id) => id !== studioId);
    this.setActiveStudioIds(updated);
    return updated;
  },

  isStudioInSidebar(studioId: string): boolean {
    return this.getActiveStudioIds().includes(studioId);
  },

  // User Studio Profile (Registered Studio Name tied to authenticated email)
  getUserStudioProfile(email?: string): UserStudioProfile | null {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    try {
      const raw = localStorage.getItem(`${STORAGE_STUDIO_PROFILES_KEY}_${clean}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.studioName && parsed.studioName.trim().length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to get studio profile from localStorage', e);
    }
    return null;
  },

  async syncWithFirestore(userId: string, email: string): Promise<void> {
    if (!userId || userId === 'guest' || !email) return;
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Sync Studio Profile from Firestore
      const cloudProfile = await firestoreStorageService.loadUserStudioProfile(userId);
      if (cloudProfile && cloudProfile.studioName) {
        localStorage.setItem(
          `${STORAGE_STUDIO_PROFILES_KEY}_${cleanEmail}`,
          JSON.stringify({ ...cloudProfile, email: cleanEmail, userId })
        );
      } else {
        // If local profile exists, push it up to Firestore
        const localProfile = this.getUserStudioProfile(cleanEmail);
        if (localProfile && localProfile.studioName) {
          await firestoreStorageService.saveUserStudioProfile(userId, {
            ...localProfile,
            userId,
            email: cleanEmail,
          });
        }
      }

      // 2. Sync Custom Studios from Firestore
      const cloudStudios = await firestoreStorageService.loadUserCustomStudios(userId);
      if (cloudStudios && cloudStudios.length > 0) {
        const allCustom = this.getCustomStudios();
        const studioMap = new Map<string, CustomStudio>();
        allCustom.forEach((s) => studioMap.set(s.id, s));
        cloudStudios.forEach((cs) => {
          if (cs && cs.id) {
            studioMap.set(cs.id, cs as CustomStudio);
          }
        });
        const merged = Array.from(studioMap.values());
        this.saveAllCustomStudios(merged);
      }
      window.dispatchEvent(new Event('forgex_studios_updated'));
    } catch (err) {
      console.warn('Error syncing studioService with Firestore:', err);
    }
  },

  // Normalizes studio names to alphanumeric lowercase for collision checking
  normalizeStudioName(name: string): string {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  // Reserved official and system studio names that cannot be claimed
  RESERVED_NAMES: new Set([
    'forgex',
    'forgexstudio',
    'forgexstudios',
    'forgexai',
    'official',
    'admin',
    'administrator',
    'system',
    'root',
    'support',
    'staff',
  ]),

  /**
   * Checks whether a Studio Name is available or already taken by another creator.
   * "Once the name is taken, it cannot be taken by others."
   */
  async checkStudioNameAvailability(
    rawName: string,
    currentUserEmail?: string,
    currentUserId?: string
  ): Promise<{ available: boolean; isOwner: boolean; reason: string; normalizedName: string }> {
    const trimmed = (rawName || '').trim();
    const normalized = this.normalizeStudioName(trimmed);
    const normUserEmail = (currentUserEmail || '').trim().toLowerCase();

    if (!trimmed || trimmed.length < 2) {
      return {
        available: false,
        isOwner: false,
        reason: 'Studio name must be at least 2 characters.',
        normalizedName: normalized,
      };
    }

    if (this.RESERVED_NAMES.has(normalized)) {
      return {
        available: false,
        isOwner: false,
        reason: `"${trimmed}" is an official reserved platform name and cannot be claimed.`,
        normalizedName: normalized,
      };
    }

    // 1. Check local storage profiles across all users/emails
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_STUDIO_PROFILES_KEY)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.studioName) {
              const otherNorm = this.normalizeStudioName(parsed.studioName);
              if (otherNorm === normalized) {
                const parsedEmail = (parsed.email || '').trim().toLowerCase();
                const isOwner = Boolean(
                  (normUserEmail && parsedEmail === normUserEmail) ||
                  (currentUserId && parsed.userId === currentUserId)
                );
                if (!isOwner) {
                  return {
                    available: false,
                    isOwner: false,
                    reason: `The studio name "${trimmed}" is already taken by another creator. Once taken, it cannot be claimed by others.`,
                    normalizedName: normalized,
                  };
                }
              }
            }
          }
        }
      }
    } catch {
      // Local storage scan fallback
    }

    // 2. Check default starter community creators (e.g. Panda, AlexDev)
    for (const demo of DEFAULT_COMMUNITY_STUDIOS) {
      if (demo.creatorName && this.normalizeStudioName(demo.creatorName) === normalized) {
        if (!normUserEmail.includes(demo.creatorName.toLowerCase())) {
          return {
            available: false,
            isOwner: false,
            reason: `The studio name "${demo.creatorName}" is already claimed by another creator.`,
            normalizedName: normalized,
          };
        }
      }
    }

    // 3. Check Firestore global registry
    try {
      const cloudCheck = await firestoreStorageService.checkStudioNameAvailabilityInFirestore(
        normalized,
        currentUserId,
        normUserEmail
      );
      if (!cloudCheck.available) {
        return {
          available: false,
          isOwner: cloudCheck.isOwner,
          reason: `The studio name "${trimmed}" is already registered by another creator. Once taken, it cannot be claimed by others.`,
          normalizedName: normalized,
        };
      }
      if (cloudCheck.isOwner) {
        return {
          available: true,
          isOwner: true,
          reason: `This is your current registered studio name.`,
          normalizedName: normalized,
        };
      }
    } catch (err) {
      console.warn('Firestore studio name check notice:', err);
    }

    return {
      available: true,
      isOwner: false,
      reason: `"${trimmed}" is available to claim!`,
      normalizedName: normalized,
    };
  },

  /**
   * Atomically claims and saves a creator's unique Studio Name.
   * Enforces global uniqueness: if taken by another user, rejects with an error.
   */
  async claimAndSaveUserStudioProfile(
    profile: UserStudioProfile
  ): Promise<{ success: boolean; error?: string }> {
    if (!profile.email || !profile.studioName?.trim()) {
      return { success: false, error: 'Studio name and email are required.' };
    }

    const clean = profile.email.trim().toLowerCase();
    const studioName = profile.studioName.trim();
    const normalized = this.normalizeStudioName(studioName);

    // Verify availability
    const check = await this.checkStudioNameAvailability(studioName, clean, profile.userId);
    if (!check.available) {
      return { success: false, error: check.reason };
    }

    // If user previously had a different studio name, release the old one from Firestore
    const existing = this.getUserStudioProfile(clean);
    if (existing && existing.studioName && profile.userId && profile.userId !== 'guest') {
      const oldNorm = this.normalizeStudioName(existing.studioName);
      if (oldNorm && oldNorm !== normalized) {
        firestoreStorageService.releaseStudioNameInFirestore(oldNorm, profile.userId).catch(() => {});
      }
    }

    // Reserve in Firestore global registry if authenticated
    if (profile.userId && profile.userId !== 'guest') {
      const reserveRes = await firestoreStorageService.reserveStudioNameInFirestore(
        studioName,
        normalized,
        profile.userId,
        clean
      );
      if (!reserveRes.success) {
        return { success: false, error: reserveRes.error };
      }
    }

    // Save profile
    this.saveUserStudioProfile(profile);
    return { success: true };
  },

  saveUserStudioProfile(profile: UserStudioProfile): void {
    if (!profile.email || !profile.studioName?.trim()) return;
    const clean = profile.email.trim().toLowerCase();
    const studioName = profile.studioName.trim();
    const updatedProfile: UserStudioProfile = {
      ...profile,
      studioName,
      email: clean,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(`${STORAGE_STUDIO_PROFILES_KEY}_${clean}`, JSON.stringify(updatedProfile));

      // Update all existing custom studios belonging to this email to reflect the newly registered studio name
      const customStudios = this.getCustomStudios();
      let hasChanges = false;
      const updatedStudios = customStudios.map((s) => {
        if (s.creatorEmail && s.creatorEmail.trim().toLowerCase() === clean) {
          hasChanges = true;
          return {
            ...s,
            studioBrandName: studioName,
            creatorName: studioName,
          };
        }
        return s;
      });

      if (hasChanges) {
        this.saveAllCustomStudios(updatedStudios);
      } else {
        window.dispatchEvent(new Event('forgex_studios_updated'));
      }

      // If user has a Firebase userId, sync to Firestore
      if (updatedProfile.userId && updatedProfile.userId !== 'guest') {
        firestoreStorageService.saveUserStudioProfile(updatedProfile.userId, updatedProfile).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to save user studio profile', e);
    }
  },

  hasUserStudioProfile(email?: string): boolean {
    if (!email) return false;
    const profile = this.getUserStudioProfile(email);
    return Boolean(profile && profile.studioName && profile.studioName.trim().length >= 2);
  },

  // Custom User-Created Studios
  getCustomStudios(filterEmail?: string): CustomStudio[] {
    let studios: CustomStudio[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_STUDIOS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          studios = parsed;
        }
      }
    } catch {
      // Ignore
    }

    if (studios.length === 0) {
      // Initial community/starter studios
      studios = DEFAULT_COMMUNITY_STUDIOS;
      this.saveAllCustomStudios(DEFAULT_COMMUNITY_STUDIOS);
    }

    if (filterEmail) {
      const cleanEmail = filterEmail.trim().toLowerCase();
      return studios.filter((s) => s.creatorEmail && s.creatorEmail.trim().toLowerCase() === cleanEmail);
    }

    return studios;
  },

  saveAllCustomStudios(studios: CustomStudio[]): void {
    try {
      localStorage.setItem(STORAGE_CUSTOM_STUDIOS_KEY, JSON.stringify(studios));
      window.dispatchEvent(new Event('forgex_studios_updated'));
    } catch (e) {
      console.error('Failed to save custom studios', e);
    }
  },

  saveCustomStudio(studio: CustomStudio): void {
    // If the creator has a registered studio profile for their email, bind studioBrandName
    if (studio.creatorEmail) {
      const profile = this.getUserStudioProfile(studio.creatorEmail);
      if (profile && profile.studioName) {
        studio.studioBrandName = profile.studioName;
        studio.creatorName = profile.studioName;
      }
    }

    const list = this.getCustomStudios();
    const existingIndex = list.findIndex((s) => s.id === studio.id);
    let updated: CustomStudio[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = studio;
    } else {
      updated = [studio, ...list];
    }
    this.saveAllCustomStudios(updated);
    // Auto-add newly created studio to user's sidebar
    this.addStudioToSidebar(studio.id);

    // Sync to Firestore if authenticated user ID is available
    if (studio.creatorId && studio.creatorId !== 'guest') {
      firestoreStorageService.saveUserCustomStudio(studio.creatorId, studio);
    }
  },

  canDeleteStudio(
    studioId: string,
    currentUserId?: string,
    currentUserEmail?: string,
    currentUserName?: string
  ): boolean {
    const customList = this.getCustomStudios();
    const studio = customList.find((s) => s.id === studioId);
    if (!studio) return false;

    const normEmail = (currentUserEmail || '').trim().toLowerCase();
    const studioEmail = (studio.creatorEmail || '').trim().toLowerCase();

    // Strict email check: Only the email that created the studio can manage/delete it
    if (studioEmail && normEmail && studioEmail === normEmail) {
      return true;
    }

    // UID check
    if (studio.creatorId && currentUserId && studio.creatorId === currentUserId) {
      return true;
    }

    // Seed community studios
    if (studio.creatorName === 'Panda' && (normEmail.includes('panda') || (currentUserName && currentUserName.toLowerCase().includes('panda')))) {
      return true;
    }

    return false;
  },

  deleteCustomStudio(
    id: string,
    currentUserId?: string,
    currentUserEmail?: string,
    currentUserName?: string
  ): boolean {
    if (!this.canDeleteStudio(id, currentUserId, currentUserEmail, currentUserName)) {
      console.warn('Unauthorized delete attempt: Only the creator email can delete this studio');
      return false;
    }
    const list = this.getCustomStudios().filter((s) => s.id !== id);
    this.saveAllCustomStudios(list);
    this.removeStudioFromSidebar(id);

    // Sync deletion to Firestore
    if (currentUserId) {
      firestoreStorageService.deleteUserCustomStudio(currentUserId, id);
    }
    return true;
  },

  getAllStudios(): StudioCatalogueItem[] {
    const custom = this.getCustomStudios().map((c): StudioCatalogueItem => {
      const authorName = c.studioBrandName || c.creatorName || 'Anonymous';
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        accentColor: c.accentColor || 'text-blue-400',
        badge: c.badge || 'Custom',
        description: c.description,
        author: authorName,
        creatorId: c.creatorId,
        creatorEmail: c.creatorEmail,
        studioBrandName: c.studioBrandName || c.creatorName,
        hasVerifiedTick: false, // User studios show their Studio Name without verified tick
        isOfficial: false,
        iconName: c.iconName || 'Bot',
        systemPrompt: c.systemPrompt,
        starterPrompts: c.starterPrompts,
        welcomeMessage: c.welcomeMessage,
        uiTemplate: c.uiTemplate,
        customHtml: c.customHtml,
      };
    });

    return [...OFFICIAL_STUDIOS, ...custom];
  },

  getStudioById(id: string): StudioCatalogueItem | undefined {
    return this.getAllStudios().find((s) => s.id === id);
  },
};
