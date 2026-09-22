import React, { useState, useEffect } from 'react';
import { 
  Presentation, 
  Sparkles, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Check, 
  Layout, 
  Palette,
  Layers,
  AlertCircle
} from 'lucide-react';
import { PresentationDeck, SlideItem, ForgeXModelId, ForgeXTheme } from '../types';
import { presentationService } from '../services/presentationService';
import { ModelSelector } from './ModelSelector';

interface PresentationWorkspaceProps {
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  isDark?: boolean;
}

export const PresentationWorkspace: React.FC<PresentationWorkspaceProps> = ({
  theme,
  selectedModelId,
  onSelectModel,
}) => {
  const [decks, setDecks] = useState<PresentationDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<PresentationDeck | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [themeStyle, setThemeStyle] = useState<'dark-amber' | 'obsidian' | 'cyber-blue' | 'light-minimal'>('dark-amber');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    const list = presentationService.getDecks();
    setDecks(list);
    if (list.length > 0 && !activeDeck) {
      setActiveDeck(list[0]);
      setActiveSlideIdx(0);
    }
  }, []);

  const handleGenerate = async (targetTopic: string = topic) => {
    if (!targetTopic.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const newDeck = await presentationService.generateDeck(targetTopic.trim(), slideCount, themeStyle);
      const updated = presentationService.getDecks();
      setDecks(updated);
      setActiveDeck(newDeck);
      setActiveSlideIdx(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Presentation generation notice: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSlide = (field: keyof SlideItem, value: any) => {
    if (!activeDeck || !activeDeck.slides[activeSlideIdx]) return;
    const updatedSlides = [...activeDeck.slides];
    updatedSlides[activeSlideIdx] = {
      ...updatedSlides[activeSlideIdx],
      [field]: value,
    };
    const updatedDeck: PresentationDeck = {
      ...activeDeck,
      slides: updatedSlides,
    };
    presentationService.saveDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setDecks(presentationService.getDecks());
  };

  const handleAddSlide = () => {
    if (!activeDeck) return;
    const newSlide: SlideItem = {
      id: 'slide-' + Date.now(),
      slideNumber: activeDeck.slides.length + 1,
      title: 'New Slide Topic',
      subtitle: 'Key Supporting Concept',
      bullets: ['First strategic takeaway', 'Supporting operational detail', 'Measurable milestone'],
      keyTakeaway: 'Durable execution ensures strategic clarity.',
      visualNote: 'Visual comparison diagram with amber indicators.',
      layout: 'bullets',
    };
    const updatedDeck: PresentationDeck = {
      ...activeDeck,
      slides: [...activeDeck.slides, newSlide],
    };
    presentationService.saveDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setDecks(presentationService.getDecks());
    setActiveSlideIdx(updatedDeck.slides.length - 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (!activeDeck || activeDeck.slides.length === 0) return;
    const updatedSlides = activeDeck.slides.filter((_, i) => i !== idx);
    // renumber
    updatedSlides.forEach((s, i) => (s.slideNumber = i + 1));
    const updatedDeck = { ...activeDeck, slides: updatedSlides };
    presentationService.saveDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setDecks(presentationService.getDecks());
    setActiveSlideIdx(Math.max(0, Math.min(idx, updatedSlides.length - 1)));
  };

  const handleDeleteAllSlides = () => {
    if (!activeDeck || activeDeck.slides.length === 0) return;
    const confirmed = window.confirm(`Are you sure you want to delete all ${activeDeck.slides.length} slides in this deck?`);
    if (!confirmed) return;

    const updatedDeck: PresentationDeck = {
      ...activeDeck,
      slides: [],
    };
    presentationService.saveDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setDecks(presentationService.getDecks());
    setActiveSlideIdx(0);
  };

  const handleDeleteDeck = (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('Delete this presentation deck?');
    if (!confirmed) return;

    const updated = presentationService.deleteDeck(deckId);
    setDecks(updated);
    if (activeDeck?.id === deckId) {
      setActiveDeck(updated[0] || null);
      setActiveSlideIdx(0);
    }
  };

  const handleExport = () => {
    if (!activeDeck) return;
    presentationService.exportHTML(activeDeck);
  };

  const currentSlide = activeDeck?.slides && activeDeck.slides.length > 0 ? activeDeck.slides[activeSlideIdx] : null;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              Presentation Deck Studio
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Slide Architect
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Generate structured slide outlines and presentation decks with visual direction and HTML export.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeDeck && activeDeck.slides.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 rounded-xl border border-neutral-700 hover:border-neutral-500 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export HTML Deck</span>
            </button>
          )}
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
          />
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Generation Config & Deck Selector */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-4 border-b border-neutral-800/40 space-y-3">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Deck Generator
            </span>

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Presentation Topic</label>
              <input
                id="presentation-topic-input"
                type="text"
                placeholder="e.g. Next-Gen Autonomous Logistics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                }`}
              />
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['AI Computing 2026', 'Cybersecurity Strategy', 'Startup Pitch Deck'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTopic(sug);
                      handleGenerate(sug);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                      isDark 
                        ? 'border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/40' 
                        : 'border-neutral-200 text-neutral-600 hover:text-amber-600 hover:border-amber-400'
                    }`}
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-start justify-between gap-2">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300 font-bold">×</button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Slide Count</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                  }`}
                >
                  {[3, 4, 5, 6, 8, 10, 12].map((num) => (
                    <option key={num} value={num}>
                      {num} Slides
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Visual Theme</label>
                <select
                  value={themeStyle}
                  onChange={(e) => setThemeStyle(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                  }`}
                >
                  <option value="dark-amber">Dark Amber</option>
                  <option value="obsidian">Obsidian Minimal</option>
                  <option value="cyber-blue">Cyber Blue</option>
                  <option value="light-minimal">Light Minimal</option>
                </select>
              </div>
            </div>

            <button
              id="generate-presentation-btn"
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || !topic.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Architecting Deck...' : 'Generate Presentation'}</span>
            </button>
          </div>

          {/* Saved Decks List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Saved Decks ({decks.length})
            </span>

            {decks.length === 0 && (
              <div className="p-4 text-center text-xs text-neutral-500">
                No presentations saved yet.
              </div>
            )}

            {decks.map((deck) => {
              const isSelected = activeDeck?.id === deck.id;
              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    setActiveDeck(deck);
                    setActiveSlideIdx(0);
                  }}
                  className={`group p-3 rounded-xl border cursor-pointer transition-all relative ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : isDark
                      ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/60'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold truncate flex-1">{deck.title}</p>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDeck(deck.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-400 transition-opacity"
                      title="Delete deck"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/30 text-[10px] text-neutral-400">
                    <span>{deck.slides.length} slides</span>
                    <span>{new Date(deck.createdTime).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Slide Canvas & Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeDeck ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-6">
              <Presentation className="w-12 h-12 text-neutral-500 opacity-40" />
              <h3 className="text-sm font-bold text-neutral-300">No Presentation Deck Active</h3>
              <p className="text-xs text-neutral-500 max-w-sm">
                Enter a topic on the left to generate an AI presentation or select an existing deck from the list.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Slide Navigator Carousel Bar */}
              <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[60%]">
                  {activeDeck.slides.map((slide, idx) => (
                    <button
                      key={slide.id || idx}
                      onClick={() => setActiveSlideIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeSlideIdx === idx
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                          : isDark
                          ? 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                          : 'bg-neutral-100 border border-neutral-200 text-neutral-700 hover:text-black'
                      }`}
                    >
                      Slide {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={handleAddSlide}
                    className="p-1.5 rounded-xl border border-neutral-800 hover:border-amber-500/60 text-neutral-400 hover:text-amber-400 text-xs font-semibold shrink-0"
                    title="Add slide"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Slide navigation buttons */}
                  <button
                    onClick={() => setActiveSlideIdx((prev) => Math.max(0, prev - 1))}
                    disabled={activeSlideIdx <= 0 || activeDeck.slides.length === 0}
                    className="p-1.5 rounded-lg border border-neutral-800 disabled:opacity-30 hover:bg-neutral-850"
                    title="Previous slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono font-bold text-amber-400">
                    {activeDeck.slides.length > 0 ? `${activeSlideIdx + 1} / ${activeDeck.slides.length}` : '0 / 0'}
                  </span>

                  <button
                    onClick={() => setActiveSlideIdx((prev) => Math.min(activeDeck.slides.length - 1, prev + 1))}
                    disabled={activeDeck.slides.length === 0 || activeSlideIdx >= activeDeck.slides.length - 1}
                    className="p-1.5 rounded-lg border border-neutral-800 disabled:opacity-30 hover:bg-neutral-850"
                    title="Next slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Delete Current Slide */}
                  {activeDeck.slides.length > 0 && (
                    <button
                      id="btn-delete-current-slide"
                      onClick={() => handleDeleteSlide(activeSlideIdx)}
                      className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/40 ml-1 transition-colors"
                      title="Delete current slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete All Slides Button */}
                  {activeDeck.slides.length > 0 && (
                    <button
                      id="btn-delete-all-slides"
                      onClick={handleDeleteAllSlides}
                      className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-1"
                      title="Delete all slides in this deck"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All Slides</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Slide Card Viewport */}
              <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                {currentSlide ? (
                  <div
                    className={`w-full max-w-3xl aspect-[16/9] rounded-3xl border p-8 flex flex-col justify-between shadow-2xl relative transition-all ${
                      themeStyle === 'dark-amber'
                        ? 'bg-gradient-to-br from-neutral-900 to-neutral-950 border-amber-500/30 text-white'
                        : themeStyle === 'cyber-blue'
                        ? 'bg-gradient-to-br from-slate-900 to-sky-950 border-sky-500/30 text-white'
                        : themeStyle === 'obsidian'
                        ? 'bg-neutral-950 border-neutral-800 text-white'
                        : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  >
                    {/* Slide Header */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono uppercase tracking-widest font-bold text-amber-400">
                          SLIDE {currentSlide.slideNumber}
                        </span>
                        <span className="text-[11px] font-mono opacity-50 uppercase">{activeDeck.title}</span>
                      </div>

                      <input
                        type="text"
                        value={currentSlide.title}
                        onChange={(e) => handleUpdateSlide('title', e.target.value)}
                        className="w-full text-2xl font-black bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-1"
                        placeholder="Slide Title..."
                      />

                      <input
                        type="text"
                        value={currentSlide.subtitle}
                        onChange={(e) => handleUpdateSlide('subtitle', e.target.value)}
                        className="w-full text-sm font-semibold opacity-70 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-1 mt-1"
                        placeholder="Slide Subtitle..."
                      />
                    </div>

                    {/* Bullets List */}
                    <div className="my-auto space-y-2.5">
                      {currentSlide.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => {
                              const newBullets = [...currentSlide.bullets];
                              newBullets[bIdx] = e.target.value;
                              handleUpdateSlide('bullets', newBullets);
                            }}
                            className="w-full text-sm leading-relaxed bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-1"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Footer / Takeaway Note */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-bold text-amber-400">Takeaway:</span>
                        <input
                          type="text"
                          value={currentSlide.keyTakeaway}
                          onChange={(e) => handleUpdateSlide('keyTakeaway', e.target.value)}
                          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-1 italic opacity-90"
                        />
                      </div>
                      {currentSlide.visualNote && (
                        <div className="text-[10px] opacity-40 font-mono italic max-w-xs truncate">
                          Art note: {currentSlide.visualNote}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Presentation className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-200">No Slides in this Deck</h3>
                      <p className={`text-xs mt-1.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        All slides have been deleted from &ldquo;{activeDeck.title}&rdquo;. You can add new slides or generate a fresh deck anytime.
                      </p>
                    </div>
                    <button
                      id="btn-add-first-slide"
                      type="button"
                      onClick={handleAddSlide}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-400 transition-colors shadow-sm shadow-amber-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Slide</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
