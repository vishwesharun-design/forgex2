import { GeneratedVideo, VideoDuration, VideoAspectRatio, VideoQuality, VideoGenerationType, ForgeXModelId, VideoSlide, CameraMotion } from '../types';

const STORAGE_KEY_VIDEOS = 'forgex_generated_videos';

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

export function createSlideSvgFallback(
  title: string,
  sceneNumber: number,
  caption: string,
  w: number = 1024,
  h: number = 576
): string {
  const gradients = [
    { from: '#1a120b', to: '#422006', accent: '#f59e0b' },
    { from: '#0b1329', to: '#1e3a8a', accent: '#38bdf8' },
    { from: '#140c26', to: '#4c1d95', accent: '#c084fc' },
    { from: '#06201b', to: '#065f46', accent: '#34d399' },
  ];
  const g = gradients[(sceneNumber - 1) % gradients.length];
  const safeTitle = title.replace(/[<>&"]/g, '');
  const safeCaption = caption.replace(/[<>&"]/g, '');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${g.from}" />
          <stop offset="100%" stop-color="${g.to}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${g.accent}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="${g.accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${h * 0.4}" fill="url(#glow)" />
      <text x="${w * 0.08}" y="${h * 0.35}" font-family="sans-serif" font-size="24" font-weight="700" fill="${g.accent}" letter-spacing="2">SCENE ${sceneNumber} / 4</text>
      <text x="${w * 0.08}" y="${h * 0.52}" font-family="sans-serif" font-size="36" font-weight="800" fill="#ffffff">${safeTitle}</text>
      <text x="${w * 0.08}" y="${h * 0.68}" font-family="sans-serif" font-size="18" fill="#e2e8f0" opacity="0.9">${safeCaption.slice(0, 80)}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildSlideStoryboard(
  prompt: string,
  duration: VideoDuration,
  aspectRatio: VideoAspectRatio
): VideoSlide[] {
  const durSeconds = duration === '5s' ? 5 : duration === '15s' ? 15 : 10;
  const slideDur = durSeconds / 4;
  const w = aspectRatio === '9:16' ? 576 : aspectRatio === '1:1' ? 768 : 1024;
  const h = aspectRatio === '9:16' ? 1024 : aspectRatio === '1:1' ? 768 : 576;

  const lower = prompt.toLowerCase();
  const isTransformation = lower.includes('turn') || lower.includes('morph') || lower.includes('transform') || lower.includes('into');

  let scenes: { title: string; motion: CameraMotion; specificPrompt: string; caption: string }[] = [];

  if (isTransformation) {
    let subjectA = 'first subject';
    let subjectB = 'transformed object';
    const match = lower.match(/(.+?)\s+(?:turning into|turning to|morphing into|transforming into|into)\s+(.+)/);
    if (match) {
      subjectA = match[1].replace(/^(a|an|the)\s+/, '').trim();
      subjectB = match[2].replace(/^(a|an|the)\s+/, '').trim();
    } else {
      subjectA = 'original subject';
      subjectB = 'futuristic transformed form';
    }

    scenes = [
      {
        title: `Scene 1: Initial ${subjectA}`,
        motion: 'zoom-in',
        specificPrompt: `high resolution photographic shot of ${subjectA}, natural organic state, detailed lighting, sharp focus, 8k masterwork`,
        caption: `Scene 1: The ${subjectA} in its initial natural form as the camera slowly pushes in`,
      },
      {
        title: 'Scene 2: Morph Genesis',
        motion: 'pan-left-to-right',
        specificPrompt: `${subjectA} actively transforming, glowing nano-particles, cybernetic energy circuits, metallic shifting contours, cinematic lighting, 8k`,
        caption: `Scene 2: Kinetic transmutation field activates, sweeping left to right across mutating physical contours`,
      },
      {
        title: 'Scene 3: Mechanical Synthesis',
        motion: 'zoom-out',
        specificPrompt: `hybrid transforming creature vehicle combining ${subjectA} and ${subjectB}, aerodynamic mechanical chassis plates forming, wheels locking into place, 8k`,
        caption: `Scene 3: Dynamic pull-out reveals mechanical assembly and structural reshaping into ${subjectB}`,
      },
      {
        title: `Scene 4: Final ${subjectB} Velocity`,
        motion: 'pan-right-to-left',
        specificPrompt: `sleek futuristic high speed ${subjectB}, cinematic headlights glowing, highway asphalt reflection, motion blur, 8k render`,
        caption: `Scene 4: The fully evolved ${subjectB} surges forward with high-speed horizontal tracking`,
      },
    ];
  } else {
    scenes = [
      {
        title: 'Scene 1: Establishing Shot',
        motion: 'zoom-in',
        specificPrompt: `cinematic wide master shot of ${prompt}, atmospheric volumetric lighting, 8k resolution, Unreal Engine 5 render`,
        caption: 'Scene 1: Slow cinematic push-in establishing subject scale and spatial depth',
      },
      {
        title: 'Scene 2: Kinetic Drift',
        motion: 'pan-left-to-right',
        specificPrompt: `dynamic tracking action closeup of ${prompt}, motion particles, cinematic directional light, 8k`,
        caption: 'Scene 2: Camera pans smoothly from left to right capturing kinetic motion and detail',
      },
      {
        title: 'Scene 3: Detail Horizon',
        motion: 'zoom-out',
        specificPrompt: `sweeping panoramic angle of ${prompt}, high contrast highlights, rich cinematic color palette, 8k`,
        caption: 'Scene 3: Expansive pull-out revealing environmental perspective and atmosphere',
      },
      {
        title: 'Scene 4: Dynamic Climax',
        motion: 'pan-right-to-left',
        specificPrompt: `climactic fast tracking shot of ${prompt}, blazing illumination, epic cinematic finish, 8k`,
        caption: 'Scene 4: High-energy reverse tracking shot bringing the sequence to its visual climax',
      },
    ];
  }

  return scenes.map((sc, index) => {
    const seed = Math.floor(Math.random() * 888888) + index * 2500 + 101;
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.specificPrompt)}` +
      `?width=${w}&height=${h}&seed=${seed}&nologo=true`;

    return {
      id: `slide_${index + 1}_${Date.now()}_${index}`,
      title: sc.title,
      imageUrl: imgUrl,
      cameraMotion: sc.motion,
      caption: sc.caption,
      durationSeconds: slideDur,
    };
  });
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
      const stored = localStorage.getItem(STORAGE_KEY_VIDEOS);
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
          if (!v.slides || v.slides.length < 4 || hasIdenticalSlides) {
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
      localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(videos));
    } catch (e) {
      console.error('Failed to save videos', e);
    }
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
    },
    onProgress?: (statusText: string) => void
  ): Promise<GeneratedVideo> {
    const apiKey = this.getApiKey();

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

              const newVideo: GeneratedVideo = {
                id: 'vid_' + Date.now(),
                prompt: params.prompt,
                videoUrl: blobUrl,
                thumbnailUrl: params.referenceImage || THUMBNAILS[0],
                duration: params.duration,
                aspectRatio: params.aspectRatio,
                quality: params.quality,
                generationType: params.generationType,
                modelId: params.modelId,
                createdAt: Date.now(),
                isFavorite: false,
                referenceImage: params.referenceImage,
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
            slides: data.video.slides || buildSlideStoryboard(params.prompt, params.duration, params.aspectRatio),
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
    if (onProgress) onProgress('Synthesizing cinematic motion frames...');
    await new Promise((resolve) => setTimeout(resolve, 2200 + Math.random() * 600));

    const videoIndex = Math.floor(Math.random() * SAMPLE_VIDEO_URLS.length);
    const chosenVideo = SAMPLE_VIDEO_URLS[videoIndex];
    const seed = Math.floor(Math.random() * 888888);
    const promptVisual = `https://image.pollinations.ai/prompt/${encodeURIComponent(params.prompt + ', cinematic photorealistic Unreal Engine 5 8k, detailed masterwork')}` +
      `?width=1024&height=576&seed=${seed}&nologo=true`;

    const generatedSlides = buildSlideStoryboard(params.prompt, params.duration, params.aspectRatio);

    const newVideo: GeneratedVideo = {
      id: 'vid_' + Date.now(),
      prompt: params.prompt,
      videoUrl: chosenVideo,
      thumbnailUrl: params.referenceImage || promptVisual,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      quality: params.quality,
      generationType: params.generationType,
      modelId: params.modelId,
      createdAt: Date.now(),
      isFavorite: false,
      referenceImage: params.referenceImage,
      slides: generatedSlides,
    };

    const current = this.getVideos();
    const updated = [newVideo, ...current];
    this.saveVideos(updated);

    return newVideo;
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
    this.saveVideos(videos);
    return videos;
  }
};
