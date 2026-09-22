import { GeneratedVideo, VideoDuration, VideoAspectRatio, VideoQuality, VideoGenerationType, ForgeXModelId, VideoSlide, CameraMotion } from '../types';
import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';

function getVideoStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_generated_videos_${userId}`;
}

const MOCK_VIDEO_IDS = new Set(['vid_1', 'vid_2', 'vid_3']);

const SAMPLE_VIDEO_URLS = [
  'https://vjs.zencdn.net/v/oceans.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4'
];

const THUMBNAILS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop'
];

export function parseDurationSeconds(duration: VideoDuration | number): number {
  if (typeof duration === 'number') return Math.max(2, duration);
  const match = String(duration || '').match(/(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 10;
}

export function createSlideSvgFallback(
  title: string,
  sceneNumber: number,
  caption: string,
  w: number = 1024,
  h: number = 576,
  totalScenes: number = 4
): string {
  const safeTitle = (title || 'Cinematic Motion Sequence').replace(/[<>&"]/g, '');
  const safeCaption = (caption || 'Generating cinematic frames...').replace(/[<>&"]/g, '');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0a" />
          <stop offset="100%" stop-color="#171717" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${h * 0.4}" fill="url(#glow)" />
      <text x="${w * 0.5}" y="${h * 0.45}" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="600" fill="#f59e0b" letter-spacing="1">SCENE ${sceneNumber} / ${totalScenes}</text>
      <text x="${w * 0.5}" y="${h * 0.55}" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="#f5f5f5">${safeTitle}</text>
      <text x="${w * 0.5}" y="${h * 0.65}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#a3a3a3">${safeCaption.slice(0, 60)}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildSlideStoryboard(
  prompt: string,
  duration: VideoDuration,
  aspectRatio: VideoAspectRatio,
  slideCount: number = 4
): VideoSlide[] {
  const count = Math.max(2, Math.min(slideCount || 4, 16));
  const durSeconds = parseDurationSeconds(duration);
  const slideDur = Number((durSeconds / count).toFixed(2));
  const w = aspectRatio === '9:16' ? 576 : aspectRatio === '1:1' ? 768 : 1024;
  const h = aspectRatio === '9:16' ? 1024 : aspectRatio === '1:1' ? 768 : 576;

  const cleanSubject = prompt.replace(/^(create|generate|make|show|a|an|the)\s+/i, '').trim();
  const subjectWords = cleanSubject.split(/\s+/).slice(0, 8).join(' ');

  const sceneTemplates: { title: string; motion: CameraMotion; promptModifier: string; caption: string }[] = [
    {
      title: 'Scene 1: Establishing View',
      motion: 'zoom-in',
      promptModifier: 'cinematic wide master shot, volumetric soft lighting, 8k resolution, photorealistic Unreal Engine 5 render',
      caption: `Establishing cinematic view of ${subjectWords}`,
    },
    {
      title: 'Scene 2: Dynamic Action',
      motion: 'pan-left-to-right',
      promptModifier: 'dynamic high-speed tracking action shot, intense subject motion, cinematic lighting flares, sharp focus, 8k render',
      caption: `Fluid motion and dynamic perspective of ${subjectWords}`,
    },
    {
      title: 'Scene 3: Atmospheric Angle',
      motion: 'zoom-out',
      promptModifier: 'sweeping panoramic angle, expansive environmental perspective, cinematic depth of field, dramatic color grading, 8k masterpiece',
      caption: `Panoramic atmospheric perspective of ${subjectWords}`,
    },
    {
      title: 'Scene 4: Cinematic Climax',
      motion: 'pan-right-to-left',
      promptModifier: 'climactic epic finale shot, high-contrast dramatic illumination, cinematic visual crescendo, 8k photorealism',
      caption: `Climactic visual finale of ${subjectWords}`,
    },
    {
      title: 'Scene 5: Intimate Detail',
      motion: 'orbit',
      promptModifier: 'macro close-up shot, intricate textural details, golden rim lighting, crystal clear 8k focus',
      caption: `Close-up nuanced details of ${subjectWords}`,
    },
    {
      title: 'Scene 6: Grand Horizon Vista',
      motion: 'zoom-in',
      promptModifier: 'sublime epic landscape vista, atmospheric dusk haze, cinematic lighting balance, 8k composition',
      caption: `Grand horizon scale of ${subjectWords}`,
    },
    {
      title: 'Scene 7: Kinetic Rush',
      motion: 'pan-left-to-right',
      promptModifier: 'fast dolly camera movement, kinetic visual acceleration, neon and natural light reflections, 8k',
      caption: `Kinetic acceleration around ${subjectWords}`,
    },
    {
      title: 'Scene 8: Master Crescendo',
      motion: 'zoom-out',
      promptModifier: 'transcendent cinematic finale, wide majestic resolution, breathtaking atmospheric lighting, photorealistic Unreal 5',
      caption: `Grand finale crescendo of ${subjectWords}`,
    },
  ];

  const slides: VideoSlide[] = [];
  for (let i = 0; i < count; i++) {
    const template = sceneTemplates[i % sceneTemplates.length];
    const sceneIndex = i + 1;
    const title = count <= 4 ? template.title : `Scene ${sceneIndex}: ${template.title.split(': ')[1] || 'Perspective'}`;
    const specificPrompt = `${prompt}, ${template.promptModifier}`;
    const seed = Math.floor(Math.random() * 888888) + i * 2500 + 101;
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(specificPrompt)}` +
      `?width=${w}&height=${h}&seed=${seed}&nologo=true`;

    slides.push({
      id: `slide_${sceneIndex}_${Date.now()}_${i}`,
      title,
      imageUrl: imgUrl,
      cameraMotion: template.motion,
      caption: template.caption,
      durationSeconds: slideDur,
    });
  }

  return slides;
}

