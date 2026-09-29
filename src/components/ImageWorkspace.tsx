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
  Palette,
  FileText,
  UserCheck,
  Clock,
  ScanLine,
  ArrowRight,
  Paperclip,
  Clipboard
} from 'lucide-react';
import { 
  GeneratedImage, 
  ImageAspectRatio, 
  ImageStyle, 
  ForgeXModelId, 
  ForgeXTheme, 
  FORGEX_MODELS,
  VisionAnalysisResult
} from '../types';
import { imageService } from '../services/imageService';
import { puterService, PUTER_FLUX_CONFIG } from '../services/puterService';
import { ModelSelector } from './ModelSelector';

interface ImageWorkspaceProps {
  images: GeneratedImage[];
  onUpdateImages: (images: GeneratedImage[]) => void;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  onViewFullscreen: (image: GeneratedImage) => void;
}

type StudioTool = 
  | 'text2img' 
  | 'img2img' 
  | 'ageProgression' 
  | 'removeObj' 
  | 'visionOcr' 
  | 'inpaint' 
  | 'removeBg' 
  | 'upscale' 
  | 'transform';

const ASPECT_RATIOS: ImageAspectRatio[] = ['1:1', '16:9', '9:16', '4:3'];
const IMAGE_COUNTS: number[] = [1, 2, 4];
const STYLES: ImageStyle[] = [
  'None',
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
  const [imageCount, setImageCount] = useState<number>(1);
  const [style, setStyle] = useState<ImageStyle>('None');
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(24);
  const [objectToRemove, setObjectToRemove] = useState<string>('one person');
  const [targetAge, setTargetAge] = useState<number>(20);
  const [visionResult, setVisionResult] = useState<VisionAnalysisResult | null>(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [ocrMode, setOcrMode] = useState<'edit' | 'create'>('edit');
  const [ocrCopied, setOcrCopied] = useState(false);
  const [selectedFluxModel, setSelectedFluxModel] = useState<string>(() => puterService.getDefaultFluxModel());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [puterUser, setPuterUser] = useState<any>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pasteNotification, setPasteNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = theme === 'dark';
  const currentModel = FORGEX_MODELS.find((m) => m.id === selectedModelId) || FORGEX_MODELS[4];
  const activeFluxModelInfo = PUTER_FLUX_CONFIG.availableModels.find((m) => m.id === selectedFluxModel) || PUTER_FLUX_CONFIG.availableModels[0];

  const checkPuterAuth = async () => {
    try {
      const user = await puterService.getUser();
      setPuterUser(user);
    } catch {
      setPuterUser(null);
    }
  };

  useEffect(() => {
    // Eagerly initialize Puter SDK and check authentication status
    puterService.init().then(() => {
      checkPuterAuth();
    }).catch((err) => {
      console.warn('Puter SDK background init notice:', err);
    });
  }, []);

  const handlePuterAuth = async () => {
    try {
      setErrorMessage(null);
      if (puterService.isSignedIn()) {
        await puterService.signOut();
        setPuterUser(null);
      } else {
        await puterService.signIn();
        await checkPuterAuth();
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err || '');
      if (!msg.includes('closed') && !msg.includes('cancel')) {
        setErrorMessage(`Puter authentication: ${msg}`);
      }
    }
  };

  const handleAnalyzeVision = async (customInstruction?: string) => {
    if (!referenceImage) {
      fileInputRef.current?.click();
      return;
    }
    setIsAnalyzingVision(true);
    setErrorMessage(null);
    try {
      const res = await imageService.analyzeImageWithVision(referenceImage, customInstruction || prompt);
      if (res) {
        setVisionResult(res);
        if (res.intent) {
          setOcrMode(res.intent);
        }
        if (res.ocrText && (!prompt || prompt.trim() === '')) {
          setPrompt(`Recreate image preserving text: "${res.ocrText.slice(0, 100)}"`);
        }
      }
    } catch (err: any) {
      console.warn('Vision analysis failed:', err);
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const handleSetAgeProgression = (age = 20) => {
    setTargetAge(age);
    setActiveStudioTool('ageProgression');
    setPrompt(`Generate the same image on how he/she will look like at ${age}, preserving identical facial landmarks, bone structure, eye shape, and ethnic identity with adult facial maturity.`);
    if (referenceImage && !visionResult) {
      handleAnalyzeVision(`How will the person in this image look like at ${age}`);
    }
  };

  const handleSetRemovePerson = (which = 'one person') => {
    setActiveStudioTool('removeObj');
    setObjectToRemove(which);
    setPrompt(`Remove ${which} from this image, keeping only the primary subject with seamless natural background inpainting.`);
    if (referenceImage && !visionResult) {
      handleAnalyzeVision(`Remove ${which} from this image and inpaint background`);
    }
  };

  const handleSetVisionOcr = () => {
    setActiveStudioTool('visionOcr');
    if (referenceImage) {
      handleAnalyzeVision('Extract all text via Vision OCR');
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    let cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      if (activeStudioTool === 'ageProgression') {
        cleanPrompt = `Generate the same image on how he/she will look like at ${targetAge}, preserving identical facial landmarks, bone structure, eye shape, and ethnic identity with adult maturity.`;
      } else if (activeStudioTool === 'removeObj') {
        cleanPrompt = `Remove ${objectToRemove || 'one person'} from this image, keeping only the remaining subject with seamless natural infilled background.`;
      } else if (activeStudioTool === 'visionOcr') {
        cleanPrompt = visionResult?.ocrText
          ? `Recreate image with the extracted text: "${visionResult.ocrText}"`
          : 'Extract text via Vision OCR and recreate with clean typography';
      } else if (activeStudioTool === 'removeBg') {
        cleanPrompt = 'Isolate foreground subject against transparent studio background, sharp cutout edges';
      } else if (activeStudioTool === 'upscale') {
        cleanPrompt = 'Enhance photorealistic micro-details, 8K ultra-clarity HDR upscale';
      } else {
        cleanPrompt = 'A surreal futuristic monolith radiating amber thunder energy across dark mirror dunes, 8k cinematic masterpiece';
      }
    } else {
      if (activeStudioTool === 'ageProgression' && !cleanPrompt.toLowerCase().includes('age') && !cleanPrompt.toLowerCase().includes(String(targetAge))) {
        cleanPrompt = `${cleanPrompt}, aged to ${targetAge} years old, preserving facial bone structure and identity`;
      } else if (activeStudioTool === 'removeObj' && !cleanPrompt.toLowerCase().includes('remove')) {
        cleanPrompt = `Remove ${objectToRemove || 'one person'}: ${cleanPrompt}`;
      } else if (activeStudioTool === 'removeBg') {
        cleanPrompt = `Clean foreground cutout, removed background: ${cleanPrompt}`;
      } else if (activeStudioTool === 'upscale') {
        cleanPrompt = `8K high-resolution remaster: ${cleanPrompt}`;
      }
    }

    setIsGenerating(true);
    try {
      const newImages = await imageService.generateImages({
        prompt: cleanPrompt,
        originalInstruction: prompt || cleanPrompt,
        aspectRatio,
        count: imageCount,
        style,
        modelId: selectedModelId,
        referenceImage: referenceImage || undefined,
        fluxModel: selectedFluxModel,
        ocrMode: referenceImage ? ocrMode : undefined,
      });
      onUpdateImages(imageService.getImages());
      checkPuterAuth();
    } catch (err: any) {
      console.error('Image generation failed', err);
      setErrorMessage(err instanceof Error ? err.message : String(err || 'Failed to generate image'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = imageService.toggleFavorite(id);
    onUpdateImages(updated);
  };

  const handleDownload = async (img: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (img.imageUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = img.imageUrl;
        a.download = `forgex-flux-${img.style.toLowerCase()}-${img.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const res = await fetch(img.imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `forgex-flux-${img.style.toLowerCase()}-${img.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      const a = document.createElement('a');
      a.href = img.imageUrl;
      a.target = '_blank';
      a.download = `forgex-flux-${img.style.toLowerCase()}-${img.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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

  const handleSetNewReferenceImage = (dataUrl: string, sourceName = 'Image') => {
    setReferenceImage(dataUrl);
    setVisionResult(null);
    if (activeStudioTool === 'text2img') {
      setActiveStudioTool('img2img');
    }
    setPasteNotification(`${sourceName} attached! Gemini Vision OCR & analysis running...`);
    setTimeout(() => setPasteNotification(null), 4000);

    // Auto-analyze with Gemini Vision OCR & Subject Intelligence
    setIsAnalyzingVision(true);
    imageService
      .analyzeImageWithVision(dataUrl, prompt || 'Inspect image, extract all visible text via Vision OCR, and identify subjects')
      .then((res) => {
        if (res) {
          setVisionResult(res);
          if (res.intent) {
            setOcrMode(res.intent);
          }
          if (res.ocrText && (!prompt || prompt.trim() === '')) {
            setPrompt(`Recreate image preserving text: "${res.ocrText.slice(0, 100)}"`);
          }
        }
      })
      .catch((err) => {
        console.warn('Auto vision analysis notice:', err);
      })
      .finally(() => {
        setIsAnalyzingVision(false);
      });
  };

  const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleSetNewReferenceImage(event.target.result as string, file.name || 'Image');
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePasteImage = (e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = (e as any).clipboardData;
    if (!clipboardData) return;

    let handled = false;
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handled = true;
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                handleSetNewReferenceImage(ev.target.result as string, 'Pasted clipboard image');
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    }

    if (!handled && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith('image/')) {
          handled = true;
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              handleSetNewReferenceImage(ev.target.result as string, file.name || 'Pasted image');
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && (navigator.clipboard as any).read) {
        const items = await (navigator.clipboard as any).read();
        for (const item of items) {
          const imageType = item.types.find((t: string) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                handleSetNewReferenceImage(ev.target.result as string, 'Pasted clipboard image');
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      setPasteNotification('Press Ctrl+V (or Cmd+V) to paste an image from your clipboard');
      setTimeout(() => setPasteNotification(null), 3500);
    } catch {
      setPasteNotification('Press Ctrl+V (or Cmd+V) to paste an image from your clipboard');
      setTimeout(() => setPasteNotification(null), 3500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              handleSetNewReferenceImage(ev.target.result as string, file.name || 'Dropped image');
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Global paste listener: captures image pasted anywhere within the Studio
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        let hasImage = false;
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          if (e.clipboardData.items[i].type.startsWith('image/')) {
            hasImage = true;
            break;
          }
        }
        if (hasImage) {
          handlePasteImage(e);
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [prompt, activeStudioTool]);

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

            {/* Model & FLUX Selector & Puter Auth */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Puter Browser Auth Flow Button */}
              <button
                type="button"
                id="btn-puter-auth"
                onClick={handlePuterAuth}
                className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all font-medium ${
                  puterUser
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-amber-500/50 hover:text-amber-400'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-amber-500/50 hover:text-amber-700'
                }`}
                title={puterUser ? `Signed in to Puter as @${puterUser.username || 'user'}. Click to sign out.` : 'Authenticate with Puter for Black Forest Labs FLUX generation.'}
              >
                <div className={`w-2 h-2 rounded-full ${puterUser ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400/80'}`} />
                <span>{puterUser ? `@${puterUser.username || 'Puter'}` : 'Puter Sign In'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Engine:</span>
                <select
                  id="select-flux-model"
                  value={selectedFluxModel}
                  onChange={(e) => setSelectedFluxModel(e.target.value)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold outline-none transition-all cursor-pointer ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-amber-400 focus:border-amber-500'
                      : 'bg-neutral-50 border-neutral-200 text-amber-700 focus:border-amber-500'
                  }`}
                  title="Black Forest Labs FLUX image-generation model via Puter"
                >
                  {PUTER_FLUX_CONFIG.availableModels.map((m) => (
                    <option key={m.id} value={m.id} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                      {m.name} ({m.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Model:</span>
                <ModelSelector
                  selectedModelId={selectedModelId}
                  onSelectModel={onSelectModel}
                  theme={theme}
                  useShortName={true}
                />
              </div>
            </div>
          </div>

          {/* Graceful Error Notification Banner */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 rounded-lg hover:bg-red-500/20 text-red-300 transition-colors"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Studio Tool Selection Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {[
              { id: 'text2img', label: 'Text to Image', icon: Sparkles },
              { id: 'img2img', label: 'Image to Image', icon: Wand2 },
              { id: 'ageProgression', label: 'Age Progression (At 20)', icon: Clock },
              { id: 'removeObj', label: 'Remove Person / Object', icon: Eraser },
              { id: 'visionOcr', label: 'Vision OCR & Recreate', icon: ScanLine },
              { id: 'removeBg', label: 'Remove Background', icon: Scissors },
              { id: 'inpaint', label: 'Inpaint / Edit', icon: Edit3 },
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
                    if ((tool.id === 'img2img' || tool.id === 'ageProgression' || tool.id === 'removeObj' || tool.id === 'visionOcr') && !referenceImage) {
                      fileInputRef.current?.click();
                    }
                    if (tool.id === 'ageProgression') {
                      handleSetAgeProgression(targetAge);
                    } else if (tool.id === 'removeObj') {
                      handleSetRemovePerson(objectToRemove);
                    } else if (tool.id === 'visionOcr') {
                      handleSetVisionOcr();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
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

          {/* Contextual tool controls: Age Progression */}
          {activeStudioTool === 'ageProgression' && (
            <div className="mb-4 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2.5 text-xs animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Age Progression (e.g. How will he look like at 20):
                </span>
                <span className="font-mono text-amber-300 font-bold text-sm">Target Age: {targetAge} Years Old</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[12, 16, 18, 20, 25, 30, 40, 50, 60].map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => handleSetAgeProgression(age)}
                    className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                      targetAge === age
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : isDark
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:text-black'
                    }`}
                  >
                    Age {age}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Gemini Vision AI inspects facial bone structure, ethnic traits, eye shape, and landmarks from your reference image, accurately synthesizing how the individual will look aged to {targetAge}.
              </p>
            </div>
          )}

          {/* Contextual tool controls: Remove Person / Object */}
          {activeStudioTool === 'removeObj' && (
            <div className="mb-4 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2.5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Eraser className="w-4 h-4" />
                  Subject Removal & Inpainting:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  'one person',
                  'person on left',
                  'person on right',
                  'second person',
                  'background people',
                  'unwanted objects',
                ].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleSetRemovePerson(choice)}
                    className={`px-2.5 py-1 rounded-lg border font-semibold capitalize transition-all ${
                      objectToRemove === choice
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : isDark
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:text-black'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Custom target to erase (e.g. 'the person standing next to him', 'sunglasses', 'watermark')..."
                  value={objectToRemove}
                  onChange={(e) => {
                    setObjectToRemove(e.target.value);
                    setPrompt(`Remove ${e.target.value || 'one person'} from this image, keeping only the remaining subject with seamless infilled background.`);
                  }}
                  className={`w-full text-xs px-3 py-1.5 rounded-xl border outline-none ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-amber-500'
                      : 'bg-white border-neutral-200 text-neutral-900 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Contextual tool controls: Vision OCR & Text Recreation */}
          {activeStudioTool === 'visionOcr' && (
            <div className="mb-4 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2.5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4" />
                  Vision OCR & Text Extraction:
                </span>
                {referenceImage && (
                  <button
                    type="button"
                    disabled={isAnalyzingVision}
                    onClick={() => handleAnalyzeVision('Extract all text via Vision OCR')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold flex items-center gap-1 hover:bg-amber-400 cursor-pointer"
                  >
                    {isAnalyzingVision ? (
                      <>
                        <div className="w-3 h-3 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                        <span>Scanning Text...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Scan Text (OCR)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {visionResult?.ocrText ? (
                <div className={`p-2.5 rounded-xl border font-mono text-xs flex flex-col gap-1.5 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-500 text-[11px]">Transcribed OCR Content:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(visionResult.ocrText);
                        setOcrCopied(true);
                        setTimeout(() => setOcrCopied(false), 2000);
                      }}
                      className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                    >
                      {ocrCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{ocrCopied ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap select-all max-h-28 overflow-y-auto">{visionResult.ocrText}</p>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400">
                  Upload an image with text, signs, logos, or typography. ForgeX Vision OCR reads every word with sub-pixel precision and incorporates it into your prompt.
                </p>
              )}
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

          {/* Reference Image Vision AI & OCR Smart Inspector Bar */}
          {referenceImage && (
            <div className={`mb-5 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border flex flex-col gap-3.5 transition-all shadow-md ${
              isDark ? 'bg-neutral-950/90 border-amber-500/30 shadow-black/40' : 'bg-amber-50/80 border-amber-200 shadow-amber-500/5'
            }`}>
              {/* Header: Photo info, Vision OCR badge & Controls */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <img src={referenceImage} alt="Ref" className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover border-2 border-amber-500/50 shadow-md group-hover:scale-105 transition-transform" />
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-neutral-950 shadow">
                      <ScanLine className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                        <ScanLine className="w-4 h-4 text-amber-500" />
                        Vision OCR Active
                      </span>
                      {isAnalyzingVision ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold animate-pulse flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          Scanning Text...
                        </span>
                      ) : visionResult?.hasText ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                          ✓ Text Read ({visionResult.ocrText.length} chars)
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold">
                          Vision AI Ready
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      Read attached image to edit text/scene or create a brand-new image according to prompt
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isAnalyzingVision}
                    onClick={() => handleAnalyzeVision()}
                    title="Deep re-inspect image with Gemini Vision AI & OCR"
                    className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isAnalyzingVision ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Scanning...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Re-Scan OCR</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImage(null);
                      setVisionResult(null);
                    }}
                    className="p-1.5 rounded-xl hover:bg-neutral-500/20 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Remove attached image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Toggle: Read & Edit vs Read & Create New */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-neutral-900/60 dark:bg-neutral-900/80 border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setOcrMode('edit')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ocrMode === 'edit'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Read & Edit Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOcrMode('create')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ocrMode === 'create'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Read & Create New</span>
                </button>
              </div>

              <div className="text-[11px] text-neutral-400 px-1 -mt-1">
                {ocrMode === 'edit' ? (
                  <span>🎨 <strong>Read & Edit Mode:</strong> Reads the text & elements in the attached image and applies your edit prompt (change text, inpaint, alter subjects, restyle).</span>
                ) : (
                  <span>✨ <strong>Read & Create Mode:</strong> Reads the text & theme in the attached image and generates a brand-new image composition inspired by or featuring the OCR text.</span>
                )}
              </div>

              {/* Vision OCR Transcribed Text Hub */}
              {visionResult && (
                <div className={`p-3 rounded-2xl border text-xs flex flex-col gap-2.5 ${
                  isDark ? 'bg-neutral-900/95 border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
                }`}>
                  {visionResult.ocrText ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-500 text-xs flex items-center gap-1.5">
                          <ScanLine className="w-3.5 h-3.5" />
                          Extracted Vision OCR Text:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(visionResult.ocrText);
                              setOcrCopied(true);
                              setTimeout(() => setOcrCopied(false), 2000);
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {ocrCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{ocrCopied ? 'Copied' : 'Copy Text'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Transcribed text box */}
                      <div className={`p-2.5 rounded-xl font-mono text-xs max-h-28 overflow-y-auto select-all whitespace-pre-wrap leading-relaxed border ${
                        isDark ? 'bg-black/60 border-neutral-800 text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                      }`}>
                        "{visionResult.ocrText}"
                      </div>

                      {/* OCR Prompt Quick Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-neutral-400 mr-1">Use with Prompt:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPrompt((prev) => (prev ? `${prev}, with text: "${visionResult.ocrText}"` : `Recreate image with text: "${visionResult.ocrText}"`));
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span>+ Insert in Prompt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOcrMode('edit');
                            setPrompt(`Change the text in the image from "${visionResult.ocrText.slice(0, 32)}" to "FORGEX"`);
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Replace Text to...</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrompt(`Recreate this image with razor-sharp clean typography: "${visionResult.ocrText}"`);
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Recreate with Typography</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400 flex items-center gap-2">
                      <ScanLine className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>No text detected in this image. Vision AI has analyzed the visual scene, objects, and lighting for editing or recreation according to your prompt.</span>
                    </div>
                  )}

                  {/* Detected Text Elements */}
                  {visionResult.ocrElements && visionResult.ocrElements.length > 0 && (
                    <div className="pt-1 border-t border-neutral-800/80">
                      <span className="font-semibold text-amber-500 text-[11px] block mb-1">Detected Text Elements:</span>
                      <div className="flex flex-wrap gap-1">
                        {visionResult.ocrElements.map((elem, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-neutral-800 text-amber-300 border border-neutral-700">
                            {elem}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detected Subjects & Scene */}
                  {visionResult.subjectsDetected && visionResult.subjectsDetected.length > 0 && (
                    <div className="pt-1 border-t border-neutral-800/80">
                      <span className="font-semibold text-amber-500 text-[11px] block mb-1">Subjects & Scene Detected:</span>
                      <div className="flex flex-wrap gap-1">
                        {visionResult.subjectsDetected.map((sub, idx) => (
                          <span key={idx} className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vision AI Explanation */}
                  {visionResult.explanation && (
                    <p className="text-[11px] text-neutral-400 leading-relaxed italic border-t border-neutral-800/80 pt-1.5">
                      💡 {visionResult.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Action Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-500/15">
                <span className="text-[11px] text-neutral-500 font-medium mr-1">Quick Actions:</span>
                <button
                  type="button"
                  onClick={() => handleSetAgeProgression(20)}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeStudioTool === 'ageProgression'
                      ? 'bg-amber-500 text-neutral-950 border-amber-500'
                      : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-amber-300 hover:border-amber-500'
                      : 'bg-white border-neutral-200 text-amber-700 hover:border-amber-500'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Age to 20</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetRemovePerson('one person')}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeStudioTool === 'removeObj'
                      ? 'bg-amber-500 text-neutral-950 border-amber-500'
                      : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-amber-300 hover:border-amber-500'
                      : 'bg-white border-neutral-200 text-amber-700 hover:border-amber-500'
                  }`}
                >
                  <Eraser className="w-3 h-3" />
                  <span>Remove One Person</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetVisionOcr()}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeStudioTool === 'visionOcr'
                      ? 'bg-amber-500 text-neutral-950 border-amber-500'
                      : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-amber-300 hover:border-amber-500'
                      : 'bg-white border-neutral-200 text-amber-700 hover:border-amber-500'
                  }`}
                >
                  <ScanLine className="w-3 h-3" />
                  <span>Scan Text (OCR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveStudioTool('removeBg');
                    setPrompt('Isolate foreground subject against transparent studio background, sharp cutout edges');
                  }}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeStudioTool === 'removeBg'
                      ? 'bg-amber-500 text-neutral-950 border-amber-500'
                      : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-amber-300 hover:border-amber-500'
                      : 'bg-white border-neutral-200 text-amber-700 hover:border-amber-500'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>Cutout / Remove BG</span>
                </button>
              </div>
            </div>
          )}

          {/* Notification banner for paste or attach actions */}
          {pasteNotification && (
            <div className="mb-3 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                <span>{pasteNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setPasteNotification(null)}
                className="hover:text-amber-200 text-neutral-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Large Prompt Box with Paste, Attach & Drag-and-Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative mb-5 rounded-2xl border transition-all ${
              isDraggingOver
                ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                : isDark
                ? 'bg-neutral-950 border-neutral-800 focus-within:border-amber-500'
                : 'bg-neutral-50 border-neutral-200 focus-within:border-amber-500'
            }`}
          >
            {isDraggingOver && (
              <div className="absolute inset-0 z-20 rounded-2xl bg-amber-500/20 backdrop-blur-[2px] border-2 border-dashed border-amber-500 flex flex-col items-center justify-center pointer-events-none">
                <Upload className="w-8 h-8 text-amber-400 animate-bounce mb-1" />
                <span className="text-xs font-bold text-amber-300">Drop image here to attach & run Vision OCR</span>
              </div>
            )}

            {/* Prompt textarea */}
            <textarea
              id="image-prompt-textarea"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePasteImage}
              placeholder="Describe the image to create or transform (e.g. 'how will he looklike at 20', 'remove one person', 'extract text & recreate')... Tip: You can also paste any image (Ctrl+V) or drop it here!"
              className={`w-full p-4 pb-2 bg-transparent text-sm leading-relaxed outline-none resize-none transition-all ${
                isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'
              }`}
            />

            {/* Bottom Actions Bar inside Prompt Box */}
            <div className={`px-3 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
              isDark ? 'border-neutral-800/80 bg-neutral-950/60' : 'border-neutral-200/80 bg-neutral-100/60'
            }`}>
              {/* Left: Attach & Paste Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload an image from your device"
                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                    referenceImage
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : isDark
                      ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-amber-500/50 hover:text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-500/50 hover:text-neutral-900'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5 text-amber-500" />
                  <span>{referenceImage ? 'Change Image' : 'Attach Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteButtonClick}
                  title="Paste image directly from clipboard (or press Ctrl+V / Cmd+V)"
                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                    isDark
                      ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-amber-500/50 hover:text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-500/50 hover:text-neutral-900'
                  }`}
                >
                  <Clipboard className="w-3.5 h-3.5 text-amber-500" />
                  <span>Paste Image</span>
                </button>

                <span className="hidden sm:inline text-[11px] text-neutral-500">
                  (Or press Ctrl+V / Cmd+V to paste)
                </span>
              </div>

              {/* Right: Quick clear or reference indicator */}
              <div className="flex items-center gap-2">
                {referenceImage && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-emerald-400 font-medium">Image Loaded</span>
                  </div>
                )}
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                  >
                    Clear text
                  </button>
                )}
              </div>
            </div>
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
                  {st === 'None' ? 'Exact Prompt (Raw)' : st}
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
                  <span>Synthesizing Image...</span>
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
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 max-w-[70%]">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10">
                        {img.style}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold shadow-sm">
                        {img.engine?.includes('FLUX') ? 'FLUX' : modelMeta.badge}
                      </span>
                      {img.ocrText && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/90 text-white font-bold flex items-center gap-1 shadow-sm border border-emerald-400/40" title={`Vision OCR: ${img.ocrText}`}>
                          <ScanLine className="w-2.5 h-2.5" />
                          <span>OCR</span>
                        </span>
                      )}
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

                    {img.ocrText && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-500 dark:text-amber-400 flex items-center justify-between gap-1.5" title={`OCR: ${img.ocrText}`}>
                        <div className="flex items-center gap-1.5 truncate">
                          <ScanLine className="w-3 h-3 shrink-0" />
                          <span className="truncate">OCR: {img.ocrText}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(img.ocrText || '');
                            setCopiedId(img.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="p-1 hover:text-amber-300 text-neutral-400 shrink-0 cursor-pointer transition-colors"
                          title="Copy OCR Text"
                        >
                          {copiedId === img.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 text-[11px] text-neutral-500">
                      <span className="text-amber-500/90 font-medium truncate max-w-[170px]" title={img.engine || "Black Forest Labs FLUX"}>
                        {img.engine || 'Black Forest Labs FLUX'}
                      </span>
                      <span>Ratio {img.aspectRatio}</span>
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
