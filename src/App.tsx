import React, { useState, useEffect } from 'react';
import { 
  ActiveWorkspace, 
  ChatSession, 
  GeneratedImage, 
  GeneratedVideo, 
  ForgeXModelId, 
  UserProfile, 
  UserSettings, 
  DEFAULT_SETTINGS, 
  NotificationItem,
  ThemeEffectType,
} from './types';
import { authService } from './services/authService';
import { chatService } from './services/chatService';
import { imageService } from './services/imageService';
import { videoService } from './services/videoService';
import { musicService } from './services/musicService';

import { StarField } from './components/StarField';
import { LandingNav } from './components/LandingNav';
import { LandingHero } from './components/LandingHero';
import { AboutModal } from './components/AboutModal';
import { CreatorModal } from './components/CreatorModal';
import { AuthModal } from './components/AuthModal';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ImageWorkspace } from './components/ImageWorkspace';
import { SongWorkspace } from './components/SongWorkspace';
import { ResearchWorkspace } from './components/ResearchWorkspace';
import { CodeStudioWorkspace } from './components/CodeStudioWorkspace';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { AgentWorkspace } from './components/AgentWorkspace';
import { WebSearchWorkspace } from './components/WebSearchWorkspace';
import { WritingStudioWorkspace } from './components/WritingStudioWorkspace';
import { DataAnalysisWorkspace } from './components/DataAnalysisWorkspace';
import { PresentationWorkspace } from './components/PresentationWorkspace';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { VoiceModeModal } from './components/VoiceModeModal';

import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { FavoritesModal } from './components/FavoritesModal';
import { SearchModal } from './components/SearchModal';
import { NotificationsPopover } from './components/NotificationsPopover';
import { MediaViewerModal } from './components/MediaViewerModal';
import { MobileBottomNav } from './components/MobileBottomNav';