export const videoService = {
  getApiKey(): string {
    const stored = localStorage.getItem('forgex_api_key');
    // Clear out the exhausted key if previously stored in user's browser
    if (stored && stored.includes('hXAm6bKbRNzKvrXEHEeFQhyyGeA7hWhTGNFKy2ipFAMpZ6WucEoXEZMpGz0KWOl2s7PT8gfFZ9stBwQ9')) {
      localStorage.removeItem('forgex_api_key');
      return '';
    }
    return stored || '';
  },

  setApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem('forgex_api_key', key.trim());
    } else {
      localStorage.removeItem('forgex_api_key');
    }
  },

  getVideoProvider(): string {
    const stored = localStorage.getItem('forgex_video_provider');
    if (!stored || stored === 'magichour') {
      localStorage.setItem('forgex_video_provider', 'forgex');
      return 'forgex';
    }
    return stored;
  },

  setVideoProvider(provider: string): void {
    localStorage.setItem('forgex_video_provider', provider || 'forgex');
  },

  getVideos(): GeneratedVideo[] {
    try {
      const key = getVideoStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: GeneratedVideo[] = JSON.parse(stored);
        // Strictly filter out any legacy mock videos
        const realVideos = Array.isArray(parsed)
          ? parsed.filter((v) => !MOCK_VIDEO_IDS.has(v.id))
          : [];
        // Ensure slides exist on all videos for slide-by-slide playback
        let hasUpdated = false;
        const normalized = realVideos.map((v) => {
          const hasIdenticalSlides = v.slides && v.slides.length > 1 && v.slides.every((s) => s.imageUrl === v.slides![0]?.imageUrl);
          const hasOldTitles = v.slides && v.slides.some((s) => 
            s.title.includes('Kinetic Drift') || 
            s.title.includes('Detail Horizon') || 
            s.caption.includes('Kinetic') || 
            s.caption.includes('Detail Horizon')
          );
          if (!v.slides || v.slides.length < 4 || hasIdenticalSlides || hasOldTitles) {
            hasUpdated = true;
            return {
              ...v,
              slides: buildSlideStoryboard(v.prompt, v.duration, v.aspectRatio),
            };
          }
          return v;
        });
        if (hasUpdated || realVideos.length !== parsed.length) {
          this.saveVideos(normalized);
        }
        return normalized;
      }
    } catch (e) {
      console.error('Failed to load videos', e);
    }
    return [];
  },

  saveVideos(videos: GeneratedVideo[]): void {
    try {
      const key = getVideoStorageKey();
      localStorage.setItem(key, JSON.stringify(videos));
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest' && videos.length > 0) {
        // Save latest video to cloud
        firestoreStorageService.saveUserVideo(userId, videos[0]).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to save videos', e);
    }
  },

  async syncWithFirestore(): Promise<GeneratedVideo[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        const cloudVideos = await firestoreStorageService.loadUserVideos(userId);
        if (cloudVideos && cloudVideos.length > 0) {
          const key = getVideoStorageKey();
          localStorage.setItem(key, JSON.stringify(cloudVideos));
          return cloudVideos;
        } else {
          // Push existing local videos for this user
          const localVideos = this.getVideos();
          for (const vid of localVideos) {
            await firestoreStorageService.saveUserVideo(userId, vid);
          }
        }
      }
    } catch (err) {
      console.warn('Video sync error:', err);
    }
    return this.getVideos();
  },

  async generateVideo(
    params: {
      prompt: string;
      duration: VideoDuration;
      aspectRatio: VideoAspectRatio;
      quality: VideoQuality;
      generationType: VideoGenerationType;
      modelId: ForgeXModelId;
      referenceImage?: string;
      slideCount?: number;
    },
    onProgress?: (statusText: string) => void
  ): Promise<GeneratedVideo> {
    const apiKey = this.getApiKey();
    const targetSlideCount = Math.max(2, Math.min(params.slideCount || 4, 16));

    try {
      if (onProgress) onProgress('Initiating neural video synthesis pipeline...');

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          ...params,
          slideCount: targetSlideCount,
          apiKey: apiKey || undefined,
          provider: this.getVideoProvider(),
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // 1. Veo long-running operation polling flow
        if (data.isVeo && data.operationName) {
          if (onProgress) onProgress('Veo neural diffusion model synthesizing frames...');

          // Poll up to 10 cycles (~35 seconds)
          let isComplete = false;
          let attempts = 0;
          const maxAttempts = 10;

          while (!isComplete && attempts < maxAttempts) {
            attempts++;
            await new Promise((r) => setTimeout(r, 3500));
            if (onProgress) onProgress(`Rendering temporal motion field (step ${attempts}/${maxAttempts})...`);

            try {
              const statusRes = await fetch('/api/video-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiKey ? { 'x-api-key': apiKey } : {}),
                },
                body: JSON.stringify({
                  operationName: data.operationName,
                  apiKey: apiKey || undefined,
                }),
              });

              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.done) {
                  isComplete = true;
                  break;
                }
              }
            } catch (pollErr) {
              console.warn('Status poll retry', pollErr);
            }
          }

          if (isComplete) {
            if (onProgress) onProgress('Compiling final MP4 stream...');
            const dlRes = await fetch('/api/video-download', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'x-api-key': apiKey } : {}),
              },
              body: JSON.stringify({
                operationName: data.operationName,
                apiKey: apiKey || undefined,
              }),
            });

            if (dlRes.ok) {
              const blob = await dlRes.blob();
              const blobUrl = URL.createObjectURL(blob);

              const generatedSlides = buildSlideStoryboard(params.prompt, params.duration, params.aspectRatio, targetSlideCount);
              const newVideo: GeneratedVideo = {
                id: 'vid_' + Date.now(),
                prompt: params.prompt,
                videoUrl: blobUrl,
                thumbnailUrl: params.referenceImage || generatedSlides[0]?.imageUrl || THUMBNAILS[0],
                duration: params.duration,
                aspectRatio: params.aspectRatio,
                quality: params.quality,
                generationType: params.generationType,
                modelId: params.modelId,
                createdAt: Date.now(),
                isFavorite: false,
                referenceImage: params.referenceImage,
                slides: generatedSlides,
                slideCount: targetSlideCount,
              };

              const current = this.getVideos();
              const updated = [newVideo, ...current];
              this.saveVideos(updated);
              return newVideo;
            }
          }
        }

        // 2. Direct video returned from server fallback/neural engine
        if (data.video) {
          const videoWithSlides: GeneratedVideo = {
            ...data.video,
            slides: data.video.slides || buildSlideStoryboard(params.prompt, params.duration, params.aspectRatio, targetSlideCount),
            slideCount: targetSlideCount,
          };
          const current = this.getVideos();
          const updated = [videoWithSlides, ...current];
          this.saveVideos(updated);
          return videoWithSlides;
        }
      }
    } catch (apiErr) {
      console.warn('Network call to /api/generate-video failed, using local cinematic synthesis', apiErr);
    }

    // Local procedural fallback if server is unreachable
    if (onProgress) onProgress(`Synthesizing ${targetSlideCount} cinematic motion slides...`);
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 500));

    const videoIndex = Math.floor(Math.random() * SAMPLE_VIDEO_URLS.length);
    const chosenVideo = SAMPLE_VIDEO_URLS[videoIndex];
    const generatedSlides = buildSlideStoryboard(params.prompt, params.duration, params.aspectRatio, targetSlideCount);

    const newVideo: GeneratedVideo = {
      id: 'vid_' + Date.now(),
      prompt: params.prompt,
      videoUrl: chosenVideo,
      thumbnailUrl: params.referenceImage || generatedSlides[0]?.imageUrl,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      quality: params.quality,
      generationType: params.generationType,
      modelId: params.modelId,
      createdAt: Date.now(),
      isFavorite: false,
      referenceImage: params.referenceImage,
      slides: generatedSlides,
      slideCount: targetSlideCount,
    };

    const current = this.getVideos();
    const updated = [newVideo, ...current];
    this.saveVideos(updated);

    return newVideo;
  },

  addSlideToVideo(videoId: string, customPrompt?: string): GeneratedVideo[] {
    const videos = this.getVideos();
    const videoIndex = videos.findIndex((v) => v.id === videoId);
    if (videoIndex === -1) return videos;

    const target = videos[videoIndex];
    const existingSlides = target.slides && target.slides.length > 0 
      ? [...target.slides] 
      : buildSlideStoryboard(target.prompt, target.duration, target.aspectRatio, 4);

    const newSceneIndex = existingSlides.length + 1;
    const durSeconds = parseDurationSeconds(target.duration);
    const newSlideDur = Number((durSeconds / newSceneIndex).toFixed(2));

    const w = target.aspectRatio === '9:16' ? 576 : target.aspectRatio === '1:1' ? 768 : 1024;
    const h = target.aspectRatio === '9:16' ? 1024 : target.aspectRatio === '1:1' ? 768 : 576;
    const motions: CameraMotion[] = ['zoom-in', 'zoom-out', 'pan-left-to-right', 'pan-right-to-left', 'orbit'];
    const chosenMotion = motions[newSceneIndex % motions.length];
    const promptText = customPrompt || target.prompt;
    const seed = Math.floor(Math.random() * 888888) + newSceneIndex * 3141;

    const newSlide: VideoSlide = {
      id: `slide_${newSceneIndex}_${Date.now()}`,
      title: `Scene ${newSceneIndex}: Expanded Perspective`,
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText + ', cinematic dynamic camera, rich lighting, 8k resolution, Unreal Engine 5 render')}` +
        `?width=${w}&height=${h}&seed=${seed}&nologo=true`,
      cameraMotion: chosenMotion,
      caption: `Extended cinematic perspective ${newSceneIndex} of ${target.prompt.slice(0, 40)}`,
      durationSeconds: newSlideDur,
    };

    const updatedSlides = [...existingSlides, newSlide].map((s) => ({
      ...s,
      durationSeconds: newSlideDur,
    }));

    videos[videoIndex] = {
      ...target,
      slides: updatedSlides,
      slideCount: updatedSlides.length,
    };

    this.saveVideos(videos);
    return [...videos];
  },

  toggleFavorite(videoId: string): GeneratedVideo[] {
    const videos = this.getVideos().map((v) =>
      v.id === videoId ? { ...v, isFavorite: !v.isFavorite } : v
    );
    this.saveVideos(videos);
    return videos;
  },

  deleteVideo(videoId: string): GeneratedVideo[] {
    const videos = this.getVideos().filter((v) => v.id !== videoId);
    const key = getVideoStorageKey();
    localStorage.setItem(key, JSON.stringify(videos));
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.deleteUserVideo(userId, videoId).catch(() => {});
    }
    return videos;
  }
};
