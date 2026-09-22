import React, { useState, useRef } from 'react';
import { 
  Zap, 
  Video as VideoIcon, 
  Play, 
  Pause, 
  Maximize2, 
  Download, 
  RotateCcw, 
  Copy, 
  Heart, 
  Upload, 
  X, 
  Sparkles,
  Layers,
  Trash2,
  Film,
  Plus,
  Sliders
} from 'lucide-react';
import { 
  GeneratedVideo, 
  VideoDuration, 
  VideoAspectRatio, 
  VideoQuality, 
  VideoGenerationType, 
  ForgeXModelId, 
  ForgeXTheme, 
  FORGEX_MODELS 
} from '../types';
import { videoService } from '../services/videoService';
import { ModelSelector } from './ModelSelector';
import { SlideMotionPlayer } from './SlideMotionPlayer';

interface VideoWorkspaceProps {
  videos: GeneratedVideo[];
  onUpdateVideos: (videos: GeneratedVideo[]) => void;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  onViewFullscreenVideo: (video: GeneratedVideo) => void;
}

const DURATIONS: VideoDuration[] = ['5s', '10s', '15s', '20s', '30s', '60s'];
const SLIDE_PRESETS: number[] = [2, 4, 6, 8, 12];
const ASPECT_RATIOS: VideoAspectRatio[] = ['16:9', '9:16', '1:1'];
const QUALITIES: VideoQuality[] = ['Standard', 'High'];

