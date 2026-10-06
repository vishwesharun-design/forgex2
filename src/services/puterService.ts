/**
 * Puter.js SDK Service for Black Forest Labs (FLUX) Image Generation
 * 
 * Implements the official browser-side Puter.js authentication flow.
 * Users authenticate with Puter when required, and the authenticated session
 * is used to invoke the Black Forest Labs FLUX text-to-image models.
 * No personal tokens are hardcoded or stored.
 */

import { ImageAspectRatio, ImageStyle } from '../types';

// Centralized configuration for Black Forest Labs FLUX models in Puter
export interface PuterFluxModelInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  isDefault?: boolean;
}

export const PUTER_FLUX_CONFIG = {
  // Primary Black Forest Labs FLUX model - easily changed in this single location:
  defaultModel: 'black-forest-labs/flux-schnell',
  
  // Available Black Forest Labs FLUX models in Puter
  availableModels: [
    {
      id: 'black-forest-labs/flux-schnell',
      name: 'FLUX.1 Schnell',
      badge: 'FLUX Schnell',
      description: 'Ultra-fast 12B parameter image generation by Black Forest Labs',
      isDefault: true,
    },
    {
      id: 'black-forest-labs/flux-1.1-pro',
      name: 'FLUX 1.1 Pro',
      badge: 'FLUX 1.1 Pro',
      description: 'Premier cinematic quality & prompt adherence by Black Forest Labs',
    },
    {
      id: 'black-forest-labs/flux-2-dev',
      name: 'FLUX.2 Dev',
      badge: 'FLUX.2 Dev',
      description: 'Next-gen open-weight guidance model by Black Forest Labs',
    },
    {
      id: 'black-forest-labs/flux-2-klein-4b',
      name: 'FLUX.2 Klein 4B',
      badge: 'FLUX Klein',
      description: 'Lightweight sub-second generator by Black Forest Labs',
    },
  ] as PuterFluxModelInfo[],
};

export interface FluxGenerationOptions {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  style?: ImageStyle;
  customStyle?: string;
  model?: string;
  referenceImage?: string;
}

export interface FluxGenerationResult {
  imageUrl: string;
  modelUsed: string;
  engine: string;
}

const STYLE_ENHANCEMENTS: Record<string, string> = {
  None: '',
  Realistic: 'photorealistic, ultra-detailed photography, 8k resolution, raw photo, Hasselblad 50mm, natural soft lighting, hyperrealistic textures',
  Cinematic: 'cinematic movie still, 35mm anamorphic lens, dramatic volumetric lighting, color graded, blockbuster atmosphere, shallow depth of field, IMAX quality',
  Anime: 'modern Japanese anime visual aesthetic, Makoto Shinkai style, Studio Ghibli inspired, vibrant colors, clean cel-shaded lineart',
  '3D': '3D digital CGI render, Octane render, Pixar aesthetic, subsurface scattering, smooth clay lighting, ray-traced shadows',
  Illustration: 'digital illustration, hand-drawn painterly textures, expressive brush strokes, concept art, artistic editorial illustration',
  Minimal: 'minimalist graphic design, clean negative space, simple geometric harmony, modern Bauhaus aesthetic, high clarity',
  Cyberpunk: 'cyberpunk aesthetic, neon cyan and magenta illumination, wet reflective asphalt, futuristic urban tech',
  Fantasy: 'epic fantasy concept art, magical glowing runes, ethereal mythical atmosphere, majestic architecture',
  Watercolor: 'delicate watercolor painting, soft pigment washes, organic paper texture, fluid bleed edges',
  'Pixel Art': '16-bit retro pixel art, crisp pixel grid, vibrant nostalgic color palette, detailed sprite artwork',
  'Handwritten Notes': 'ultra-realistic, sharp student study textbook revision notes in an open lined notebook, perfectly legible neat student handwriting in blue gel ink with bold red ink key terms and definitions, zero spelling mistakes, 100% correct spelling, grammatically flawless and understandable English text, section headings in soft yellow pastel highlighter banner pills, faint blue ruled lines on white paper with vertical red left margin, hand-drawn illustrative diagrams, boxed definitions, bullet points, Think and Reflect boxes, authentic lined paper texture, natural warm ambient lighting, 8k resolution, photorealistic masterwork',
  Custom: 'custom bespoke artistic style, exquisite craftsmanship, balanced composition',
};

class PuterService {
  private puterInstance: any = null;
  private initPromise: Promise<any> | null = null;

