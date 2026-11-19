import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Cpu,
  Database,
  FileUp,
  Globe,
  Image as ImageIcon,
  Loader2,
  LogIn,
  LogOut,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  User as UserIcon,
  Volume2,
  X,
} from 'lucide-react';
import {
  DEFAULT_PERSONALIZATION,
  DEFAULT_SETTINGS,
  FORGEX_MODELS,
  NotificationItem,
  PersonalizationBaseTone,
  PersonalizationLevel,
  PersonalizationSettings,
  ThemeEffectType,
  UserProfile,
  UserSettings,
  VaultDocument,
} from '../types';
import { GEMINI_AI_VOICES, voiceController } from '../services/voiceService';
import { vaultService } from '../services/vaultService';

export type SettingsTabId =
  | 'personalization'
  | 'vault'
  | 'general'
  | 'appearance'
  | 'voice'
  | 'notifications'
  | 'generation'
  | 'account';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  user: UserProfile | null;
  onUpdateUser: (partial: Partial<UserProfile>) => void;
  onSignOut: () => void;
  onOpenAuth?: () => void;
  initialTab?: SettingsTabId;
  notifications?: NotificationItem[];
  onMarkAllNotificationsRead?: () => void;
  onClearNotifications?: () => void;
  onAskVaultInChat?: () => void;
}

const TONE_OPTIONS: PersonalizationBaseTone[] = [
  'Default',
  'Professional',
  'Friendly',
  'Candid',
  'Efficient',
  'Quirky',
  'Concise',
];

const LEVEL_OPTIONS: PersonalizationLevel[] = ['Default', 'More', 'Less'];

