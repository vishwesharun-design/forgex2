import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Sparkles, 
  Download, 
  Maximize2, 
  Copy, 
  Edit3, 
  Bookmark, 
  Heart, 
  SlidersHorizontal, 
  X, 
  Upload, 
  Layers,
  Check,
  Image as ImageIcon,
  Trash2,
  Wand2,
  Scissors,
  Eraser,
  RefreshCw,
  Palette
} from 'lucide-react';
import { 
  GeneratedImage, 
  ImageAspectRatio, 
  ImageStyle, 
  ForgeXModelId, 
  ForgeXTheme, 
  FORGEX_MODELS 
} from '../types';
import { imageService } from '../services/imageService';
import { ModelSelector } from './ModelSelector';

interface ImageWorkspaceProps {
  images: GeneratedImage[];
  onUpdateImages: (images: GeneratedImage[]) => void;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  onViewFullscreen: (image: GeneratedImage) => void;
}

type StudioTool = 'text2img' | 'img2img' | 'inpaint' | 'removeBg' | 'removeObj' | 'upscale' | 'transform';

const ASPECT_RATIOS: ImageAspectRatio[] = ['1:1', '16:9', '9:16', '4:3'];
const IMAGE_COUNTS: number[] = [1, 2, 4];
const STYLES: ImageStyle[] = [
  'Realistic',
  'Cinematic',
  'Anime',
  '3D',
  'Illustration',
  'Minimal',
  'Custom'
];

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  images,
  onUpdateImages,
  selectedModelId,
  onSelectModel,
  theme,
  onViewFullscreen,
}) => {
  const [activeStudioTool, setActiveStudioTool] = useState<StudioTool>('text2img');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('16:9');
  const [imageCount, setImageCount] = useState<number>(2);
  const [style, setStyle] = useState<ImageStyle>('Cinematic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(24);
  const [objectToRemove, setObjectToRemove] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = theme === 'dark';
  const currentModel = FORGEX_MODELS.find((m) => m.id === selectedModelId) || FORGEX_MODELS[4];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      if (activeStudioTool === 'removeBg') cleanPrompt = 'Isolate foreground subject against transparent studio background, sharp cutout edges';
      else if (activeStudioTool === 'upscale') cleanPrompt = 'Enhance photorealistic micro-details, 8K ultra-clarity HDR upscale';
      else if (activeStudioTool === 'removeObj') cleanPrompt = `Remove ${objectToRemove || 'unwanted background elements'}, natural seamless infill`;
      else cleanPrompt = 'A surreal futuristic monolith radiating amber thunder energy across dark mirror dunes, 8k cinematic masterpiece';
    }

    if (activeStudioTool === 'removeBg') {
      cleanPrompt = `Clean foreground cutout, removed background: ${cleanPrompt}`;
    } else if (activeStudioTool === 'upscale') {
      cleanPrompt = `8K high-resolution remaster: ${cleanPrompt}`;
    } else if (activeStudioTool === 'removeObj' && objectToRemove) {
      cleanPrompt = `Inpainted object removal (${objectToRemove}): ${cleanPrompt}`;
    }

    setIsGenerating(true);
    try {
      const newImages = await imageService.generateImages({
        prompt: cleanPrompt,
        aspectRatio,
        count: imageCount,
        style,
        modelId: selectedModelId,
        referenceImage: referenceImage || undefined,
      });
      onUpdateImages(imageService.getImages());
    } catch (err) {
      console.error('Image generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = imageService.toggleFavorite(id);
    onUpdateImages(updated);
  };

  const handleDownload = (img: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = `forgex-${img.style.toLowerCase()}-${img.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCreateVariation = (img: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompt(`Variation of: ${img.prompt} with dynamic lighting shifts`);
    setStyle(img.style);
    setAspectRatio(img.aspectRatio);
    setReferenceImage(img.imageUrl);
  };

  const handleEdit = (img: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompt(img.prompt);
    setStyle(img.style);
    setAspectRatio(img.aspectRatio);
  };

  const handleUseAsReference = (img: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setReferenceImage(img.imageUrl);
  };

  const handleDeleteImage = (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = imageService.deleteImage(imgId);
    onUpdateImages(updated);
  };

  const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReferenceImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleUploadReference}
      />

      <div className="max-w-6xl w-full mx-auto space-y-6 sm:space-y-8 pb-16 md:pb-8">
        {/* Top Control Panel */}
        <div
          id="image-studio-controls"
          className={`p-4 sm:p-7 rounded-2xl sm:rounded-3xl border shadow-xl transition-all ${
            isDark
              ? 'bg-neutral-900/90 border-neutral-800 shadow-black/40'
              : 'bg-white border-neutral-200 shadow-neutral-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-xl">Image Studio</h2>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Model:</span>
              <ModelSelector
                selectedModelId={selectedModelId}
                onSelectModel={onSelectModel}
                theme={theme}
                useShortName={true}
              />
            </div>
          </div>

          {/* Studio Tool Selection Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {[
              { id: 'text2img', label: 'Text to Image', icon: Sparkles },
              { id: 'img2img', label: 'Image to Image', icon: Wand2 },
              { id: 'inpaint', label: 'Inpaint / Edit', icon: Edit3 },
              { id: 'removeBg', label: 'Remove Background', icon: Scissors },
              { id: 'removeObj', label: 'Remove Object', icon: Eraser },
              { id: 'upscale', label: 'Upscale & Enhance', icon: Zap },
              { id: 'transform', label: 'Style Transform', icon: Palette },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeStudioTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveStudioTool(tool.id as StudioTool);
                    if (tool.id === 'img2img' && !referenceImage) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : isDark
                      ? 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-neutral-100 border border-neutral-200 text-neutral-700 hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Contextual tool controls if removeObj or inpaint */}
          {activeStudioTool === 'removeObj' && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
              <Eraser className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                placeholder="Name or describe the object to erase / remove (e.g. 'watermark', 'person on left', 'telephone pole')..."
                value={objectToRemove}
                onChange={(e) => setObjectToRemove(e.target.value)}
                className={`w-full text-xs bg-transparent border-none focus:outline-none ${isDark ? 'text-white' : 'text-neutral-900'}`}
              />
            </div>
          )}

          {activeStudioTool === 'inpaint' && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3 text-xs">
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                Prompt & Brush Edit:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Brush Radius:</span>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="font-mono text-neutral-300">{brushSize}px</span>
              </div>
            </div>
          )}

          {/* Large Prompt Box as specified in Section 13 */}
          <div className="relative mb-5">
            <textarea
              id="image-prompt-textarea"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className={`w-full p-4 rounded-2xl border text-sm leading-relaxed outline-none transition-all resize-none ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 focus:border-amber-500 text-white placeholder:text-neutral-500'
                  : 'bg-neutral-50 border-neutral-200 focus:border-amber-500 text-neutral-900 placeholder:text-neutral-400'
              }`}
            />

            {referenceImage && (
              <div className="absolute right-3 bottom-3 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs text-amber-400">
                <img src={referenceImage} alt="Ref" className="w-4 h-4 rounded object-cover" />
                <span>Reference active</span>
                <button onClick={() => setReferenceImage(null)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Control Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Aspect Ratio (Section 13) */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    id={`btn-ratio-${ratio.replace(':', '-')}`}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      aspectRatio === ratio
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                        : isDark
                          ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Images (Section 13) */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Number of Images
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {IMAGE_COUNTS.map((count) => (
                  <button
                    key={count}
                    id={`btn-count-${count}`}
                    type="button"
                    onClick={() => setImageCount(count)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      imageCount === count
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                        : isDark
                          ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    {count} {count === 1 ? 'image' : 'images'}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Image Button */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Reference Asset
              </label>
              <button
                id="btn-upload-reference-img"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  referenceImage
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : isDark
                      ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{referenceImage ? 'Change Reference Image' : 'Upload Reference'}</span>
              </button>
            </div>
          </div>

          {/* Style Selector (Section 13) */}
          <div className="mb-6">
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((st) => (
                <button
                  key={st}
                  id={`btn-style-${st.toLowerCase()}`}
                  type="button"
                  onClick={() => setStyle(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    style === st
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                      : isDark
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Main Button: Generate Image (Section 13) */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="btn-generate-image"
              type="button"
              disabled={isGenerating}
              onClick={() => handleGenerate()}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing ({currentModel.badge})...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-neutral-950" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Responsive Gallery (Section 13) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-lg">Generated Creations</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono">
                {images.length}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Click an image to inspect, download or iterate
            </p>
          </div>

          {images.length === 0 ? (
            <div className={`py-12 px-6 rounded-3xl border text-center ${
              isDark ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
            }`}>
              <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-500" />
              <p className="font-semibold text-sm mb-1">No images generated yet</p>
              <p className="text-xs max-w-sm mx-auto text-neutral-500">
                Enter your creative prompt above and click "Generate Image" to synthesize your vision.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((img) => {
                const modelMeta = FORGEX_MODELS.find((m) => m.id === img.modelId) || FORGEX_MODELS[4];
                return (
                  <div
                    key={img.id}
                    id={`image-card-${img.id}`}
                    onClick={() => onViewFullscreen(img)}
                    className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-1 ${
                      isDark
                        ? 'bg-neutral-900 border-neutral-800/90 hover:border-amber-500/40 shadow-black/50'
                        : 'bg-white border-neutral-200 hover:border-amber-400 shadow-neutral-200'
                    }`}
                  >
                  {/* Image Container with dynamic aspect ratio */}
                  <div className="relative w-full aspect-video bg-neutral-950 overflow-hidden">
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop') {
                          target.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient overlay for actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 flex flex-col justify-between" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10">
                        {img.style}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/80 text-neutral-950 font-bold">
                        {modelMeta.badge}
                      </span>
                    </div>

                    {/* Top Right: Favorite & Delete */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <button
                        onClick={(e) => handleToggleFavorite(img.id, e)}
                        title="Toggle favorite"
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          img.isFavorite
                            ? 'bg-red-500/90 text-white'
                            : 'bg-black/60 text-white/80 hover:text-red-400'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${img.isFavorite ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        id={`btn-del-img-card-${img.id}`}
                        onClick={(e) => handleDeleteImage(img.id, e)}
                        title="Delete image"
                        className="p-2 rounded-full backdrop-blur-md bg-black/60 hover:bg-red-600 text-white/80 hover:text-white transition-colors border border-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Hover Action Bar (Section 13 Actions) */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex items-center gap-1">
                        {/* Download */}
                        <button
                          onClick={(e) => handleDownload(img, e)}
                          title="Download"
                          className="p-2 rounded-xl bg-black/70 hover:bg-neutral-800 text-white border border-white/10 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Fullscreen */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewFullscreen(img);
                          }}
                          title="Fullscreen"
                          className="p-2 rounded-xl bg-black/70 hover:bg-neutral-800 text-white border border-white/10 transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Create Variation */}
                        <button
                          onClick={(e) => handleCreateVariation(img, e)}
                          title="Create Variation"
                          className="p-2 rounded-xl bg-black/70 hover:bg-neutral-800 text-white border border-white/10 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={(e) => handleEdit(img, e)}
                          title="Edit Prompt"
                          className="p-2 rounded-xl bg-black/70 hover:bg-neutral-800 text-white border border-white/10 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Image */}
                        <button
                          id={`btn-delete-img-${img.id}`}
                          onClick={(e) => handleDeleteImage(img.id, e)}
                          title="Delete image"
                          className="p-2 rounded-xl bg-black/70 hover:bg-red-600/90 text-white/80 hover:text-white border border-white/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Use as Reference */}
                      <button
                        onClick={(e) => handleUseAsReference(img, e)}
                        title="Use as Reference"
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-neutral-950 font-semibold text-[11px] transition-colors"
                      >
                        Use Ref
                      </button>
                    </div>
                  </div>

                  {/* Card Info Details */}
                  <div className="p-4">
                    <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      {img.prompt}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-neutral-500">
                      <span>Ratio {img.aspectRatio}</span>
                      <span>{new Date(img.createdAt).toLocaleDateString()}</span>
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