  /**
   * Initialize Puter SDK instance safely in the browser.
   * Checks window.puter first, and dynamically loads the official SDK if needed.
   */
  public async init(): Promise<any> {
    if (this.puterInstance) {
      return this.puterInstance;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // 1. Check if window.puter is already loaded from <script>
      if (typeof window !== 'undefined' && (window as any).puter) {
        this.puterInstance = (window as any).puter;
        this.silenceDevLogs();
        return this.puterInstance;
      }

      // 2. Try importing npm package @heyputer/puter.js
      try {
        const mod = await import('@heyputer/puter.js');
        const p = mod.default || (mod as any).puter || mod;
        if (p && p.ai) {
          this.puterInstance = p;
          if (typeof window !== 'undefined') {
            (window as any).puter = p;
          }
          this.silenceDevLogs();
          return this.puterInstance;
        }
      } catch (npmErr) {
        console.warn('Puter npm import notice, trying CDN script fallback:', npmErr);
      }

      // 3. Fallback: dynamically inject official CDN script
      if (typeof document !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.puter.com/v2/';
          script.async = true;
          script.onload = () => {
            if ((window as any).puter) {
              this.puterInstance = (window as any).puter;
              this.silenceDevLogs();
              resolve();
            } else {
              reject(new Error('Puter SDK loaded but window.puter is undefined'));
            }
          };
          script.onerror = () => reject(new Error('Failed to load Puter SDK from https://js.puter.com/v2/'));
          document.head.appendChild(script);
        });
      }

