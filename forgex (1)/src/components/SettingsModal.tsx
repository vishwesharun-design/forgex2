import React, { useState } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  User, 
  Cpu, 
  Sliders, 
  Sparkles, 
  Layers, 
  Eye, 
  LogOut, 
  Check, 
  Zap
} from 'lucide-react';
import { 
  UserSettings, 
  UserProfile, 
  ForgeXTheme, 
  ForgeXModelId, 
  FORGEX_MODELS, 
  ImageAspectRatio, 
  VideoDuration 
} from '../types';
import { videoService } from '../services/videoService';
import { imageService } from '../services/imageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  user: UserProfile | null;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onSignOut: () => void;
  onOpenAuth?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  user,
  onUpdateUser,
  onSignOut,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'ai' | 'generation' | 'interface'>('appearance');
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Sync state if user changes
  React.useEffect(() => {
    if (user) {
      setUserName(user.name);
      setUserEmail(user.email);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;
  const isDark = settings.theme === 'dark';

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    onUpdateUser({ name: userName, email: userEmail });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/65 animate-in fade-in duration-200">
      <div
        id="modal-settings-forgex"
        className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden transition-all flex flex-col md:flex-row max-h-[90vh] ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        {/* Mobile / Desktop Close */}
        <button
          id="btn-close-settings"
          onClick={onClose}
          className={`absolute top-4 right-4 z-20 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Settings Sidebar Navigation */}
        <div
          className={`w-full md:w-56 p-5 border-b md:border-b-0 md:border-r shrink-0 ${
            isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <h3 className="font-display font-bold text-base tracking-tight">Settings</h3>
          </div>

          <nav className="space-y-1">
            <button
              id="settings-tab-appearance"
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'appearance'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Appearance</span>
            </button>

            <button
              id="settings-tab-account"
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'account'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Account</span>
            </button>

            <button
              id="settings-tab-ai"
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ai'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Models</span>
            </button>

            <button
              id="settings-tab-generation"
              onClick={() => setActiveTab('generation')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'generation'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Generation</span>
            </button>

            <button
              id="settings-tab-interface"
              onClick={() => setActiveTab('interface')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'interface'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Interface</span>
            </button>
          </nav>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[75vh]">
          {/* SECTION 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display font-bold text-lg mb-1">Appearance</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Customize ForgeX visual theme and dark/light atmosphere
                </p>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Theme Selection
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* 🌙 Dark Theme */}
                  <button
                    id="btn-theme-select-dark"
                    type="button"
                    onClick={() => updateSetting('theme', 'dark')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      settings.theme === 'dark'
                        ? 'border-amber-500 bg-neutral-950 text-white shadow-md'
                        : 'border-neutral-700/50 bg-neutral-950/40 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center text-amber-400">
                        <Moon className="w-4 h-4" />
                      </div>
                      {settings.theme === 'dark' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <span className="font-semibold text-sm block text-neutral-100">🌙 Dark Theme</span>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Dark navy-black canvas with luminous amber lightning
                    </span>
                  </button>

                  {/* ☀️ Light Theme (Section 16) */}
                  <button
                    id="btn-theme-select-light"
                    type="button"
                    onClick={() => updateSetting('theme', 'light')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      settings.theme === 'light'
                        ? 'border-amber-500 bg-white text-neutral-900 shadow-md'
                        : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Sun className="w-4 h-4" />
                      </div>
                      {settings.theme === 'light' && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <span className="font-semibold text-sm block text-neutral-900">☀️ Light Theme</span>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Clean off-white background with soft gray cards
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display font-bold text-lg mb-1">Account Profile</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Manage personal identity, credentials, and session state
                </p>
              </div>

              {!user ? (
                <div className={`p-8 rounded-2xl border text-center space-y-4 ${
                  isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-base mb-1">No Active Creator Account</h5>
                    <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      Sign in or create your account to save your generated chats, images, and videos with 1,000 free monthly compute credits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 inline-flex items-center gap-2 transition-all"
                  >
                    <span>Sign In / Create Account</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-800/60 bg-neutral-950/30">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h5 className="font-semibold text-sm">{userName}</h5>
                      <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{userEmail}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 mt-1 inline-block">
                        ForgeX Creator Tier
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      Name
                    </label>
                    <input
                      id="settings-input-name"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-amber-500 ${
                        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      Email
                    </label>
                    <input
                      id="settings-input-email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-amber-500 ${
                        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm flex items-center gap-1.5"
                    >
                      {savedFeedback ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{savedFeedback ? 'Saved' : 'Save Changes'}</span>
                    </button>

                    <button
                      id="settings-btn-signout"
                      type="button"
                      onClick={() => {
                        onClose();
                        onSignOut();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/20 flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SECTION 3: AI PREFERENCES */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display font-bold text-lg mb-1">AI Models & Preferences</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Configure default Unreal Engine model tier and response style
                </p>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Default Engine Model
                </label>
                <div className="space-y-2">
                  {FORGEX_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => updateSetting('defaultModel', model.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        settings.defaultModel === model.id
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : isDark
                            ? 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-xs">{model.name}</span>
                        <p className="text-[11px] text-neutral-400">{model.description}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        {model.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Response Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Creative', 'Balanced', 'Precise'] as const).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => updateSetting('responsePreference', pref)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        settings.responsePreference === pref
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                          : isDark
                            ? 'border-neutral-800 text-neutral-300'
                            : 'border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: GENERATION */}
          {activeTab === 'generation' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display font-bold text-lg mb-1">Generation Preferences</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Default parameters for Image Studio and Video Studio
                </p>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Default Image Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['1:1', '16:9', '9:16', '4:3'] as ImageAspectRatio[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateSetting('defaultImageRatio', r)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        settings.defaultImageRatio === r
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                          : isDark
                            ? 'border-neutral-800 text-neutral-300'
                            : 'border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Default Video Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['5s', '10s', '15s'] as VideoDuration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateSetting('defaultVideoDuration', d)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        settings.defaultVideoDuration === d
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                          : isDark
                            ? 'border-neutral-800 text-neutral-300'
                            : 'border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800/60 bg-neutral-950/20">
                <div>
                  <span className="text-xs font-semibold block">Auto-Enhance Prompts</span>
                  <span className="text-[11px] text-neutral-500">
                    Automatically expand concise input with cinematic lighting parameters
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoEnhancePrompts}
                  onChange={(e) => updateSetting('autoEnhancePrompts', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </div>
            </div>
          )}

          {/* SECTION 5: INTERFACE */}
          {activeTab === 'interface' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display font-bold text-lg mb-1">Interface & Motion</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Manage particle rendering and performance optimizations
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800/60 bg-neutral-950/20">
                  <div>
                    <span className="text-xs font-semibold block">Star Background Canvas</span>
                    <span className="text-[11px] text-neutral-500">
                      Enable cursor-reactive 3D parallax starfield
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableStarBackground}
                    onChange={(e) => updateSetting('enableStarBackground', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800/60 bg-neutral-950/20">
                  <div>
                    <span className="text-xs font-semibold block">UI Transitions & Animations</span>
                    <span className="text-[11px] text-neutral-500">
                      Smooth fades, drawer slides, and button states
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAnimations}
                    onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800/60 bg-neutral-950/20">
                  <div>
                    <span className="text-xs font-semibold block">Reduce Motion</span>
                    <span className="text-[11px] text-neutral-500">
                      Disables particle displacement and rapid transitions for accessibility
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reduceMotion}
                    onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