export const VideoWorkspace: React.FC<VideoWorkspaceProps> = ({
  videos,
  onUpdateVideos,
  selectedModelId,
  onSelectModel,
  theme,
  onViewFullscreenVideo,
}) => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<VideoDuration>('10s');
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [customDurationInput, setCustomDurationInput] = useState<string>('');
  const [slideCount, setSlideCount] = useState<number>(4);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [quality, setQuality] = useState<VideoQuality>('High');
  const [generationType, setGenerationType] = useState<VideoGenerationType>('text-to-video');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = theme === 'dark';
  const currentModel = FORGEX_MODELS.find((m) => m.id === selectedModelId) || FORGEX_MODELS[4];

  const effectiveDuration = isCustomDuration && customDurationInput.trim()
    ? (customDurationInput.trim().endsWith('s') ? customDurationInput.trim() : `${customDurationInput.trim()}s`)
    : duration;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim() || 'Cinematic aerial dolly through amber-lit cyber spires with kinetic motion physics and atmospheric volumetric haze, Unreal Engine 5 render';

    setIsGenerating(true);
    setGenerationStatus('Initiating neural video synthesis pipeline...');
    try {
      await videoService.generateVideo(
        {
          prompt: cleanPrompt,
          duration: effectiveDuration,
          aspectRatio,
          quality,
          generationType,
          modelId: selectedModelId,
          referenceImage: referenceImage || undefined,
          slideCount,
        },
        (status) => setGenerationStatus(status)
      );
      onUpdateVideos(videoService.getVideos());
    } catch (err) {
      console.error('Video generation error', err);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleAddSlide = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = videoService.addSlideToVideo(id);
    if (updated) {
      onUpdateVideos(videoService.getVideos());
    }
  };

  const handleTogglePlay = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingVideoId((prev) => (prev === id ? null : id));
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = videoService.toggleFavorite(id);
    onUpdateVideos(updated);
  };

  const handleDownload = (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = video.videoUrl;
    a.download = `forgex-video-${video.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRegenerate = async (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompt(video.prompt);
    setDuration(video.duration);
    setAspectRatio(video.aspectRatio);
    setQuality(video.quality);
    setGenerationType(video.generationType);
    if (video.referenceImage) setReferenceImage(video.referenceImage);
    setIsGenerating(true);
    await videoService.generateVideo({
      prompt: video.prompt,
      duration: video.duration,
      aspectRatio: video.aspectRatio,
      quality: video.quality,
      generationType: video.generationType,
      modelId: selectedModelId,
      referenceImage: video.referenceImage,
    });
    onUpdateVideos(videoService.getVideos());
    setIsGenerating(false);
  };

  const handleCreateVariation = (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompt(`Variation of motion: ${video.prompt}, shifting camera dolly angle`);
    setDuration(video.duration);
    setAspectRatio(video.aspectRatio);
    setQuality(video.quality);
  };

  const handleDeleteVideo = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = videoService.deleteVideo(videoId);
    onUpdateVideos(updated);
  };

  const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReferenceImage(event.target.result as string);
          setGenerationType('image-to-video');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto px-4 sm:px-8 py-6">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleUploadReference}
      />

      <div className="max-w-6xl w-full mx-auto space-y-8">
        {/* Top Video Studio Controls */}
        <div
          id="video-studio-controls"
          className={`p-5 sm:p-7 rounded-3xl border shadow-xl transition-all ${
            isDark
              ? 'bg-neutral-900/90 border-neutral-800 shadow-black/40'
              : 'bg-white border-neutral-200 shadow-neutral-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <VideoIcon className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-xl">Video Studio</h2>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Model:</span>
              <ModelSelector
                selectedModelId={selectedModelId}
                onSelectModel={onSelectModel}
                theme={theme}
              />
            </div>
          </div>

          {/* Prompt (Section 14) */}
          <div className="relative mb-5">
            <textarea
              id="video-prompt-textarea"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              className={`w-full p-4 rounded-2xl border text-sm leading-relaxed outline-none transition-all resize-none ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 focus:border-amber-500 text-white placeholder:text-neutral-500'
                  : 'bg-neutral-50 border-neutral-200 focus:border-amber-500 text-neutral-900 placeholder:text-neutral-400'
              }`}
            />

            {referenceImage && (
              <div className="absolute right-3 bottom-3 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs text-amber-400">
                <img src={referenceImage} alt="Ref" className="w-4 h-4 rounded object-cover" />
                <span>Image-to-Video mode active</span>
                <button onClick={() => setReferenceImage(null)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Generation Type: Text -> Video or Image -> Video */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Generation Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-gen-type-text"
                  type="button"
                  onClick={() => setGenerationType('text-to-video')}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                    generationType === 'text-to-video'
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                      : isDark
                        ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                  }`}
                >
                  Text → Video
                </button>
                <button
                  id="btn-gen-type-image"
                  type="button"
                  onClick={() => {
                    setGenerationType('image-to-video');
                    if (!referenceImage) fileInputRef.current?.click();
                  }}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                    generationType === 'image-to-video'
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                      : isDark
                        ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                  }`}
                >
                  Image → Video
                </button>
              </div>
            </div>

            {/* Duration (Presets + Any Custom Duration) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Duration
                </label>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  {effectiveDuration}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {DURATIONS.map((dur) => (
                  <button
                    key={dur}
                    id={`btn-dur-${dur}`}
                    type="button"
                    onClick={() => {
                      setDuration(dur);
                      setIsCustomDuration(false);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      !isCustomDuration && duration === dur
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                        : isDark
                          ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
              {/* Custom Duration Input */}
              <div className="flex items-center gap-2">
                <input
                  id="input-custom-duration"
                  type="text"
                  placeholder="Or enter any duration (e.g. 25s, 45s, 90s)..."
                  value={customDurationInput}
                  onChange={(e) => {
                    setCustomDurationInput(e.target.value);
                    setIsCustomDuration(true);
                  }}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none transition-colors ${
                    isCustomDuration && customDurationInput.trim()
                      ? 'border-amber-500 ring-1 ring-amber-500/30'
                      : isDark ? 'border-neutral-800 bg-neutral-950/80 text-white' : 'border-neutral-300 bg-white text-neutral-900'
                  }`}
                />
              </div>
            </div>

            {/* Slide Count (Presets + Stepper) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Slide Count (Storyboard Scenes)
                </label>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  {slideCount} Slides
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {SLIDE_PRESETS.map((count) => (
                  <button
                    key={count}
                    id={`btn-slide-${count}`}
                    type="button"
                    onClick={() => setSlideCount(count)}
                    className={`py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      slideCount === count
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                        : isDark
                          ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl border bg-neutral-900/40 border-neutral-800 text-xs">
                <span className={isDark ? 'text-neutral-400' : 'text-neutral-500'}>Fine-tune slide count:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSlideCount((c) => Math.max(2, c - 1))}
                    className="w-6 h-6 rounded flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white"
                  >
                    -
                  </button>
                  <span className="font-mono text-amber-400 font-bold w-5 text-center">{slideCount}</span>
                  <button
                    type="button"
                    onClick={() => setSlideCount((c) => Math.min(16, c + 1))}
                    className="w-6 h-6 rounded flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Aspect Ratio (16:9, 9:16, 1:1) */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    id={`btn-vid-ratio-${ratio.replace(':', '-')}`}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      aspectRatio === ratio
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                        : isDark
                          ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality: Standard, High */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Quality
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {QUALITIES.map((q) => (
                  <button
                    key={q}
                    id={`btn-vid-quality-${q.toLowerCase()}`}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      quality === q
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                        : isDark
                          ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Reference Image & Main Generate Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-800/40">
            <button
              id="btn-upload-video-reference"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                referenceImage
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : isDark
                    ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{referenceImage ? 'Change Reference Image' : 'Upload Reference Image'}</span>
            </button>

            <button
              id="btn-generate-video"
              type="button"
              disabled={isGenerating}
              onClick={() => handleGenerate()}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Video ({currentModel.badge})...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-neutral-950" />
                  <span>Generate Video</span>
                </>
              )}
            </button>
          </div>

          {/* Active Generation Progress Indicator */}
          {isGenerating && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="font-medium">{generationStatus || 'Synthesizing cinematic motion frames...'}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400/80">
                <span>ForgeX Neural Synthesis</span>
              </div>
            </div>
          )}
        </div>

        {/* Video Gallery Preview Cards (Section 14) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-lg">Synthesized Motion Sequences</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono">
                {videos.length}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Click play to inspect fluid motion or download sequence
            </p>
          </div>

          {videos.length === 0 ? (
            <div className={`py-12 px-6 rounded-3xl border text-center ${
              isDark ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
            }`}>
              <VideoIcon className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-500" />
              <p className="font-semibold text-sm mb-1">No videos generated yet</p>
              <p className="text-xs max-w-sm mx-auto text-neutral-500">
                Enter your creative prompt above and click "Generate Video" to synthesize dynamic motion clips.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((vid) => {
                const isPlaying = playingVideoId === vid.id;
                const modelMeta = FORGEX_MODELS.find((m) => m.id === vid.modelId) || FORGEX_MODELS[4];

                return (
                  <div
                    key={vid.id}
                    id={`video-card-${vid.id}`}
                    className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 shadow-lg ${
                      isDark
                        ? 'bg-neutral-900 border-neutral-800/90 shadow-black/50'
                        : 'bg-white border-neutral-200 shadow-neutral-200'
                    }`}
                  >
                  {/* Video Stage Container with Clean Slide Motion Player */}
                  <div className={`relative w-full ${
                    vid.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[460px]' : vid.aspectRatio === '1:1' ? 'aspect-square max-h-[380px]' : 'aspect-video'
                  } bg-black overflow-hidden flex items-center justify-center`}>
                    <SlideMotionPlayer
                      video={vid}
                      isPlaying={isPlaying}
                      onTogglePlay={() => setPlayingVideoId((prev) => (prev === vid.id ? null : vid.id))}
                      isDark={isDark}
                    />
                  </div>

                  {/* Clean Action & Details Bar Below Player */}
                  <div className="p-4 space-y-3">
                    {/* Toolbar with Badges and Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          {vid.duration} • {vid.slides?.length || vid.slideCount || 4} Slides
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          isDark ? 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                        }`}>
                          {vid.aspectRatio}
                        </span>
                      </div>

                      {/* Action Icons */}
                      <div className="flex items-center gap-1">
                        {/* Add Slide Button */}
                        <button
                          type="button"
                          onClick={(e) => handleAddSlide(vid.id, e)}
                          title="Add new scene slide to this video"
                          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                            isDark
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                          }`}
                        >
                          <Plus className="w-3 h-3 text-amber-400" />
                          <span>Add Slide</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(vid.id, e)}
                          title="Toggle favorite"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            vid.isFavorite
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : isDark
                                ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 border-neutral-700/50'
                                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-red-500 border-neutral-200'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${vid.isFavorite ? 'fill-current text-red-500' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewFullscreenVideo(vid);
                          }}
                          title="Fullscreen Player"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/50'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-200'
                          }`}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownload(vid, e)}
                          title="Download Video"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/50'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-200'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRegenerate(vid, e)}
                          title="Regenerate"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/50'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-200'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCreateVariation(vid, e)}
                          title="Create Variation"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/50'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-200'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-vid-${vid.id}`}
                          type="button"
                          onClick={(e) => handleDeleteVideo(vid.id, e)}
                          title="Delete Video"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-neutral-800/80 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 border-neutral-700/50'
                              : 'bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 border-neutral-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Prompt Text */}
                    <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      {vid.prompt}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="capitalize">{vid.generationType.replace(/-/g, ' ')}</span>
                      <span>{new Date(vid.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