      return this.puterInstance;
    })();

    try {
      const instance = await this.initPromise;
      return instance;
    } finally {
      this.initPromise = null;
    }
  }

  private silenceDevLogs(): void {
    if (this.puterInstance) {
      try {
        this.puterInstance.quiet = true;
      } catch {}
    }
  }

  /**
   * Check if Puter SDK is available and ready.
   */
  public isAvailable(): boolean {
    return Boolean(
      (this.puterInstance && this.puterInstance.ai) ||
      (typeof window !== 'undefined' && (window as any).puter && (window as any).puter.ai)
    );
  }

  /**
   * Check if user is currently signed in to Puter using official browser-side auth.
   */
  public isSignedIn(): boolean {
    const p = this.puterInstance || (typeof window !== 'undefined' ? (window as any).puter : null);
    if (p && p.auth && typeof p.auth.isSignedIn === 'function') {
      try {
        return Boolean(p.auth.isSignedIn());
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Official browser-side Puter sign-in flow.
   * Opens the Puter authentication popup for the user.
   */
  public async signIn(): Promise<any> {
    const puter = await this.init();
    if (!puter?.auth?.signIn) {
      throw new Error('Puter authentication is not available.');
    }
    return await puter.auth.signIn();
  }

  /**
   * Sign out of Puter session in the browser.
   */
  public async signOut(): Promise<void> {
    const puter = await this.init();
    if (puter?.auth?.signOut) {
      puter.auth.signOut();
    }
  }

  /**
   * Retrieve current signed-in Puter user profile.
   */
  public async getUser(): Promise<any> {
    const puter = await this.init();
    if (!puter?.auth?.getUser) return null;
    try {
      if (!this.isSignedIn()) return null;
      return await puter.auth.getUser();
    } catch {
      return null;
    }
  }

  /**
   * Get current Puter auth token if signed in.
   */
  public getAuthToken(): string | null {
    if (this.puterInstance && this.puterInstance.authToken) {
      return this.puterInstance.authToken;
    }
    if (typeof window !== 'undefined') {
      try {
        return (window as any).puter?.authToken || localStorage.getItem('puter-auth-token-v2') || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get current selected or default Black Forest Labs FLUX model.
   */
  public getDefaultFluxModel(): string {
    return PUTER_FLUX_CONFIG.defaultModel;
  }

  /**
   * Get all supported Black Forest Labs FLUX models.
   */
  public getAvailableModels(): PuterFluxModelInfo[] {
    return PUTER_FLUX_CONFIG.availableModels;
  }

  /**
   * Ensure user authentication with Puter using the official browser-side Puter.js flow.
   */
  public async ensureAuth(): Promise<boolean> {
    const puter = await this.init();
    if (!puter || !puter.auth) return false;

    try {
      if (this.isSignedIn()) {
        return true;
      }
      if (puter.auth.signIn) {
        await puter.auth.signIn();
        return this.isSignedIn();
      }
    } catch (authErr) {
      console.warn('Puter authentication notice:', authErr);
    }
    return false;
  }

  /**
   * Generate an image with Black Forest Labs FLUX via Puter.js
   * Uses the authenticated Puter browser session.
   */
  public async generateFluxImage(options: FluxGenerationOptions): Promise<FluxGenerationResult> {
    const puter = await this.init();

    if (!puter || !puter.ai || typeof puter.ai.txt2img !== 'function') {
      throw new Error('Puter.js AI engine is not initialized. Please ensure the Puter SDK is loaded.');
    }

    // Try direct txt2img generation first under the active session (Puter allows guest / session usage)
    // Only invoke signIn if txt2img returns an authentication-required error or if user is not in a sandbox.

    const targetModel = options.model || PUTER_FLUX_CONFIG.defaultModel;
    const cleanPrompt = (options.prompt || '').trim();

    if (!cleanPrompt) {
      throw new Error('Prompt cannot be empty for image generation.');
    }

    // Build prompt: if style is 'None' (Raw exact mode), use cleanPrompt directly so FLUX obeys verbatim.
    // If a specific style is selected and not 'None', append appropriate style cues without drowning out user specifics.
    const styleName = options.style || 'None';
    let fullPrompt = cleanPrompt;
    if (styleName !== 'None') {
      const styleKeywords = options.customStyle?.trim()
        ? options.customStyle.trim()
        : (STYLE_ENHANCEMENTS[styleName] || `${styleName} style`);
      if (styleKeywords) {
        fullPrompt = `${cleanPrompt}, ${styleKeywords}`;
      }
    }

    // Map aspect ratio to dimensions and ratio configurations
    let width = 1024;
    let height = 576;
    let ratioObj = { w: 16, h: 9 };
    let aspectStr = '16:9';

    if (options.aspectRatio === '1:1') {
      width = 1024;
      height = 1024;
      ratioObj = { w: 1, h: 1 };
      aspectStr = '1:1';
    } else if (options.aspectRatio === '9:16') {
      width = 576;
      height = 1024;
      ratioObj = { w: 9, h: 16 };
      aspectStr = '9:16';
    } else if (options.aspectRatio === '4:3') {
      width = 1024;
      height = 768;
      ratioObj = { w: 4, h: 3 };
      aspectStr = '4:3';
    }

    const txt2imgOptions: Record<string, any> = {
      model: targetModel,
      width,
      height,
      ratio: ratioObj,
      aspect_ratio: aspectStr,
    };

    if (options.referenceImage) {
      txt2imgOptions.image_url = options.referenceImage;
      txt2imgOptions.input_image = options.referenceImage;
    }

    let lastError: any = null;

    // Primary attempt with selected Black Forest Labs FLUX model under authenticated session
    try {
      const response = await puter.ai.txt2img(fullPrompt, txt2imgOptions);
      const imageUrl = this.extractImageUrl(response);
      if (imageUrl) {
        return {
          imageUrl,
          modelUsed: targetModel,
          engine: 'Black Forest Labs FLUX (Puter)',
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Puter txt2img with ${targetModel} failed:`, err);
    }

    // If primary failed and there is an alternate FLUX model, try fallback
    const alternateModels = PUTER_FLUX_CONFIG.availableModels
      .map((m) => m.id)
      .filter((id) => id !== targetModel);

    for (const altModel of alternateModels) {
      try {
        const altOptions = { ...txt2imgOptions, model: altModel };
        const response = await puter.ai.txt2img(fullPrompt, altOptions);
        const imageUrl = this.extractImageUrl(response);
        if (imageUrl) {
          return {
            imageUrl,
            modelUsed: altModel,
            engine: 'Black Forest Labs FLUX (Puter)',
          };
        }
      } catch (altErr) {
        lastError = altErr;
        console.warn(`Puter txt2img fallback with ${altModel} failed:`, altErr);
      }
    }

    const errMessage = lastError?.message || lastError?.error || String(lastError || 'Unknown Puter error');
    throw new Error(`Black Forest Labs FLUX generation failed via Puter: ${errMessage}`);
  }

  /**
   * Helper to extract image URL or data URI from Puter's response.
   * Puter returns an HTMLImageElement or an object containing src / url.
   */
  private extractImageUrl(response: any): string | null {
    if (!response) return null;

    // 1. If response is an HTMLImageElement or has .src property
    if (typeof response === 'object' && response.src && typeof response.src === 'string') {
      return response.src;
    }

    // 2. If response is directly a string URL or data URI
    if (typeof response === 'string' && (response.startsWith('http') || response.startsWith('data:image/'))) {
      return response;
    }

    // 3. If response has .url
    if (typeof response === 'object' && response.url && typeof response.url === 'string') {
      return response.url;
    }

    // 4. If response has image or images array
    if (response.images && Array.isArray(response.images) && response.images[0]) {
      const first = response.images[0];
      return typeof first === 'string' ? first : first.src || first.url || null;
    }

    return null;
  }
}

export const puterService = new PuterService();
