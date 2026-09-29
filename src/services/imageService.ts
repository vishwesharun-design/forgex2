import { GeneratedImage, ImageAspectRatio, ImageStyle, ForgeXModelId, VisionAnalysisResult } from '../types';
import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';
import { puterService, PUTER_FLUX_CONFIG } from './puterService';

function getImageStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_generated_images_${partition}`;
}

const MOCK_IMAGE_IDS = new Set(['img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6']);

export const imageService = {
  getApiKey(): string {
    return localStorage.getItem('forgex_api_key') || '';
  },

  setApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem('forgex_api_key', key.trim());
    } else {
      localStorage.removeItem('forgex_api_key');
    }
  },

  async analyzeImageWithVision(image: string, prompt?: string): Promise<VisionAnalysisResult | null> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          image,
          prompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          return data.result as VisionAnalysisResult;
        }
      }
    } catch (err) {
      console.warn('Failed to analyze image with vision:', err);
    }
    return null;
  },

  getImages(): GeneratedImage[] {
    try {
      const key = getImageStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: GeneratedImage[] = JSON.parse(stored);
        // Strictly filter out any legacy mock images or fake fallback unsplash stock photos
        const realImages = Array.isArray(parsed)
          ? parsed.filter((img) => !MOCK_IMAGE_IDS.has(img.id) && !img.imageUrl?.includes('images.unsplash.com/photo-'))
          : [];
        if (realImages.length !== parsed.length) {
          this.saveImages(realImages);
        }
        return realImages;
      }
    } catch (e) {
      console.error('Failed to load images', e);
    }
    return [];
  },

  async syncWithFirestore(): Promise<GeneratedImage[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        const cloudImages = await firestoreStorageService.loadUserImages(userId);
        if (cloudImages.length > 0) {
          this.saveImages(cloudImages);
          return cloudImages;
        } else {
          // Push existing local images to cloud for this user
          const localImgs = this.getImages();
          for (const img of localImgs) {
            await firestoreStorageService.saveUserImage(userId, img);
          }
        }
      }
    } catch (err) {
      console.warn('Image sync error:', err);
    }
    return this.getImages();
  },

  saveImages(images: GeneratedImage[]): void {
    try {
      const key = getImageStorageKey();
      localStorage.setItem(key, JSON.stringify(images));
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        images.slice(0, 15).forEach((img) => {
          firestoreStorageService.saveUserImage(userId, img).catch(() => {});
        });
      }
    } catch (e) {
      console.error('Failed to save images', e);
    }
  },

  async generateImages(
    params: {
      prompt: string;
      originalInstruction?: string;
      aspectRatio: ImageAspectRatio;
      count: number;
      style: ImageStyle;
      modelId: ForgeXModelId;
      referenceImage?: string;
      customStyle?: string;
      fluxModel?: string;
      ocrMode?: 'edit' | 'create';
    },
    onProgress?: (progress: number) => void
  ): Promise<GeneratedImage[]> {
    const selectedFluxModel = params.fluxModel || puterService.getDefaultFluxModel();
    const count = Math.min(Math.max(params.count || 1, 1), 4);
    const apiKey = this.getApiKey();

    if (onProgress) onProgress(10);

    let effectivePrompt = params.prompt;
    let ocrFoundText: string | undefined;
    let visionSummary: string | undefined;

    // Run Vision OCR & subject analysis if referenceImage is provided
    if (params.referenceImage) {
      if (onProgress) onProgress(15);
      const userReq = params.originalInstruction || params.prompt;
      const visionResult = await this.analyzeImageWithVision(params.referenceImage, userReq);
      if (visionResult) {
        const isRemoval = /(?:remove|erase|delete|eliminate|take\s+out|take\s+away|without)\b/i.test(userReq);
        const candidatePrompt = isRemoval && visionResult.subjectRemovalPrompt
          ? visionResult.subjectRemovalPrompt
          : visionResult.optimizedPrompt;

        if (candidatePrompt && candidatePrompt !== params.prompt) {
          effectivePrompt = candidatePrompt;
        }
        ocrFoundText = visionResult.ocrText;
        visionSummary = visionResult.explanation || visionResult.visualDescription;
      }
    }

    const puterAuthToken = puterService.getAuthToken();

    // 1. If referenceImage is provided, prioritize Server-side Gemini Multimodal Image Generation & Editing with Vision OCR
    if (params.referenceImage) {
      try {
        if (onProgress) onProgress(25);
        const streamRes = await fetch('/api/generate-image/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
            ...(puterAuthToken ? { 'x-puter-auth': puterAuthToken } : {}),
          },
          body: JSON.stringify({
            ...params,
            prompt: effectivePrompt,
            originalInstruction: params.originalInstruction || params.prompt,
            fluxModel: selectedFluxModel,
            apiKey: apiKey || undefined,
            puterAuthToken: puterAuthToken || undefined,
            ocrMode: params.ocrMode,
          }),
        });

        if (streamRes.ok && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const sseImages: GeneratedImage[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const payloadStr = trimmed.slice(5).trim();
              if (!payloadStr) continue;
              try {
                const data = JSON.parse(payloadStr);
                if (data.progress && onProgress) {
                  onProgress(data.progress);
                }
                if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                  sseImages.push(...data.images);
                }
              } catch {}
            }
          }

          if (sseImages.length > 0) {
            const enrichedImages = sseImages.map((img) => ({
              ...img,
              ocrText: img.ocrText || ocrFoundText,
              visionAnalysis: img.visionAnalysis || visionSummary,
              ocrMode: img.ocrMode || params.ocrMode,
            }));
            if (onProgress) onProgress(100);
            const current = this.getImages();
            const updated = [...enrichedImages, ...current];
            this.saveImages(updated);
            return enrichedImages;
          }
        }
      } catch (srvErr) {
        console.warn('Server image edit pipeline notice, falling back:', srvErr);
      }
    }

    // 2. Puter.js SDK call with Black Forest Labs FLUX in browser (for text-to-image or fallback)
    const puterResults: GeneratedImage[] = [];
    let puterError: Error | null = null;

    try {
      if (onProgress) onProgress(25);
      for (let i = 0; i < count; i++) {
        if (onProgress) onProgress(25 + Math.floor((i / count) * 65));
        const res = await puterService.generateFluxImage({
          prompt: effectivePrompt,
          aspectRatio: params.aspectRatio,
          style: params.style,
          customStyle: params.customStyle,
          model: selectedFluxModel,
          referenceImage: params.referenceImage,
        });

        if (res && res.imageUrl) {
          puterResults.push({
            id: `img_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
            prompt: params.prompt,
            imageUrl: res.imageUrl,
            aspectRatio: params.aspectRatio,
            style: params.style,
            customStyle: params.customStyle,
            modelId: params.modelId,
            createdAt: Date.now(),
            isFavorite: false,
            referenceImage: params.referenceImage,
            engine: res.engine || 'Black Forest Labs FLUX (Puter)',
            ocrText: ocrFoundText,
            visionAnalysis: visionSummary,
            ocrMode: params.ocrMode,
          });
        }
      }

      if (puterResults.length > 0) {
        if (onProgress) onProgress(100);
        const current = this.getImages();
        const updated = [...puterResults, ...current];
        this.saveImages(updated);
        return puterResults;
      }
    } catch (err: any) {
      puterError = err instanceof Error ? err : new Error(String(err));
      console.warn('Puter client-side generation notice, trying server pipeline:', err);
    }

    // 2. Real-time streaming SSE image synthesis pipeline
    try {
      const streamRes = await fetch('/api/generate-image/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          ...(puterAuthToken ? { 'x-puter-auth': puterAuthToken } : {}),
        },
        body: JSON.stringify({
          ...params,
          prompt: effectivePrompt,
          fluxModel: selectedFluxModel,
          apiKey: apiKey || undefined,
          puterAuthToken: puterAuthToken || undefined,
        }),
      });

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedImages: GeneratedImage[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payloadStr = trimmed.slice(5).trim();
            if (!payloadStr) continue;

            try {
              const data = JSON.parse(payloadStr);
              if (typeof data.progress === 'number' && onProgress) {
                onProgress(data.progress);
              }
              if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                streamedImages = data.images.map((img: GeneratedImage) => ({
                  ...img,
                  ocrText: img.ocrText || ocrFoundText,
                  visionAnalysis: img.visionAnalysis || visionSummary,
                }));
              }
            } catch {}
          }
        }

        if (streamedImages.length > 0) {
          if (onProgress) onProgress(100);
          const current = this.getImages();
          const updated = [...streamedImages, ...current];
          this.saveImages(updated);
          return streamedImages;
        }
      }
    } catch (_streamErr) {
      console.warn('Streaming image synthesis notice, trying server fallback:', _streamErr);
    }

    // 3. Fallback standard endpoint
    try {
      if (onProgress) onProgress(80);
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          ...(puterAuthToken ? { 'x-puter-auth': puterAuthToken } : {}),
        },
        body: JSON.stringify({
          ...params,
          prompt: effectivePrompt,
          fluxModel: selectedFluxModel,
          apiKey: apiKey || undefined,
          puterAuthToken: puterAuthToken || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images) && data.images.length > 0) {
          const enriched = data.images.map((img: any) => ({
            ...img,
            ocrText: img.ocrText || ocrFoundText,
            visionAnalysis: img.visionAnalysis || visionSummary,
            ocrMode: img.ocrMode || params.ocrMode,
          }));
          if (onProgress) onProgress(100);
          const current = this.getImages();
          const updated = [...enriched, ...current];
          this.saveImages(updated);
          return enriched;
        } else if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (serverErr: any) {
      const finalMsg = puterError?.message || serverErr?.message || 'Failed to generate image with Black Forest Labs FLUX';
      throw new Error(finalMsg);
    }

    throw new Error(puterError?.message || 'Black Forest Labs FLUX generation failed');
  },

  toggleFavorite(imageId: string): GeneratedImage[] {
    const images = this.getImages().map((img) =>
      img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img
    );
    this.saveImages(images);
    return images;
  },

  deleteImage(imageId: string): GeneratedImage[] {
    const images = this.getImages().filter((img) => img.id !== imageId);
    this.saveImages(images);
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.deleteUserImage(userId, imageId).catch(() => {});
    }
    return images;
  }
};