const NAV_ITEMS: { id: SettingsTabId; label: string; icon: React.FC<{ className?: string }>; keywords: string }[] = [
  {
    id: 'personalization',
    label: 'Personalization',
    icon: Sliders,
    keywords: 'tone style warmth enthusiasm emoji visual answers headers lists custom instructions',
  },
  {
    id: 'vault',
    label: 'Knowledge Vault',
    icon: Database,
    keywords: 'knowledge vault grounding rag notes documents files url context active sources',
  },
  {
    id: 'general',
    label: 'General',
    icon: SettingsIcon,
    keywords: 'model engine response preference auto enhance prompts',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Sun,
    keywords: 'theme dark light background effects animations motion stars matrix',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    keywords: 'alerts scheduled updates inbox unread',
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Volume2,
    keywords: 'speech voice audio neural test speaker',
  },
  {
    id: 'generation',
    label: 'Generation',
    icon: ImageIcon,
    keywords: 'aspect ratio image video duration',
  },
  {
    id: 'account',
    label: 'Account',
    icon: UserIcon,
    keywords: 'profile name email credits quota sign out',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  user,
  onUpdateUser,
  onSignOut,
  onOpenAuth,
  initialTab = 'personalization',
  notifications = [],
  onMarkAllNotificationsRead,
  onClearNotifications,
  onAskVaultInChat,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [editName, setEditName] = useState(user?.name || '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [draftInstructions, setDraftInstructions] = useState('');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Knowledge Vault grounding state inside Settings
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>(() => vaultService.getDocuments());
  const [vaultFilter, setVaultFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [vaultDocSearch, setVaultDocSearch] = useState('');
  const [isAddingVaultNote, setIsAddingVaultNote] = useState(false);
  const [newVaultTitle, setNewVaultTitle] = useState('');
  const [newVaultCategory, setNewVaultCategory] = useState<VaultDocument['category']>('notes');
  const [newVaultContent, setNewVaultContent] = useState('');
  const [isAddingVaultUrl, setIsAddingVaultUrl] = useState(false);
  const [vaultUrlInput, setVaultUrlInput] = useState('');
  const [isIngestingVaultUrl, setIsIngestingVaultUrl] = useState(false);
  const [vaultUrlError, setVaultUrlError] = useState<string | null>(null);
  const [editingVaultDocId, setEditingVaultDocId] = useState<string | null>(null);
  const [editVaultDocTitle, setEditVaultDocTitle] = useState('');
  const [editVaultDocContent, setEditVaultDocContent] = useState('');

  const personalization: PersonalizationSettings = {
    ...DEFAULT_PERSONALIZATION,
    ...(settings.personalization || {}),
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEditName(user?.name || '');
      setSearchQuery('');
      setIsEditingInstructions(false);
      setVaultDocs(vaultService.getDocuments());
      setVaultUrlError(null);
    }
  }, [isOpen, initialTab, user?.name]);

  useEffect(() => {
    const syncVault = () => setVaultDocs(vaultService.getDocuments());
    window.addEventListener('forgex:vault_updated', syncVault);
    return () => window.removeEventListener('forgex:vault_updated', syncVault);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingInstructions) {
          setIsEditingInstructions(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isEditingInstructions, onClose]);

  const filteredNavItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  useEffect(() => {
    if (filteredNavItems.length > 0 && !filteredNavItems.some((item) => item.id === activeTab)) {
      setActiveTab(filteredNavItems[0].id);
    }
  }, [filteredNavItems, activeTab]);

  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const flashSaved = (msg = 'Saved') => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 1800);
  };

  const updatePersonalization = <K extends keyof PersonalizationSettings>(
    key: K,
    value: PersonalizationSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      personalization: {
        ...personalization,
        [key]: value,
      },
    });
    flashSaved();
  };

  const handleResetSettings = () => {
    onUpdateSettings(DEFAULT_SETTINGS);
    flashSaved('Reset to defaults');
  };

  const handleSaveProfileName = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdateUser({ name: trimmed });
    flashSaved('Profile updated');
  };

  const handleTestVoice = async () => {
    const voiceId = settings.preferredVoiceId || 'gemini-Zephyr';
    voiceController.unlockAudio();
    voiceController.setVoiceByUri(voiceId);
    setIsTestingVoice(true);
    try {
      await voiceController.speak(
        'Hello! I am ForgeX, ready with your selected neural voice.',
        () => setIsTestingVoice(false)
      );
    } catch {
      setIsTestingVoice(false);
    }
  };

  const activeVaultCount = vaultDocs.filter((d) => d.isActive).length;
  const filteredVaultDocs = vaultDocs.filter((doc) => {
    if (vaultFilter === 'active' && !doc.isActive) return false;
    if (vaultFilter === 'inactive' && doc.isActive) return false;
    const q = (vaultDocSearch || searchQuery).trim().toLowerCase();
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q)
    );
  });

  const handleToggleVaultDoc = (id: string) => {
    vaultService.toggleDocumentActive(id);
    setVaultDocs(vaultService.getDocuments());
    flashSaved();
  };

  const handleToggleAllVaultDocs = (active: boolean) => {
    vaultService.toggleAllActive(active);
    setVaultDocs(vaultService.getDocuments());
    flashSaved(active ? 'All documents enabled' : 'All documents paused');
  };

  const handleAddVaultNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultTitle.trim() || !newVaultContent.trim()) return;
    vaultService.addDocument({
      title: newVaultTitle.trim(),
      content: newVaultContent.trim(),
      category: newVaultCategory,
      tags: ['Settings Vault'],
      summary: newVaultContent.trim().slice(0, 140),
      isActive: true,
    });
    setVaultDocs(vaultService.getDocuments());
    setNewVaultTitle('');
    setNewVaultContent('');
    setIsAddingVaultNote(false);
    flashSaved('Note added & active');
  };

  const handleUploadVaultFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => '');
    if (text.trim()) {
      vaultService.addDocument({
        title: file.name,
        content: text.slice(0, 35000),
        category: 'document',
        tags: ['Uploaded'],
        summary: text.trim().slice(0, 140),
        isActive: true,
      });
      setVaultDocs(vaultService.getDocuments());
      flashSaved('File added to Vault');
    }
    e.target.value = '';
  };

  const handleIngestVaultUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultUrlInput.trim() || isIngestingVaultUrl) return;
    setIsIngestingVaultUrl(true);
    setVaultUrlError(null);
    try {
      const data = await vaultService.ingestUrl(vaultUrlInput.trim());
      vaultService.addDocument({
        title: data.title,
        content: data.content,
        category: 'webpage',
        tags: ['Web Source'],
        summary: data.summary,
        isActive: true,
      });
      setVaultDocs(vaultService.getDocuments());
      setVaultUrlInput('');
      setIsAddingVaultUrl(false);
      flashSaved('Webpage added to Vault');
    } catch (err: any) {
      setVaultUrlError(err?.message || 'Unable to ingest webpage URL.');
    } finally {
      setIsIngestingVaultUrl(false);
    }
  };

  const handleSaveVaultDocEdit = (id: string) => {
    if (!editVaultDocContent.trim()) return;
    vaultService.updateDocument(id, {
      title: editVaultDocTitle.trim() || 'Untitled document',
      content: editVaultDocContent.trim(),
      summary: editVaultDocContent.trim().slice(0, 140),
    });
    setVaultDocs(vaultService.getDocuments());
    setEditingVaultDocId(null);
    flashSaved('Document updated');
  };

  const handleDeleteVaultDoc = (id: string) => {
    vaultService.deleteDocument(id);
    if (editingVaultDocId === id) {
      setEditingVaultDocId(null);
    }
    setVaultDocs(vaultService.getDocuments());
    flashSaved('Removed');
  };

  const renderSelectPill = (
    id: string,
    value: string,
    options: string[],
    onChange: (val: string) => void
  ) => (
    <div className="relative inline-flex items-center shrink-0">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-full pl-3.5 pr-8 py-1.5 text-xs sm:text-sm font-medium border cursor-pointer transition-colors focus:outline-none ${
          isDark
            ? 'bg-neutral-800/90 hover:bg-neutral-800 border-neutral-700 text-neutral-100'
            : 'bg-neutral-100 hover:bg-neutral-200/80 border-neutral-200/90 text-neutral-800'
        }`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${
          isDark ? 'text-neutral-400' : 'text-neutral-500'
        }`}
      />
    </div>
  );

  const initials = (user?.name || 'Guest')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'FX';

  const rowDivider = isDark ? 'border-neutral-800/90' : 'border-neutral-200/85';
  const mutedText = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const primaryText = isDark ? 'text-neutral-100' : 'text-neutral-900';

  const matchesSearch = (text: string) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return text.toLowerCase().includes(q);
  };

  return (
    <div
      id="settings-overlay-screen"
      className={`fixed inset-0 z-50 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-150 ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Left Navigation Sidebar (Reference 2 layout) */}
      <aside
        className={`w-full md:w-64 lg:w-72 shrink-0 flex flex-col border-b md:border-b-0 md:border-r ${
          isDark ? 'bg-neutral-950 border-neutral-800/80' : 'bg-[#fbfbfb] border-neutral-200/80'
        }`}
      >
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <button
            id="btn-settings-back-to-app"
            type="button"
            onClick={onClose}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-200 hover:bg-neutral-900 hover:text-white'
                : 'text-neutral-800 hover:bg-neutral-100 hover:text-black'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to app</span>
          </button>

          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
              <Check className="w-3.5 h-3.5" />
              {savedNotice}
            </span>
          )}
        </div>

        {/* Search Settings */}
        <div className="px-4 py-2">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
              isDark
                ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-600'
                : 'bg-white border-neutral-200 focus-within:border-neutral-400'
            }`}
          >
            <Search className={`w-4 h-4 shrink-0 ${mutedText}`} />
            <input
              id="input-settings-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className={`w-full bg-transparent text-sm focus:outline-none ${
                isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`${mutedText} hover:text-neutral-900 dark:hover:text-white cursor-pointer`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Profile Group */}
        <div className="px-4 pt-3 pb-2">
          <div className={`px-2 pb-1.5 text-xs font-medium ${mutedText}`}>Profile</div>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'account'
                ? isDark
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-900'
                : isDark
                  ? 'hover:bg-neutral-900/70 text-neutral-200'
                  : 'hover:bg-neutral-100/80 text-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                {initials}
              </div>
              <span className="text-sm font-medium truncate">{user?.name || 'Guest Creator'}</span>
            </div>
            <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 ${mutedText}`} />
          </button>
        </div>

        {/* App Settings Sections (Real ForgeX Features Only) */}
        <div className="px-4 pt-2 pb-4 flex-1 overflow-y-auto">
          <div className={`px-2 pb-1.5 text-xs font-medium ${mutedText}`}>App</div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`settings-nav-${item.id}`}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-neutral-800/90 text-white font-medium'
                        : 'bg-neutral-200/75 text-neutral-950 font-medium'
                      : isDark
                        ? 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-8 sm:py-12">
          {/* PERSONALIZATION TAB */}
          {activeTab === 'personalization' && (
            <div className="space-y-8">
              <div>
                <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Personalization</h2>
                <p className={`text-sm mt-1 ${mutedText}`}>
                  Shape how ForgeX speaks, structures answers, and formats visual details across all chats.
                </p>
              </div>

              <div>
                {matchesSearch('Base style and tone overall tone replies Professional Friendly Candid Efficient Quirky Concise') && (
                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Base style and tone</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Choose the overall tone of replies
                      </div>
                    </div>
                    {renderSelectPill(
                      'select-personalization-tone',
                      personalization.baseTone,
                      TONE_OPTIONS,
                      (val) => updatePersonalization('baseTone', val as PersonalizationBaseTone)
                    )}
                  </div>
                )}

                {matchesSearch('Warmth friendly replies sound') && (
                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Warmth</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Choose how friendly replies sound
                      </div>
                    </div>
                    {renderSelectPill(
                      'select-personalization-warmth',
                      personalization.warmth,
                      LEVEL_OPTIONS,
                      (val) => updatePersonalization('warmth', val as PersonalizationLevel)
                    )}
                  </div>
                )}

                {matchesSearch('Enthusiasm upbeat replies sound') && (
                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Enthusiasm</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Choose how upbeat replies sound
                      </div>
                    </div>
                    {renderSelectPill(
                      'select-personalization-enthusiasm',
                      personalization.enthusiasm,
                      LEVEL_OPTIONS,
                      (val) => updatePersonalization('enthusiasm', val as PersonalizationLevel)
                    )}
                  </div>
                )}

                {matchesSearch('Emoji often replies use emoji') && (
                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Emoji</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Choose how often replies use emoji
                      </div>
                    </div>
                    {renderSelectPill(
                      'select-personalization-emoji',
                      personalization.emojiLevel,
                      LEVEL_OPTIONS,
                      (val) => updatePersonalization('emojiLevel', val as PersonalizationLevel)
                    )}
                  </div>
                )}

                {matchesSearch('Visual answers standard replies interactive content charts tables') && (
                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Visual answers</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Choose between standard replies and replies with more visual or interactive content
                      </div>
                    </div>
                    {renderSelectPill(
                      'select-personalization-visual',
                      personalization.visualAnswers,
                      LEVEL_OPTIONS,
                      (val) => updatePersonalization('visualAnswers', val as PersonalizationLevel)
                    )}
                  </div>
                )}

                {matchesSearch('Headers and lists headings lists spacing') && (
                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Headers and lists</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Choose how often replies use headings and lists
                      </div>
                    </div>
                    {renderSelectPill(
                      'select-personalization-headers',
                      personalization.headersAndLists,
                      LEVEL_OPTIONS,
                      (val) => updatePersonalization('headersAndLists', val as PersonalizationLevel)
                    )}
                  </div>
                )}
              </div>

              {/* Custom Instructions */}
              {matchesSearch('Custom instructions ForgeX extra context all chats') && (
                <div className="pt-2 space-y-3">
                  <h3 className={`text-base font-semibold pb-2 border-b ${primaryText} ${rowDivider}`}>
                    Custom instructions
                  </h3>

                  <div className="flex items-start justify-between gap-4 py-2">
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${primaryText}`}>ForgeX</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                        Give ForgeX extra instructions and context for all chats
                      </div>
                      {personalization.customInstructions && !isEditingInstructions && (
                        <p className={`text-xs mt-2 line-clamp-2 italic ${mutedText}`}>
                          "{personalization.customInstructions}"
                        </p>
                      )}
                    </div>

                    <button
                      id="btn-edit-custom-instructions"
                      type="button"
                      onClick={() => {
                        setDraftInstructions(personalization.customInstructions || '');
                        setIsEditingInstructions((prev) => !prev);
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium border transition-colors shrink-0 cursor-pointer ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                      }`}
                    >
                      {isEditingInstructions ? 'Close' : 'Edit'}
                    </button>
                  </div>

                  {isEditingInstructions && (
                    <div className="pt-2 space-y-3 animate-in fade-in duration-150">
                      <textarea
                        id="textarea-custom-instructions"
                        rows={4}
                        value={draftInstructions}
                        onChange={(e) => setDraftInstructions(e.target.value)}
                        placeholder="Example: Always give concise code snippets in TypeScript, explain key trade-offs briefly, and highlight edge cases."
                        className={`w-full rounded-2xl border p-3.5 text-sm leading-relaxed focus:outline-none ${
                          isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500'
                            : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500'
                        }`}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingInstructions(false)}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                            isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          id="btn-save-custom-instructions"
                          type="button"
                          onClick={() => {
                            updatePersonalization('customInstructions', draftInstructions.trim());
                            setIsEditingInstructions(false);
                          }}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                            isDark
                              ? 'bg-white text-black hover:bg-neutral-200'
                              : 'bg-neutral-900 text-white hover:bg-neutral-800'
                          }`}
                        >
                          Save instructions
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* KNOWLEDGE VAULT GROUNDING TAB */}
          {activeTab === 'vault' && (
            <div id="settings-vault-panel" className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Knowledge Vault</h2>
                  <p className={`text-sm mt-1 ${mutedText}`}>
                    Manage private notes, files, and webpages ForgeX uses to ground replies across chats.
                  </p>
                </div>
                {onAskVaultInChat && (
                  <button
                    type="button"
                    id="btn-settings-ask-vault-chat"
                    onClick={onAskVaultInChat}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium cursor-pointer shrink-0 transition-colors ${
                      isDark
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    Ask Vault in chat
                  </button>
                )}
              </div>

              {/* Grounding Status & Actions Row */}
              <div className={`py-4 border-t border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${rowDivider}`}>
                <div>
                  <div className={`text-sm font-medium ${primaryText}`}>Grounding sources</div>
                  <div className={`text-xs sm:text-sm mt-0.5 tabular-nums ${mutedText}`}>
                    {activeVaultCount} of {vaultDocs.length} {vaultDocs.length === 1 ? 'document' : 'documents'} active across chats
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingVaultNote((v) => !v);
                      setIsAddingVaultUrl(false);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                      isAddingVaultNote
                        ? isDark
                          ? 'bg-white text-black border-white'
                          : 'bg-neutral-900 text-white border-neutral-900'
                        : isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add note</span>
                  </button>

                  <label
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload file</span>
                    <input
                      type="file"
                      accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.py"
                      className="hidden"
                      onChange={handleUploadVaultFile}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingVaultUrl((v) => !v);
                      setIsAddingVaultNote(false);
                      setVaultUrlError(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                      isAddingVaultUrl
                        ? isDark
                          ? 'bg-white text-black border-white'
                          : 'bg-neutral-900 text-white border-neutral-900'
                        : isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Add URL</span>
                  </button>

                  {vaultDocs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleToggleAllVaultDocs(activeVaultCount < vaultDocs.length)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                        isDark
                          ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                          : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {activeVaultCount < vaultDocs.length ? 'Enable all' : 'Pause all'}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Add URL Form (matches Custom instructions editorial UI) */}
              {isAddingVaultUrl && (
                <form
                  onSubmit={handleIngestVaultUrlSubmit}
                  className={`pb-4 border-b space-y-3 animate-in fade-in duration-150 ${rowDivider}`}
                >
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Import webpage into Knowledge Vault</div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>
                      Fetch readable page text and enable it for grounded answers
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      required
                      value={vaultUrlInput}
                      onChange={(e) => setVaultUrlInput(e.target.value)}
                      placeholder="https://docs.example.com/guide"
                      className={`flex-1 rounded-full px-4 py-2 text-sm border focus:outline-none ${
                        isDark
                          ? 'bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-400'
                      }`}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingVaultUrl(false);
                          setVaultUrlError(null);
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                          isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isIngestingVaultUrl || !vaultUrlInput.trim()}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                          isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                        }`}
                      >
                        {isIngestingVaultUrl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isIngestingVaultUrl ? 'Importing...' : 'Import & enable'}</span>
                      </button>
                    </div>
                  </div>
                  {vaultUrlError && <p className="text-xs text-red-500">{vaultUrlError}</p>}
                </form>
              )}

              {/* Inline Add Note Form (matches Custom instructions editorial UI) */}
              {isAddingVaultNote && (
                <form
                  onSubmit={handleAddVaultNoteSubmit}
                  className={`pb-4 border-b space-y-3 animate-in fade-in duration-150 ${rowDivider}`}
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      value={newVaultTitle}
                      onChange={(e) => setNewVaultTitle(e.target.value)}
                      placeholder="Document or note title"
                      className={`flex-1 rounded-2xl border px-3.5 py-2 text-sm focus:outline-none ${
                        isDark
                          ? 'bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-500'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-400'
                      }`}
                    />
                    <div className="relative inline-flex items-center shrink-0">
                      <select
                        value={newVaultCategory}
                        onChange={(e) => setNewVaultCategory(e.target.value as VaultDocument['category'])}
                        className={`appearance-none rounded-full pl-3.5 pr-8 py-2 text-xs sm:text-sm font-medium border cursor-pointer focus:outline-none ${
                          isDark
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                            : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                        }`}
                      >
                        <option value="notes">Notes</option>
                        <option value="document">Document</option>
                        <option value="code">Code</option>
                        <option value="webpage">Webpage</option>
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${mutedText}`} />
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={newVaultContent}
                    onChange={(e) => setNewVaultContent(e.target.value)}
                    placeholder="Paste specifications, architecture notes, API references, or facts you want ForgeX to remember..."
                    className={`w-full rounded-2xl border p-3.5 text-sm leading-relaxed focus:outline-none ${
                      isDark
                        ? 'bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500'
                    }`}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingVaultNote(false)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                        isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newVaultTitle.trim() || !newVaultContent.trim()}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                        isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                    >
                      Save & enable
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Filter Row */}
              {vaultDocs.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border flex-1 max-w-sm ${
                      isDark
                        ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-600'
                        : 'bg-neutral-50 border-neutral-200 focus-within:border-neutral-400'
                    }`}
                  >
                    <Search className={`w-3.5 h-3.5 shrink-0 ${mutedText}`} />
                    <input
                      type="text"
                      value={vaultDocSearch}
                      onChange={(e) => setVaultDocSearch(e.target.value)}
                      placeholder="Filter vault sources..."
                      className={`w-full bg-transparent text-xs sm:text-sm focus:outline-none ${
                        isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'
                      }`}
                    />
                    {vaultDocSearch && (
                      <button
                        type="button"
                        onClick={() => setVaultDocSearch('')}
                        className={`${mutedText} hover:text-neutral-900 dark:hover:text-white cursor-pointer`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className={`inline-flex items-center gap-1 p-1 rounded-full border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200/80'}`}>
                    {(['all', 'active', 'inactive'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setVaultFilter(mode)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          vaultFilter === mode
                            ? isDark
                              ? 'bg-neutral-800 text-white'
                              : 'bg-white text-neutral-950 shadow-2xs'
                            : mutedText
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vault Documents Settings Rows */}
              {filteredVaultDocs.length === 0 ? (
                <div className={`py-10 text-center border-t border-b ${rowDivider}`}>
                  <Database className={`w-7 h-7 mx-auto mb-2 opacity-40 ${mutedText}`} />
                  <p className={`text-sm font-medium ${primaryText}`}>
                    {vaultDocs.length === 0 ? 'No Knowledge Vault sources yet' : 'No matching documents'}
                  </p>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    {vaultDocs.length === 0
                      ? 'Add a note, upload a file, or import a webpage above to ground ForgeX responses.'
                      : 'Try clearing the filter or search query.'}
                  </p>
                </div>
              ) : (
                <div className={`divide-y border-t border-b ${rowDivider}`}>
                  {filteredVaultDocs.map((doc) => {
                    const isEditingThisDoc = editingVaultDocId === doc.id;
                    return (
                      <div key={doc.id} className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-medium ${primaryText}`}>{doc.title}</div>
                            <div className={`text-xs mt-0.5 tabular-nums ${mutedText}`}>
                              <span className="capitalize">{doc.category}</span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{doc.charCount.toLocaleString()} chars</span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span className={doc.isActive ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                                {doc.isActive ? 'Active in chat' : 'Paused'}
                              </span>
                            </div>
                            {!isEditingThisDoc && (
                              <p className={`text-xs sm:text-sm mt-1 line-clamp-2 leading-relaxed ${mutedText}`}>
                                {doc.summary || doc.content}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThisDoc) {
                                  setEditingVaultDocId(null);
                                } else {
                                  setEditingVaultDocId(doc.id);
                                  setEditVaultDocTitle(doc.title);
                                  setEditVaultDocContent(doc.content);
                                }
                              }}
                              className={`rounded-full px-3.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                                isDark
                                  ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                                  : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                              }`}
                            >
                              {isEditingThisDoc ? 'Close' : 'Edit'}
                            </button>

                            <button
                              type="button"
                              aria-label={`${doc.isActive ? 'Disable' : 'Enable'} grounding for ${doc.title}`}
                              onClick={() => handleToggleVaultDoc(doc.id)}
                              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                                doc.isActive ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-neutral-300'
                              }`}
                            >
                              <span
                                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                  doc.isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              title="Delete source"
                              onClick={() => handleDeleteVaultDoc(doc.id)}
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                isDark
                                  ? 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800'
                                  : 'text-neutral-400 hover:text-red-600 hover:bg-neutral-100'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isEditingThisDoc && (
                          <div className="pt-1 space-y-2.5 animate-in fade-in duration-150">
                            <input
                              type="text"
                              value={editVaultDocTitle}
                              onChange={(e) => setEditVaultDocTitle(e.target.value)}
                              className={`w-full rounded-2xl border px-3.5 py-2 text-sm focus:outline-none ${
                                isDark
                                  ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
                                  : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                              }`}
                            />
                            <textarea
                              rows={6}
                              value={editVaultDocContent}
                              onChange={(e) => setEditVaultDocContent(e.target.value)}
                              className={`w-full rounded-2xl border p-3.5 text-sm leading-relaxed focus:outline-none ${
                                isDark
                                  ? 'bg-neutral-900 border-neutral-700 text-neutral-100 focus:border-amber-500'
                                  : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500'
                              }`}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingVaultDocId(null)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                                  isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-100'
                                }`}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveVaultDocEdit(doc.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                                  isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                }`}
                              >
                                Save changes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>General</h2>
                <p className={`text-sm mt-1 ${mutedText}`}>Configure default intelligence engine and prompt behavior.</p>
              </div>

              <div>
                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Default AI Model</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Model used for new chats and scheduled tasks
                    </div>
                  </div>
                  <div className="relative inline-flex items-center shrink-0">
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => {
                        onUpdateSettings({ ...settings, defaultModel: e.target.value as UserSettings['defaultModel'] });
                        flashSaved();
                      }}
                      className={`appearance-none rounded-full pl-3.5 pr-8 py-1.5 text-xs sm:text-sm font-medium border cursor-pointer focus:outline-none ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                      }`}
                    >
                      {FORGEX_MODELS.map((m) => (
                        <option key={m.id} value={m.id} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${mutedText}`} />
                  </div>
                </div>

                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Response Preference</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Balance between creative exploration and factual precision
                    </div>
                  </div>
                  {renderSelectPill(
                    'select-general-response-pref',
                    settings.responsePreference,
                    ['Creative', 'Balanced', 'Precise'],
                    (val) => {
                      onUpdateSettings({
                        ...settings,
                        responsePreference: val as UserSettings['responsePreference'],
                      });
                      flashSaved();
                    }
                  )}
                </div>

                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Auto-Enhance Image Prompts</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Enrich short image descriptions with lighting and composition details
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, autoEnhancePrompts: !settings.autoEnhancePrompts });
                      flashSaved();
                    }}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      settings.autoEnhancePrompts ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.autoEnhancePrompts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className={`py-4 flex items-center justify-between gap-4`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Reset All Settings</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Restore default theme, model, and personalization settings
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSettings}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Appearance</h2>
                <p className={`text-sm mt-1 ${mutedText}`}>Customize ForgeX theme, canvas backdrop, and motion.</p>
              </div>

              <div>
                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Theme</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>Switch between Light and Dark workspaces</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSettings({ ...settings, theme: 'light' });
                        flashSaved();
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border cursor-pointer transition-colors ${
                        settings.theme === 'light'
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                            : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSettings({ ...settings, theme: 'dark' });
                        flashSaved();
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border cursor-pointer transition-colors ${
                        settings.theme === 'dark'
                          ? 'bg-white text-black border-white'
                          : isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                            : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Canvas Theme Effect</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Interactive background visualization behind the workspace
                    </div>
                  </div>
                  <div className="relative inline-flex items-center shrink-0">
                    <select
                      value={settings.themeEffect || 'none'}
                      onChange={(e) => {
                        const effect = e.target.value as ThemeEffectType;
                        onUpdateSettings({
                          ...settings,
                          themeEffect: effect,
                          enableStarBackground: effect !== 'none',
                        });
                        flashSaved();
                      }}
                      className={`appearance-none rounded-full pl-3.5 pr-8 py-1.5 text-xs sm:text-sm font-medium border cursor-pointer focus:outline-none ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                      }`}
                    >
                      <option value="none">Clean Solid</option>
                      <option value="connected_dots">Connected Nodes</option>
                      <option value="stars">Starfield</option>
                      <option value="floating_particles">Floating Particles</option>
                      <option value="cyber_matrix">Code Matrix</option>
                      <option value="neon_waves">Ambient Waves</option>
                      <option value="geometric_grid">Geometric Grid</option>
                    </select>
                    <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${mutedText}`} />
                  </div>
                </div>

                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>UI Animations</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Smooth transitions and micro-interactions
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, enableAnimations: !settings.enableAnimations });
                      flashSaved();
                    }}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      settings.enableAnimations ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.enableAnimations ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Reduce Motion</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Minimize parallax and continuous ambient animations
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, reduceMotion: !settings.reduceMotion });
                      flashSaved();
                    }}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                      settings.reduceMotion ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.reduceMotion ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VOICE TAB */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Voice</h2>
                <p className={`text-sm mt-1 ${mutedText}`}>
                  Select your default ForgeX Neural Voice for live voice conversations and spoken playback.
                </p>
              </div>

              <div>
                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Neural Voice Profile</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Used in Voice Mode and speech playback
                    </div>
                  </div>
                  <div className="relative inline-flex items-center shrink-0">
                    <select
                      id="select-settings-voice"
                      value={settings.preferredVoiceId || 'gemini-Zephyr'}
                      onChange={(e) => {
                        const voiceId = e.target.value;
                        voiceController.setVoiceByUri(voiceId);
                        onUpdateSettings({ ...settings, preferredVoiceId: voiceId });
                        flashSaved();
                      }}
                      className={`appearance-none rounded-full pl-3.5 pr-8 py-1.5 text-xs sm:text-sm font-medium border cursor-pointer focus:outline-none max-w-[230px] ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                      }`}
                    >
                      {GEMINI_AI_VOICES.map((v) => (
                        <option key={v.id} value={v.id} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${mutedText}`} />
                  </div>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Preview Voice</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Listen to a live audio sample of your chosen voice
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isTestingVoice}
                    onClick={handleTestVoice}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium border transition-colors cursor-pointer disabled:opacity-60 ${
                      isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isTestingVoice ? 'Playing...' : 'Test voice'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Notifications</h2>
                  <p className={`text-sm mt-1 ${mutedText}`}>
                    Real-time alerts from scheduled tasks, generations, and workspace activity.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onMarkAllNotificationsRead && unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllNotificationsRead}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                      }`}
                    >
                      Mark all read
                    </button>
                  )}
                  {onClearNotifications && notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                        isDark
                          ? 'border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/30'
                          : 'border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-300'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className={`py-10 text-center border-t border-b ${rowDivider}`}>
                  <Bell className={`w-7 h-7 mx-auto mb-2 opacity-40 ${mutedText}`} />
                  <p className={`text-sm font-medium ${primaryText}`}>You are all caught up</p>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Scheduled task completions and system updates will appear here.
                  </p>
                </div>
              ) : (
                <div className={`divide-y border-t border-b ${rowDivider}`}>
                  {notifications.map((n) => (
                    <div key={n.id} className="py-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {!n.read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                          <span className={`text-sm font-medium ${primaryText}`}>{n.title}</span>
                        </div>
                        <p className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>{n.message}</p>
                      </div>
                      <span className={`text-xs font-mono tabular-nums shrink-0 ${mutedText}`}>
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GENERATION TAB */}
          {activeTab === 'generation' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Generation</h2>
                <p className={`text-sm mt-1 ${mutedText}`}>Default output formatting for images created inside chat.</p>
              </div>

              <div>
                <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-medium ${primaryText}`}>Default Image Aspect Ratio</div>
                    <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
                      Preferred frame proportion when generating artwork
                    </div>
                  </div>
                  {renderSelectPill(
                    'select-gen-aspect-ratio',
                    settings.defaultImageRatio,
                    ['1:1', '16:9', '9:16', '4:3'],
                    (val) => {
                      onUpdateSettings({
                        ...settings,
                        defaultImageRatio: val as UserSettings['defaultImageRatio'],
                      });
                      flashSaved();
                    }
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-semibold ${primaryText}`}>Account</h2>
                <p className={`text-sm mt-1 ${mutedText}`}>Manage your ForgeX profile, workspace sync, and session.</p>
              </div>

              {user ? (
                <div>
                  <div className={`py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${rowDivider}`}>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${primaryText}`}>Display Name</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`rounded-full px-3.5 py-1.5 text-sm border focus:outline-none ${
                          isDark
                            ? 'bg-neutral-900 border-neutral-700 text-white'
                            : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleSaveProfileName}
                        className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium cursor-pointer ${
                          isDark
                            ? 'bg-white text-black hover:bg-neutral-200'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                        }`}
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className={`py-4 border-b flex items-center justify-between gap-4 ${rowDivider}`}>
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Workspace Credits</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>Monthly AI capability usage</div>
                    </div>
                    <span className={`text-sm font-mono tabular-nums font-semibold ${primaryText}`}>
                      {user.creditsUsed} / {user.creditsLimit}
                    </span>
                  </div>

                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className={`text-sm font-medium ${primaryText}`}>Session</div>
                      <div className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>Sign out of this device</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSignOut();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`py-8 border-t border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${rowDivider}`}>
                  <div>
                    <div className={`text-sm font-semibold ${primaryText}`}>Not signed in</div>
                    <p className={`text-xs sm:text-sm mt-1 ${mutedText}`}>
                      Sign in to sync chats, scheduled tasks, and personalization across devices.
                    </p>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors cursor-pointer shrink-0"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign in</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
