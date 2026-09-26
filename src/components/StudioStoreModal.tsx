import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Check,
  CheckCircle2,
  Trash2,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Headphones,
  Globe,
  Compass,
  Bot,
  BarChart3,
  Code2,
  FileText,
  PenTool,
  Presentation,
  LayoutDashboard,
  FolderKanban,
  Crown,
  Gamepad2,
  Cpu,
  Flame,
  Rocket,
  ShieldCheck,
  ExternalLink,
  Layers,
  Wand2,
} from 'lucide-react';
import { CustomStudio, ForgeXTheme } from '../types';
import { studioService, StudioCatalogueItem } from '../services/studioService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StudioStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudio: (studioId: string) => void;
  theme: ForgeXTheme;
  userName?: string;
  userEmail?: string;
  userId?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Image: ImageIcon,
  Music,
  Headphones,
  Globe,
  Compass,
  Bot,
  BarChart3,
  Code2,
  FileText,
  PenTool,
  Presentation,
  LayoutDashboard,
  FolderKanban,
  Crown,
  Gamepad2,
  Cpu,
  Flame,
  Rocket,
  Sparkles,
  Wand2,
};

const COLOR_OPTIONS = [
  { name: 'Amber', class: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { name: 'Blue', class: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { name: 'Emerald', class: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { name: 'Cyan', class: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { name: 'Violet', class: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  { name: 'Rose', class: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  { name: 'Orange', class: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
];

export const StudioStoreModal: React.FC<StudioStoreModalProps> = ({
  isOpen,
  onClose,
  onSelectStudio,
  theme,
  userName = '',
  userEmail = '',
  userId = '',
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'explore' | 'create'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'official' | 'community' | 'creative' | 'intelligence' | 'productivity'>('all');
  
  const [activeStudioIds, setActiveStudioIds] = useState<string[]>(() => studioService.getActiveStudioIds());
  const [studios, setStudios] = useState<StudioCatalogueItem[]>(() => studioService.getAllStudios());

  // Form State for creating a new Custom Studio
  const [newTitle, setNewTitle] = useState('');
  const [newCreatorName, setNewCreatorName] = useState(userName || '');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'creative' | 'intelligence' | 'productivity' | 'utility' | 'gaming'>('intelligence');
  const [newIconName, setNewIconName] = useState('Bot');
  const [newAccentColor, setNewAccentColor] = useState('text-blue-400');
  const [newBadge, setNewBadge] = useState('Custom AI');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [newWelcomeMessage, setNewWelcomeMessage] = useState('');
  const [newStarterPrompt1, setNewStarterPrompt1] = useState('');
  const [newStarterPrompt2, setNewStarterPrompt2] = useState('');
  const [newStarterPrompt3, setNewStarterPrompt3] = useState('');
  const [newUiTemplate, setNewUiTemplate] = useState<'chat' | 'prompt-pad'>('chat');
  const [createError, setCreateError] = useState('');

  // Sync state whenever modal opens or storage updates
  useEffect(() => {
    if (isOpen) {
      setActiveStudioIds(studioService.getActiveStudioIds());
      setStudios(studioService.getAllStudios());
      if (userName && !newCreatorName) {
        setNewCreatorName(userName);
      }
    }
  }, [isOpen, userName]);

  const refreshStudios = () => {
    setActiveStudioIds(studioService.getActiveStudioIds());
    setStudios(studioService.getAllStudios());
  };

  const handleToggleAddStudio = (studioId: string) => {
    if (activeStudioIds.includes(studioId)) {
      if (studioId === 'chat') return; // Cannot remove chat
      const updated = studioService.removeStudioFromSidebar(studioId);
      setActiveStudioIds(updated);
    } else {
      const updated = studioService.addStudioToSidebar(studioId);
      setActiveStudioIds(updated);
    }
  };

  const handleLaunchStudio = (studioId: string) => {
    studioService.addStudioToSidebar(studioId);
    refreshStudios();
    onSelectStudio(studioId);
    onClose();
  };

  const handleDeleteCustomStudio = (studioId: string, studioTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studioService.canDeleteStudio(studioId, userId, userEmail, userName)) {
      alert(`Only the creator of this studio has permission to delete it.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete your custom studio "${studioTitle}" permanently? This action cannot be undone.`)) {
      const success = studioService.deleteCustomStudio(studioId, userId, userEmail, userName);
      if (success) {
        refreshStudios();
      }
    }
  };

  const handleCreateStudioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newTitle.trim()) {
      setCreateError('Please provide a studio name.');
      return;
    }
    if (!newCreatorName.trim()) {
      setCreateError('Please provide your name or creator handle.');
      return;
    }
    if (!newDescription.trim()) {
      setCreateError('Please provide a brief description.');
      return;
    }
    if (!newSystemPrompt.trim()) {
      setCreateError('Please specify the studio working instructions or AI logic.');
      return;
    }

    const starters = [newStarterPrompt1, newStarterPrompt2, newStarterPrompt3]
      .map((s) => s.trim())
      .filter(Boolean);

    const newStudio: CustomStudio = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      creatorName: newCreatorName.trim(),
      creatorId: userId || undefined,
      creatorEmail: userEmail || undefined,
      description: newDescription.trim(),
      category: newCategory,
      iconName: newIconName,
      accentColor: newAccentColor,
      badge: newBadge.trim() || 'Custom AI',
      systemPrompt: newSystemPrompt.trim(),
      welcomeMessage: newWelcomeMessage.trim() || `Welcome to ${newTitle.trim()}! How can I assist you today?`,
      starterPrompts: starters.length > 0 ? starters : undefined,
      uiTemplate: newUiTemplate,
      createdAt: Date.now(),
    };

    studioService.saveCustomStudio(newStudio);
    refreshStudios();

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewSystemPrompt('');
    setNewWelcomeMessage('');
    setNewStarterPrompt1('');
    setNewStarterPrompt2('');
    setNewStarterPrompt3('');
    setActiveTab('explore');

    // Automatically open newly created studio
    handleLaunchStudio(newStudio.id);
  };

  // Filtered catalogue
  const filteredStudios = useMemo(() => {
    return studios.filter((studio) => {
      // Query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        studio.title.toLowerCase().includes(q) ||
        studio.description.toLowerCase().includes(q) ||
        studio.author.toLowerCase().includes(q) ||
        studio.badge.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      // Category / Tab filter
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'official') return studio.isOfficial;
      if (selectedFilter === 'community') return !studio.isOfficial;
      return studio.category === selectedFilter;
    });
  }, [studios, searchQuery, selectedFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-neutral-200 bg-neutral-50/90'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black shadow-md font-bold text-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Studio Hub & Store</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                  {studios.length} Available
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Add studios to your sidebar or build and upload your own customized studio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Explore vs Create */}
            <div className={`flex items-center p-1 rounded-xl border ${
              isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
            }`}>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'explore'
                    ? isDark ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-neutral-900 shadow-sm'
                    : isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All Studios
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'create'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Upload Your Studio
              </button>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-black'
              }`}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Explore & Add Studios */}
        {activeTab === 'explore' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Category Filter Bar */}
            <div className={`p-4 border-b space-y-3 shrink-0 ${
              isDark ? 'border-neutral-800/80 bg-neutral-950/40' : 'border-neutral-200/80 bg-neutral-50/40'
            }`}>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className={`relative flex-1 w-full flex items-center rounded-xl border px-3 py-2 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                }`}>
                  <Search className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search studios by title, description, or creator..."
                    className="w-full bg-transparent text-xs focus:outline-none placeholder:text-neutral-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-0.5 text-neutral-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'official', label: 'Official ForgeX' },
                    { id: 'community', label: 'Custom / Created' },
                    { id: 'creative', label: 'Creative' },
                    { id: 'intelligence', label: 'Intelligence' },
                    { id: 'productivity', label: 'Productivity' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedFilter === filter.id
                          ? isDark
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                          : isDark
                            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Studios Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudios.map((studio) => {
                  const Icon = ICON_MAP[studio.iconName] || Bot;
                  const isAdded = activeStudioIds.includes(studio.id);
                  const isChat = studio.id === 'chat';
                  const isUserCreator = !studio.isOfficial && studioService.canDeleteStudio(studio.id, userId, userEmail, userName);

                  return (
                    <div
                      key={studio.id}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg ${
                        isDark
                          ? 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {/* Top Row: Icon, Title & Author */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                            }`}>
                              <Icon className={`w-5 h-5 ${studio.accentColor}`} />
                            </div>

                            <div>
                              <h3 className="font-semibold text-sm leading-tight">{studio.title}</h3>
                              
                              {/* AUTHOR ATTRIBUTION WITH SPECIFIC BLUE VERIFIED TICK OR WITHOUT TICK */}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {studio.hasVerifiedTick ? (
                                  /* Official ForgeX with blue verified tick */
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                                    <span>ForgeX</span>
                                    {/* Blue Verified Tick Badge */}
                                    <span className="inline-flex items-center justify-center text-blue-500" title="Official ForgeX Studio">
                                      <svg className="w-3.5 h-3.5 fill-blue-500" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                      </svg>
                                    </span>
                                  </div>
                                ) : (
                                  /* Custom User Studio: shows user's creator name WITHOUT tick */
                                  <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                                    <span className="text-[10px] text-neutral-500">by</span>
                                    <span className="font-medium text-amber-500/90 dark:text-amber-400">
                                      {studio.author}
                                    </span>
                                    {/* Explicitly no tick as requested */}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            studio.isOfficial
                              ? isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {studio.badge}
                          </span>
                        </div>

                        {/* Studio Description */}
                        <div className={`text-xs line-clamp-2 mb-4 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          <MarkdownRenderer content={studio.description} theme={theme} className="text-xs" />
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-3 border-t border-dashed flex items-center justify-between gap-2 border-neutral-800/60 dark:border-neutral-800">
                        {/* Launch button */}
                        <button
                          type="button"
                          onClick={() => handleLaunchStudio(studio.id)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            isDark
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                          }`}
                        >
                          Launch
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>

                        {/* Add / Added / Remove from Sidebar button */}
                        <button
                          type="button"
                          onClick={() => handleToggleAddStudio(studio.id)}
                          disabled={isChat}
                          title={isChat ? 'ForgeX Chat is always active' : (isAdded ? 'Click to remove from sidebar' : 'Add studio to sidebar')}
                          className={`group/btn py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            isChat
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-default opacity-80'
                              : isAdded
                                ? 'bg-emerald-500/10 hover:bg-red-500/15 text-emerald-400 hover:text-red-400 border border-emerald-500/30 hover:border-red-500/30'
                                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-sm'
                          }`}
                        >
                          {isChat ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Active
                            </>
                          ) : isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 group-hover/btn:hidden" />
                              <span className="group-hover/btn:hidden">Added</span>
                              <X className="w-3.5 h-3.5 hidden group-hover/btn:inline" />
                              <span className="hidden group-hover/btn:inline">Remove</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Add Studio
                            </>
                          )}
                        </button>

                        {/* Delete button if custom studio: ONLY enabled/visible for creator of that studio */}
                        {!studio.isOfficial && (
                          isUserCreator ? (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomStudio(studio.id, studio.title, e)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                              title={`Delete your studio "${studio.title}" permanently`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 rounded-lg text-neutral-600 opacity-40 cursor-not-allowed"
                              title={`Created by ${studio.author}. Only the creator can delete this studio.`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredStudios.length === 0 && (
                <div className="py-16 text-center">
                  <Bot className="w-12 h-12 text-neutral-600 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No studios match your filter</p>
                  <p className="text-xs text-neutral-500 mt-1">Try another search term or click "Upload Your Studio" to create a new one!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Create & Upload Custom Studio */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <form onSubmit={handleCreateStudioSubmit} className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-500" />
                  Create & Upload Your Custom Studio
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Design a dedicated studio with custom AI intelligence, tailored instructions, and interactive workflow. Your name will be displayed below the studio without a verification tick.
                </p>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                  {createError}
                </div>
              )}

              {/* Grid 1: Basic Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Studio Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Chess Master AI, Crypto Analyst, Prompt Crafter"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Creator Name <span className="text-amber-500">*</span>
                    <span className={`text-[10px] font-normal ml-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      (Displayed below studio without tick)
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                    placeholder="e.g. Panda, Alex, TeamAlpha"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Short Description / Purpose <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain what this studio accomplishes for users in 1-2 sentences..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                  }`}
                />
              </div>

              {/* Category, Badge, & UI Style */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  >
                    <option value="intelligence">Intelligence</option>
                    <option value="creative">Creative</option>
                    <option value="productivity">Productivity</option>
                    <option value="gaming">Gaming & Simulation</option>
                    <option value="utility">Utility & Tool</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="e.g. Gaming, Analyzer, Pro"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">UI Template</label>
                  <select
                    value={newUiTemplate}
                    onChange={(e) => setNewUiTemplate(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  >
                    <option value="chat">Conversational Intelligence Studio</option>
                    <option value="prompt-pad">Quick Prompt & Output Pad</option>
                  </select>
                </div>
              </div>

              {/* Icon & Color Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Select Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {['Bot', 'Crown', 'Gamepad2', 'Sparkles', 'Cpu', 'Flame', 'Rocket', 'Code2', 'PenTool'].map((iconKey) => {
                      const IconComp = ICON_MAP[iconKey] || Bot;
                      const isSelected = newIconName === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setNewIconName(iconKey)}
                          className={`p-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                              : isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white' : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Accent Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => {
                      const isSelected = newAccentColor === c.class;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setNewAccentColor(c.class)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${c.class} ${
                            isSelected ? `${c.bg} border-current ring-1 ring-current` : isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Working Logic & System Prompt */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Studio Working Logic & System Instructions <span className="text-amber-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={newSystemPrompt}
                  onChange={(e) => setNewSystemPrompt(e.target.value)}
                  placeholder="Define how this studio operates, its specialized persona, rules, and working execution logic (e.g. 'You are an expert Chess coach. You play move-by-move and output ASCII boards...')"
                  className={`w-full p-3 rounded-xl text-xs font-mono border focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                  }`}
                />
              </div>

              {/* Welcome Message */}
              <div>
                <label className="block text-xs font-semibold mb-1">Initial Welcome Message (Optional)</label>
                <input
                  type="text"
                  value={newWelcomeMessage}
                  onChange={(e) => setNewWelcomeMessage(e.target.value)}
                  placeholder="Greeting shown when a user opens your studio..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                  }`}
                />
              </div>

              {/* Starter Quick Actions */}
              <div>
                <label className="block text-xs font-semibold mb-1">Starter Action Prompts (Optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newStarterPrompt1}
                    onChange={(e) => setNewStarterPrompt1(e.target.value)}
                    placeholder="Quick prompt 1..."
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  />
                  <input
                    type="text"
                    value={newStarterPrompt2}
                    onChange={(e) => setNewStarterPrompt2(e.target.value)}
                    placeholder="Quick prompt 2..."
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  />
                  <input
                    type="text"
                    value={newStarterPrompt3}
                    onChange={(e) => setNewStarterPrompt3(e.target.value)}
                    placeholder="Quick prompt 3..."
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'
                    }`}
                  />
                </div>
              </div>

              {/* Studio Preview Card */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-neutral-100/70 border-neutral-200'}`}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">Live Studio Card Preview</div>
                <div className={`p-3.5 rounded-xl border max-w-sm ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center">
                      {React.createElement(ICON_MAP[newIconName] || Bot, { className: `w-4 h-4 ${newAccentColor}` })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{newTitle || 'Your Studio Title'}</div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                        <span className="text-[10px] text-neutral-500">by</span>
                        <span className="font-medium text-amber-500/90 dark:text-amber-400">
                          {newCreatorName || 'Your Name'}
                        </span>
                        {/* No tick on preview as requested */}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold uppercase">
                      {newBadge || 'Custom'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-2 line-clamp-2">
                    {newDescription || 'Your studio description will appear here...'}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md flex items-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <Plus className="w-4 h-4" />
                  Upload & Launch Studio
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
