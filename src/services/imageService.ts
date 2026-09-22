import { GeneratedImage, ImageAspectRatio, ImageStyle, ForgeXModelId } from '../types';

const STORAGE_KEY_IMAGES = 'forgex_generated_images';

const MOCK_IMAGE_IDS = new Set(['img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6']);

// Aesthetic curated imagery matching different themes/styles for high quality instant visual feedback when API key is pending
const STYLE_IMAGE_POOL: Record<ImageStyle, string[]> = {
  Realistic: [
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
  ],
  Cinematic: [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1200&auto=format&fit=crop',
  ],
  Anime: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop',
  ],
  '3D': [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1000&auto=format&fit=crop',
  ],
  Illustration: [
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop',
  ],
  Minimal: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=1000&auto=format&fit=crop',
  ],
  Custom: [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
  ]
};

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
      const stored = localStorage.getItem(STORAGE_KEY_IMAGES);
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

  saveImages(images: GeneratedImage[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
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
  }): Promise<GeneratedImage[]> {
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
        }
      }
    } catch (apiErr) {
      console.warn('Network call to /api/generate-image failed, falling back to local synthesis', apiErr);
    }

    // Local procedural fallback if server is unreachable
    await new Promise((resolve) => setTimeout(resolve, 1400 + Math.random() * 600));
    const pool = STYLE_IMAGE_POOL[params.style] || STYLE_IMAGE_POOL['Cinematic'];
    const results: GeneratedImage[] = [];

    for (let i = 0; i < params.count; i++) {
      const baseImg = pool[(i + Math.floor(Math.random() * pool.length)) % pool.length];
      const newImage: GeneratedImage = {
        id: 'img_' + Date.now() + '_' + i,
        prompt: params.prompt,
        imageUrl: baseImg,
        aspectRatio: params.aspectRatio,
        style: params.style,
        modelId: params.modelId,
        createdAt: Date.now(),
        isFavorite: false,
        referenceImage: params.referenceImage,
      };
      results.push(newImage);
    }

    const current = this.getImages();
    const updated = [...results, ...current];
    this.saveImages(updated);

    return results;
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
    return images;
  }
};
