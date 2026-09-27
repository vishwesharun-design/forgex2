import { GeneratedImage, ImageAspectRatio, ImageStyle, ForgeXModelId } from '../types';
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

  getImages(): GeneratedImage[] {
    try {
      const key = getImageStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: GeneratedImage[] = JSON.parse(stored);
        // Strictly filter out any legacy mock images
        const realImages = Array.isArray(parsed)
          ? parsed.filter((img) => !MOCK_IMAGE_IDS.has(img.id))
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

  async generateImages(params: {
    prompt: string;
    aspectRatio: ImageAspectRatio;
    count: number;
    style: ImageStyle;
    modelId: ForgeXModelId;
    referenceImage?: string;
    customStyle?: string;
    fluxModel?: string;
  }): Promise<GeneratedImage[]> {
    const selectedFluxModel = params.fluxModel || puterService.getDefaultFluxModel();
    const count = Math.min(Math.max(params.count || 1, 1), 4);
    const puterResults: GeneratedImage[] = [];
    let puterError: Error | null = null;

    // 1. Direct Puter.js SDK call with Black Forest Labs FLUX in browser
    try {
      for (let i = 0; i < count; i++) {
        const res = await puterService.generateFluxImage({
          prompt: params.prompt,
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
          });
        }
      }

      if (puterResults.length > 0) {
        const current = this.getImages();
        const updated = [...puterResults, ...current];
        this.saveImages(updated);
        return puterResults;
      }
    } catch (err: any) {
      puterError = err instanceof Error ? err : new Error(String(err));
      console.warn('Puter client-side generation notice, falling back to server FLUX pipeline:', err);
    }

    // 2. Server-side Black Forest Labs FLUX synthesis pipeline
    const apiKey = this.getApiKey();
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          ...params,
          fluxModel: selectedFluxModel,
          apiKey: apiKey || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images) && data.images.length > 0) {
          const current = this.getImages();
          const updated = [...data.images, ...current];
          this.saveImages(updated);
          return data.images;
        } else if (data.error) {
          throw new Error(data.error);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Image generation failed with HTTP status ${res.status}`);
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