export default function App() {
  // State: View Mode (Landing Page vs In-Workspace)
  const [isInWorkspace, setIsInWorkspace] = useState<boolean>(() => {
    return localStorage.getItem('forgex_in_workspace') === 'true';
  });

  // User Authentication (Real auth - null if unauthenticated, no sample emails)
  const [user, setUser] = useState<UserProfile | null>(() => {
    return authService.getCurrentUser();
  });

  // Workspace View State
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('chat');
  const [selectedModelId, setSelectedModelId] = useState<ForgeXModelId>('unreal-5');

  // App Settings & Theme
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('forgex_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Sessions and Media Data
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => chatService.getSessions());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const sessions = chatService.getSessions();
    return sessions.length > 0 ? sessions[0].id : null;
  });
  const [images, setImages] = useState<GeneratedImage[]>(() => imageService.getImages());
  const [videos, setVideos] = useState<GeneratedVideo[]>(() => videoService.getVideos());

  // UI Drawer & Sidebar
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('forgex_sidebar_collapsed');
    return saved === 'true';
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('forgex_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);

  // Fullscreen Media Viewer Modal
  const [viewingMedia, setViewingMedia] = useState<{
    type: 'image' | 'video';
    item: GeneratedImage | GeneratedVideo;
  } | null>(null);

  // In-App Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Unreal Engine 5 Online',
      message: 'ForgeX flagship multimodal engine is running at peak capability.',
      timestamp: Date.now() - 1000 * 60 * 12,
      read: false,
      type: 'system',
    },
    {
      id: 'notif-2',
      title: 'Studio Storage Ready',
      message: 'Your personal generation vault has been synchronized with local storage.',
      timestamp: Date.now() - 1000 * 60 * 65,
      read: false,
      type: 'creation',
    },
  ]);

  // Auto-sync and partition database when user profile/email changes
  useEffect(() => {
    // Immediately reload data for the active user email / partition
    const userChats = chatService.getSessions();
    setChatSessions(userChats);
    if (userChats.length > 0) {
      setActiveChatId(userChats[0].id);
    } else {
      setActiveChatId(null);
    }

    const userImages = imageService.getImages();
    setImages(userImages);

    const userVideos = videoService.getVideos();
    setVideos(userVideos);

    if (user && user.id && user.id !== 'guest') {
      chatService.syncWithFirestore().then((syncedChats) => {
        if (syncedChats && syncedChats.length > 0) {
          setChatSessions(syncedChats);
          if (!activeChatId) {
            setActiveChatId(syncedChats[0].id);
          }
        }
      }).catch(() => {});

      imageService.syncWithFirestore().then((syncedImages) => {
        if (syncedImages && syncedImages.length > 0) {
          setImages(syncedImages);
        }
      }).catch(() => {});

      musicService.syncWithFirestore().catch(() => {});
    }
  }, [user?.id, user?.email]);

  // Listen to auth changes dynamically
  useEffect(() => {
    const handleAuthEvent = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile | null>;
      const newUser = customEvent.detail ?? authService.getCurrentUser();
      setUser(newUser);
    };

    window.addEventListener('forgex:auth_changed', handleAuthEvent);
    return () => {
      window.removeEventListener('forgex:auth_changed', handleAuthEvent);
    };
  }, []);

  // Persist Workspace State
  useEffect(() => {
    localStorage.setItem('forgex_in_workspace', String(isInWorkspace));
  }, [isInWorkspace]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('forgex_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Keyboard shortcut: Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Navigation
  const handleLaunchStudio = (initialWorkspace?: ActiveWorkspace) => {
    if (initialWorkspace) {
      setActiveWorkspace(initialWorkspace);
    }
    setIsInWorkspace(true);
  };

  const handleReturnToLanding = () => {
    setIsInWorkspace(false);
  };

  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleSelectThemeEffect = (effect: ThemeEffectType) => {
    setSettings((prev) => ({
      ...prev,
      themeEffect: effect,
      enableStarBackground: effect !== 'none',
    }));
  };

  // Chat Actions
  const handleNewChat = () => {
    const newSession = chatService.createNewSession(selectedModelId);
    setChatSessions(chatService.getSessions());
    setActiveChatId(newSession.id);
    setActiveWorkspace('chat');
    setIsMobileNavOpen(false);
  };

  const handleSelectChat = (sessionId: string) => {
    setActiveChatId(sessionId);
    setActiveWorkspace('chat');
    setIsMobileNavOpen(false);
  };

  const handleDeleteChat = (sessionId: string) => {
    chatService.deleteSession(sessionId);
    const updated = chatService.getSessions();
    setChatSessions(updated);
    if (activeChatId === sessionId) {
      setActiveChatId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleDeleteHistoryItem = (id: string, type: 'chat' | 'image' | 'video') => {
    if (type === 'chat') {
      handleDeleteChat(id);
    } else if (type === 'image') {
      const updated = imageService.deleteImage(id);
      setImages(updated);
    } else if (type === 'video') {
      const updated = videoService.deleteVideo(id);
      setVideos(updated);
    }
  };

  const handleUpdateCurrentChatSession = (updated: ChatSession) => {
    setChatSessions((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
    });
    setActiveChatId(updated.id);
  };

  const handleSendMessageToActiveChat = async (text: string) => {
    setActiveWorkspace('chat');
    let session = currentChatSession;
    if (!session) {
      session = chatService.createNewSession(selectedModelId);
      setChatSessions(chatService.getSessions());
      setActiveChatId(session.id);
    }
    await chatService.sendMessage(session.id, text, selectedModelId);
    setChatSessions(chatService.getSessions());
  };

  // User Profile Actions
  const handleUpdateUser = (partial: Partial<UserProfile>) => {
    const updated = authService.updateUser(partial);
    setUser(updated);
  };

  const handleSignOut = () => {
    authService.signOut();
    setUser(null);
    setIsInWorkspace(false);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const currentChatSession = chatSessions.find((s) => s.id === activeChatId) || null;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const isDark = settings.theme === 'dark';

  return (
    <div
      id="forgex-app-root"
      className={`min-h-screen relative font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-neutral-950 text-neutral-100 dark'
          : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      {/* Interactive Cursor-Reactive Star Background */}
      {settings.enableStarBackground && (
        <StarField
          theme={settings.theme}
          effect={settings.themeEffect || 'connected_dots'}
          reduceMotion={settings.reduceMotion}
          intensity={isInWorkspace ? 'subtle' : 'full'}
        />
      )}

      {/* VIEW 1: LANDING PAGE */}
      {!isInWorkspace ? (
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          <LandingNav
            theme={settings.theme}
            themeEffect={settings.themeEffect || 'connected_dots'}
            onSelectThemeEffect={handleSelectThemeEffect}
            onToggleTheme={handleToggleTheme}
            onOpenAbout={() => setIsAboutOpen(true)}
            onOpenCreator={() => setIsCreatorOpen(true)}
            onOpenSignIn={() => setIsAuthOpen(true)}
            onOpenGetStarted={() => setIsAboutOpen(true)}
          />

          <main className="flex-1 flex flex-col justify-center">
            <LandingHero
              theme={settings.theme}
              onGetStarted={() => setIsAboutOpen(true)}
              onLaunchStudio={handleLaunchStudio}
              onExplore={() => setIsAboutOpen(true)}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              isAuthenticated={Boolean(user)}
            />
          </main>

          {/* Minimal Landing Footer */}
          <footer className="py-6 px-6 text-center text-xs text-neutral-500 border-t border-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setIsAboutOpen(true)} className="hover:text-amber-400 transition-colors">
                About ForgeX
              </button>
              <button onClick={() => setIsCreatorOpen(true)} className="hover:text-amber-400 transition-colors">
                Created by VishweshVarman
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="hover:text-amber-400 transition-colors">
                Settings
              </button>
            </div>
          </footer>
        </div>
      ) : (
        /* VIEW 2: APPLICATION WORKSPACE */
        <div className="relative z-10 flex h-[100dvh] overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={(ws) => {
              setActiveWorkspace(ws);
              setIsMobileNavOpen(false);
            }}
            recentChats={chatSessions}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAccount={() => setIsSettingsOpen(true)}
            onSignOut={handleSignOut}
            user={user}
            theme={settings.theme}
            isMobileOpen={isMobileNavOpen}
            onCloseMobile={() => setIsMobileNavOpen(false)}
            onReturnToLanding={handleReturnToLanding}
            onOpenAuth={() => setIsAuthOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
          />

          {/* Main Workspace Column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <Header
              activeWorkspace={activeWorkspace}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              theme={settings.theme}
              themeEffect={settings.themeEffect || 'connected_dots'}
              onSelectThemeEffect={handleSelectThemeEffect}
              onToggleTheme={handleToggleTheme}
              onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen((prev) => !prev)}
              onOpenFavorites={() => setIsFavoritesOpen(true)}
              unreadNotificationsCount={unreadNotifCount}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebarCollapse={handleToggleSidebarCollapse}
            />

            {/* Notifications Popover */}
            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAllRead={handleMarkAllNotificationsRead}
              theme={settings.theme}
            />

            {/* Workspace Core Views */}
            <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden pb-14 md:pb-0">
              {activeWorkspace === 'chat' && (
                <ChatWorkspace
                  currentSession={currentChatSession}
                  onUpdateSession={handleUpdateCurrentChatSession}
                  onDeleteSession={handleDeleteChat}
                  onNewChat={handleNewChat}
                  selectedModelId={selectedModelId}
                  theme={settings.theme}
                  onNavigateToImage={() => setActiveWorkspace('image')}
                  onNavigateToMusic={() => setActiveWorkspace('music')}
                />
              )}

              {activeWorkspace === 'image' && (
                <ImageWorkspace
                  images={images}
                  onUpdateImages={setImages}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  theme={settings.theme}
                  onViewFullscreen={(img) => setViewingMedia({ type: 'image', item: img })}
                />
              )}

              {activeWorkspace === 'music' && (
                <SongWorkspace
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                />
              )}

              {activeWorkspace === 'research' && (
                <ResearchWorkspace
                  isDark={isDark}
                  selectedModelId={selectedModelId}
                />
              )}

              {activeWorkspace === 'code' && (
                <CodeStudioWorkspace
                  isDark={isDark}
                  selectedModel={selectedModelId}
                  onSelectModel={setSelectedModelId}
                />
              )}

              {activeWorkspace === 'files' && (
                <DocumentWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onSendToChat={(text) => {
                    handleSendMessageToActiveChat(text);
                  }}
                />
              )}

              {activeWorkspace === 'agents' && (
                <AgentWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onSendToChat={(text) => {
                    handleSendMessageToActiveChat(text);
                  }}
                />
              )}

              {activeWorkspace === 'search' && (
                <WebSearchWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onSendToChat={(text) => {
                    handleSendMessageToActiveChat(text);
                  }}
                />
              )}

              {activeWorkspace === 'writing' && (
                <WritingStudioWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onSendToChat={(text) => {
                    handleSendMessageToActiveChat(text);
                  }}
                />
              )}

              {activeWorkspace === 'data_analysis' && (
                <DataAnalysisWorkspace
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onSendToChat={(text) => {
                    handleSendMessageToActiveChat(text);
                  }}
                />
              )}

              {activeWorkspace === 'presentation' && (
                <PresentationWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                />
              )}

              {activeWorkspace === 'canvas' && (
                <CanvasWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                />
              )}

              {activeWorkspace === 'projects' && (
                <ProjectWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onSelectWorkspace={setActiveWorkspace}
                />
              )}
            </main>

            {/* Mobile Bottom Navigation Bar (md:hidden) */}
            <MobileBottomNav
              activeWorkspace={activeWorkspace}
              onSelectWorkspace={(ws) => {
                setActiveWorkspace(ws);
                setIsMobileNavOpen(false);
              }}
              onOpenMobileSidebar={() => setIsMobileNavOpen(true)}
              onNewChat={handleNewChat}
              onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
              theme={settings.theme}
            />
          </div>
        </div>
      )}

      {/* Global Modals */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        theme={settings.theme}
        onGetStarted={(ws) => {
          setIsAboutOpen(false);
          handleLaunchStudio(ws || 'chat');
        }}
        onOpenAuth={() => {
          setIsAboutOpen(false);
          setIsAuthOpen(true);
        }}
        isAuthenticated={Boolean(user)}
      />
      <CreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        theme={settings.theme}
      />
      
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setIsInWorkspace(true);
        }}
        theme={settings.theme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        user={user}
        onUpdateUser={handleUpdateUser}
        onSignOut={handleSignOut}
        onOpenAuth={() => {
          setIsSettingsOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        chats={chatSessions}
        images={images}
        videos={videos}
        songs={musicService.getSongs()}
        currentUserEmail={user?.email || (user ? user.username : 'Guest Session')}
        theme={settings.theme}
        onSelectChat={handleSelectChat}
        onViewImage={(img) => setViewingMedia({ type: 'image', item: img })}
        onViewVideo={(vid) => setViewingMedia({ type: 'video', item: vid })}
        onSelectSong={(_song) => {
          setIsInWorkspace(true);
          setActiveWorkspace('music');
        }}
        onDeleteItem={(id, type) => {
          if (type === 'song') {
            musicService.deleteSong(id);
          } else {
            handleDeleteHistoryItem(id, type);
          }
        }}
      />

      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        images={images}
        videos={videos}
        theme={settings.theme}
        onViewImage={(img) => setViewingMedia({ type: 'image', item: img })}
        onViewVideo={(vid) => setViewingMedia({ type: 'video', item: vid })}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        chats={chatSessions}
        images={images}
        videos={videos}
        theme={settings.theme}
        onSelectChat={handleSelectChat}
        onViewImage={(img) => setViewingMedia({ type: 'image', item: img })}
        onViewVideo={(vid) => setViewingMedia({ type: 'video', item: vid })}
      />

      <MediaViewerModal
        media={viewingMedia}
        onClose={() => setViewingMedia(null)}
        theme={settings.theme}
        onDelete={(id, type) => {
          if (type === 'image') {
            const updated = imageService.deleteImage(id);
            setImages(updated);
          } else {
            const updated = videoService.deleteVideo(id);
            setVideos(updated);
          }
          setViewingMedia(null);
        }}
        onToggleFavorite={(id, type) => {
          if (type === 'image') {
            const updated = imageService.toggleFavorite(id);
            setImages(updated);
            if (viewingMedia && viewingMedia.item.id === id) {
              setViewingMedia({
                type: 'image',
                item: updated.find((i) => i.id === id) || viewingMedia.item,
              });
            }
          } else {
            const updated = videoService.toggleFavorite(id);
            setVideos(updated);
            if (viewingMedia && viewingMedia.item.id === id) {
              setViewingMedia({
                type: 'video',
                item: updated.find((v) => v.id === id) || viewingMedia.item,
              });
            }
          }
        }}
      />

      <VoiceModeModal
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        isDark={isDark}
        theme={settings.theme}
        selectedModelId={selectedModelId}
      />
    </div>
  );
}
