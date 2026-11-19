import React, { useState, useEffect, useRef } from 'react';
import { 
  ActiveWorkspace, 
  CHAT_ROLES,
  ChatRoleId,
  ChatSession, 
  ComposerToolId,
  GeneratedImage, 
  GeneratedVideo, 
  ForgeXModelId, 
  UserProfile, 
  UserSettings, 
  DEFAULT_SETTINGS, 
  NotificationItem,
  ScheduledTask,
  ThemeEffectType,
  ActiveReminderAlert,
} from './types';
import { authService } from './services/authService';
import { chatService } from './services/chatService';
import { imageService } from './services/imageService';
import { libraryService } from './services/libraryService';
import { videoService } from './services/videoService';
import { musicService } from './services/musicService';
import {
  formatCleanReminderText,
  formatFrequencyLabel,
  isDailyBriefingTask,
  isReminderTask,
  scheduledTaskService,
} from './services/scheduledTaskService';
import { deviceNotificationService } from './services/deviceNotificationService';

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
import { SpotifyStudioWorkspace } from './components/SpotifyStudioWorkspace';
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
import { VaultWorkspace } from './components/VaultWorkspace';
import { LibraryWorkspace } from './components/LibraryWorkspace';
import { ScheduledWorkspace } from './components/ScheduledWorkspace';
import { StartupBriefingItem, StartupBriefingView } from './components/StartupBriefingView';
import { VoiceModeModal } from './components/VoiceModeModal';
import { voiceController } from './services/voiceService';

import { SettingsModal, SettingsTabId } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { FavoritesModal } from './components/FavoritesModal';
import { SearchModal } from './components/SearchModal';
import { NotificationsPopover } from './components/NotificationsPopover';
import { MediaViewerModal } from './components/MediaViewerModal';
import { BellRing, Lock, Volume2, X } from 'lucide-react';

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
  const [selectedModelId, setSelectedModelId] = useState<ForgeXModelId>('forge-2-ultra');
  const [selectedRoleId, setSelectedRoleId] = useState<ChatRoleId>('general');
  const [pendingComposerTool, setPendingComposerTool] = useState<ComposerToolId>('none');

  // App Settings & Theme (default background effect is none)
  const [settings, setSettings] = useState<UserSettings>(() => {
    const bgNoneInitialized = localStorage.getItem('forgex_bg_effect_default_none_v2');
    const lightInitialized = localStorage.getItem('forgex_light_default_v1');
    const saved = localStorage.getItem('forgex_settings');

    if (!bgNoneInitialized) {
      localStorage.setItem('forgex_bg_effect_default_none_v2', 'true');
      localStorage.setItem('forgex_light_default_v1', 'true');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const migrated: UserSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            themeEffect: 'none',
            enableStarBackground: false,
            theme: parsed.theme || 'light',
          };
          localStorage.setItem('forgex_settings', JSON.stringify(migrated));
          return migrated;
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    }

    if (!lightInitialized) {
      localStorage.setItem('forgex_light_default_v1', 'true');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SETTINGS, ...parsed, theme: 'light', themeEffect: parsed.themeEffect || 'none' };
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, themeEffect: parsed.themeEffect || 'none' };
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
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(() => scheduledTaskService.getTasks());
  const [runningScheduledTaskIds, setRunningScheduledTaskIds] = useState<string[]>([]);
  const [startupBriefing, setStartupBriefing] = useState<{
    status: 'loading' | 'ready';
    items: StartupBriefingItem[];
    activeTaskTitle?: string;
  } | null>(null);
  const isRunningDueTasksRef = useRef(false);
  const hasTriggeredStartupBriefingRef = useRef(false);
  const startupBriefingCancelledRef = useRef(false);
  const initialMountTimeRef = useRef(Date.now());

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
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('personalization');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [activeReminder, setActiveReminder] = useState<ActiveReminderAlert | null>(null);
  const [isReminderSpeaking, setIsReminderSpeaking] = useState(false);
  const activeWorkspaceRef = useRef<ActiveWorkspace>(activeWorkspace);
  const isVoiceModeOpenRef = useRef<boolean>(isVoiceModeOpen);
  const pendingReminderRef = useRef<ActiveReminderAlert | null>(null);

  // Fullscreen Media Viewer Modal
  const [viewingMedia, setViewingMedia] = useState<{
    type: 'image' | 'video';
    item: GeneratedImage | GeneratedVideo;
  } | null>(null);

  // In-App Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Forge 2 Ultra Online',
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

    const ensureAllScheduledChatsLinked = (tasks: ScheduledTask[]): ScheduledTask[] => {
      let linkedAny = false;
      for (const t of tasks) {
        const existing = t.chatSessionId
          ? chatService.getSessions().find((s) => s.id === t.chatSessionId)
          : undefined;
        if (!existing) {
          scheduledTaskService.ensureDedicatedChatForTask(t.id, selectedModelId);
          linkedAny = true;
        }
      }
      if (linkedAny) {
        setChatSessions(chatService.getSessions());
        return scheduledTaskService.getTasks();
      }
      return tasks;
    };

    const localTasks = ensureAllScheduledChatsLinked(scheduledTaskService.getTasks());
    setScheduledTasks(localTasks);

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

      videoService.syncWithFirestore().then((syncedVideos) => {
        if (syncedVideos && syncedVideos.length > 0) {
          setVideos(syncedVideos);
        }
      }).catch(() => {});

      scheduledTaskService.syncWithFirestore().then((syncedTasks) => {
        if (syncedTasks && syncedTasks.length > 0) {
          const linkedTasks = ensureAllScheduledChatsLinked(syncedTasks);
          setScheduledTasks(linkedTasks);
          if (
            isInWorkspace &&
            !hasTriggeredStartupBriefingRef.current &&
            Date.now() - initialMountTimeRef.current < 15000
          ) {
            void runStartupDailyBriefing(linkedTasks);
          }
        }
      }).catch(() => {});

      musicService.syncWithFirestore().catch(() => {});
    }
  }, [user?.id, user?.email]);

  const isDailyOrNewsTask = (task: ScheduledTask): boolean => {
    return task.status === 'active' && isDailyBriefingTask(task);
  };

  const runStartupDailyBriefing = async (sourceTasks: ScheduledTask[]) => {
    if (hasTriggeredStartupBriefingRef.current) return;
    const dailyTasks = sourceTasks
      .filter(isDailyOrNewsTask)
      .sort((a, b) => {
        const aNews = /\b(?:news|briefing|headlines|roundup)\b/i.test(`${a.title} ${a.prompt}`) ? 1 : 0;
        const bNews = /\b(?:news|briefing|headlines|roundup)\b/i.test(`${b.title} ${b.prompt}`) ? 1 : 0;
        return bNews - aNews;
      })
      .slice(0, 3);

    if (dailyTasks.length === 0) return;

    hasTriggeredStartupBriefingRef.current = true;
    startupBriefingCancelledRef.current = false;
    setStartupBriefing({
      status: 'loading',
      items: [],
      activeTaskTitle: dailyTasks[0].title,
    });

    const items: StartupBriefingItem[] = [];
    for (const task of dailyTasks) {
      if (startupBriefingCancelledRef.current) return;
      const result = await scheduledTaskService.runTaskNow(task.id, selectedModelId);
      setScheduledTasks(result.tasks);
      setChatSessions(chatService.getSessions());
      if (result.task && result.output) {
        void deviceNotificationService.sendNotification({
          title: `Daily Briefing: ${result.task.title}`,
          body: result.output,
          tag: `sched_startup_${task.id}`,
          onClick: () => handleOpenScheduledTaskInChat(result.task || task),
        });
      }
      items.push({
        task: result.task || task,
        output: result.output,
        error: result.error,
      });
    }

    if (startupBriefingCancelledRef.current) return;
    setStartupBriefing({
      status: 'ready',
      items,
      activeTaskTitle: dailyTasks[0].title,
    });
  };

  // Run active daily/news scheduled briefing when user starts the app
  useEffect(() => {
    if (!isInWorkspace || hasTriggeredStartupBriefingRef.current) return;
    const tasks = scheduledTaskService.getTasks();
    if (tasks.some(isDailyOrNewsTask)) {
      void runStartupDailyBriefing(tasks);
    }
  }, [isInWorkspace]);

  // Listen to auth changes and dedicated scheduled chat updates dynamically
  useEffect(() => {
    const handleAuthEvent = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile | null>;
      const newUser = customEvent.detail ?? authService.getCurrentUser();
      setUser(newUser);
    };

    const handleChatsUpdated = () => {
      setChatSessions(chatService.getSessions());
      setScheduledTasks(scheduledTaskService.getTasks());
    };

    window.addEventListener('forgex:auth_changed', handleAuthEvent);
    window.addEventListener('forgex:chats_updated', handleChatsUpdated);
    return () => {
      window.removeEventListener('forgex:auth_changed', handleAuthEvent);
      window.removeEventListener('forgex:chats_updated', handleChatsUpdated);
    };
  }, []);

  // Persist Workspace State
  useEffect(() => {
    localStorage.setItem('forgex_in_workspace', String(isInWorkspace));
  }, [isInWorkspace]);

  // Persist Settings & sync preferred voice
  useEffect(() => {
    localStorage.setItem('forgex_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    if (settings.preferredVoiceId) {
      voiceController.setVoiceByUri(settings.preferredVoiceId);
    }
  }, [settings]);

  const triggerReminderAnnouncement = (alert: ActiveReminderAlert) => {
    if (activeWorkspaceRef.current === 'scheduled' && !isVoiceModeOpenRef.current) {
      pendingReminderRef.current = alert;
      return;
    }
    setActiveReminder(alert);
    if (!isVoiceModeOpenRef.current) {
      setIsReminderSpeaking(true);
      void voiceController.playSynthesizedResponse(
        alert.spokenText,
        undefined,
        undefined,
        () => setIsReminderSpeaking(false),
        () => setIsReminderSpeaking(false)
      );
    }
  };

  useEffect(() => {
    activeWorkspaceRef.current = activeWorkspace;
    if (activeWorkspace !== 'scheduled' && pendingReminderRef.current) {
      const queued = pendingReminderRef.current;
      pendingReminderRef.current = null;
      if (Date.now() - queued.triggeredAt < 5 * 60 * 1000) {
        triggerReminderAnnouncement(queued);
      }
    }
  }, [activeWorkspace]);

  useEffect(() => {
    isVoiceModeOpenRef.current = isVoiceModeOpen;
    if (isVoiceModeOpen && pendingReminderRef.current) {
      const queued = pendingReminderRef.current;
      pendingReminderRef.current = null;
      if (Date.now() - queued.triggeredAt < 5 * 60 * 1000) {
        setActiveReminder(queued);
      }
    }
  }, [isVoiceModeOpen]);

  // Background Scheduled Task Ticker: checks every 3s so reminders fire right at the user-set time
  useEffect(() => {
    const checkAndRunDue = async () => {
      if (isRunningDueTasksRef.current) return;
      const due = scheduledTaskService.getDueTasks(Date.now());
      if (due.length === 0) return;

      isRunningDueTasksRef.current = true;
      try {
        for (const task of due) {
          const result = await scheduledTaskService.runTaskNow(task.id, selectedModelId);
          setScheduledTasks(result.tasks);
          setChatSessions(chatService.getSessions());
          if (result.task && result.output) {
            const reminderTask = result.isReminder || isReminderTask(result.task);
            void deviceNotificationService.sendNotification({
              title: reminderTask ? `Reminder: ${result.task.title}` : `Scheduled: ${result.task.title}`,
              body: result.output,
              tag: `sched_${task.id}`,
              onClick: () => handleOpenScheduledTaskInChat(result.task || task),
            });

            if (reminderTask) {
              const { message, spokenText } = formatCleanReminderText(result.task);
              const alert: ActiveReminderAlert = {
                id: `rem_${task.id}_${Date.now()}`,
                taskId: result.task.id,
                title: result.task.title,
                message,
                spokenText,
                triggeredAt: Date.now(),
              };
              triggerReminderAnnouncement(alert);
            }
          }
        }
      } finally {
        isRunningDueTasksRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => {
      void checkAndRunDue();
    }, 1000);
    const intervalId = setInterval(() => {
      void checkAndRunDue();
    }, 3000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [selectedModelId]);

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

  const WORKSPACE_TO_COMPOSER_TOOL: Partial<Record<ActiveWorkspace, ComposerToolId>> = {
    image: 'image',
    code: 'code',
    music: 'music',
    spotify: 'spotify',
    research: 'deep_research',
    files: 'files',
    agents: 'agents',
    search: 'search',
    writing: 'writing',
    data_analysis: 'data_analysis',
    vault: 'vault',
    presentation: 'presentation',
    canvas: 'canvas',
  };

  // Handlers for Navigation: all studios open inline inside Chat like Deep Research
  const handleLaunchStudio = (initialWorkspace?: ActiveWorkspace) => {
    if (initialWorkspace === 'library') {
      setActiveWorkspace('library');
      setPendingComposerTool('none');
      setIsInWorkspace(true);
      return;
    }
    const mappedTool = initialWorkspace ? WORKSPACE_TO_COMPOSER_TOOL[initialWorkspace] : undefined;
    setActiveWorkspace('chat');
    setPendingComposerTool(mappedTool || 'none');
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
  const handleSelectRole = (roleId: ChatRoleId) => {
    setSelectedRoleId(roleId);
    if (activeChatId) {
      const updated = chatSessions.map((s) => (s.id === activeChatId ? { ...s, roleId } : s));
      chatService.saveSessions(updated);
      setChatSessions(updated);
    }
  };

  const handleNewChat = () => {
    const latestSessions = chatService.getSessions();
    if (latestSessions.length === 0) {
      setActiveChatId(null);
      setActiveWorkspace('chat');
      setIsMobileNavOpen(false);
      return;
    }
    const existingEmpty = latestSessions.find(
      (s) => (!s.messages || s.messages.length === 0) && !s.scheduledTaskId
    );
    if (existingEmpty) {
      setChatSessions(latestSessions);
      setActiveChatId(existingEmpty.id);
      setActiveWorkspace('chat');
      setIsMobileNavOpen(false);
      return;
    }
    const newSession = chatService.createNewSession(selectedModelId, selectedRoleId);
    setChatSessions(chatService.getSessions());
    setActiveChatId(newSession.id);
    setActiveWorkspace('chat');
    setIsMobileNavOpen(false);
  };

  const handleSelectChat = (sessionId: string) => {
    setActiveChatId(sessionId);
    const chosen = chatSessions.find((s) => s.id === sessionId);
    if (chosen?.roleId) {
      setSelectedRoleId(chosen.roleId);
    }
    setActiveWorkspace('chat');
    setIsMobileNavOpen(false);
  };

  const handleDeleteChat = (sessionId: string) => {
    const linkedTask = scheduledTasks.find((t) => t.chatSessionId === sessionId);
    if (linkedTask) {
      setScheduledTasks(scheduledTaskService.deleteTask(linkedTask.id));
    }
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
      session = chatService.createNewSession(selectedModelId, selectedRoleId);
      setChatSessions(chatService.getSessions());
      setActiveChatId(session.id);
    }
    const activeRole = CHAT_ROLES.find((r) => r.id === (session?.roleId || selectedRoleId)) || CHAT_ROLES[0];
    await chatService.sendMessage(
      session.id,
      text,
      selectedModelId,
      undefined,
      undefined,
      'auto',
      undefined,
      undefined,
      undefined,
      activeRole.systemInstruction,
      activeRole.id
    );
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

  const handleOpenScheduledTaskInChat = (task: ScheduledTask) => {
    const session = scheduledTaskService.ensureDedicatedChatForTask(task.id, selectedModelId);
    setScheduledTasks(scheduledTaskService.getTasks());
    setChatSessions(chatService.getSessions());
    if (session) {
      setActiveChatId(session.id);
    }
    setActiveWorkspace('chat');
    setIsInWorkspace(true);
    setIsMobileNavOpen(false);
  };

  const handleRunScheduledTaskById = async (taskId: string) => {
    const task = scheduledTaskService.getTasks().find((t) => t.id === taskId);
    if (!task) return;
    handleOpenScheduledTaskInChat(task);
    if (runningScheduledTaskIds.includes(taskId)) return;

    setRunningScheduledTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    try {
      const result = await scheduledTaskService.runTaskNow(taskId, selectedModelId);
      setScheduledTasks(result.tasks);
      setChatSessions(chatService.getSessions());
      if (result.chatSessionId) {
        setActiveChatId(result.chatSessionId);
      }
      if (result.task && result.output) {
        const reminderTask = result.isReminder || isReminderTask(result.task);
        void deviceNotificationService.sendNotification({
          title: reminderTask ? `Reminder: ${result.task.title}` : `Scheduled: ${result.task.title}`,
          body: result.output,
          tag: `sched_manual_${taskId}`,
          onClick: () => {
            if (result.task) handleOpenScheduledTaskInChat(result.task);
          },
        });
      }
    } finally {
      setRunningScheduledTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleRunScheduledTaskInChat = (task: ScheduledTask) => {
    void handleRunScheduledTaskById(task.id);
  };

  const handleCreateScheduleInChat = (rawPrompt: string) => {
    const clean = rawPrompt.trim();
    if (!clean) return;
    if (deviceNotificationService.getPermission() === 'default') {
      void deviceNotificationService.requestPermission();
    }
    const previousEmptySessionId =
      currentChatSession &&
      currentChatSession.messages.length === 0 &&
      !currentChatSession.scheduledTaskId
        ? currentChatSession.id
        : null;
    const created = scheduledTaskService.createTask({ prompt: clean });
    if (previousEmptySessionId && previousEmptySessionId !== created.chatSessionId) {
      chatService.deleteSession(previousEmptySessionId);
    }
    const reminder = isReminderTask(created);
    const needsLiveFetch = /\b(?:news|weather|headlines|briefing|roundup|stock|price|score)\b/i.test(
      `${created.title} ${created.prompt}`
    );

    if (reminder && !needsLiveFetch) {
      const { message } = formatCleanReminderText(created);
      const nextTime = new Date(created.nextRunAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      if (created.chatSessionId) {
        chatService.appendMessagesToSession(
          created.chatSessionId,
          [
            {
              id: `usr_sched_${Date.now()}`,
              role: 'user',
              content: clean,
              timestamp: Date.now(),
              toolBadge: 'schedule',
            },
            {
              id: `asst_sched_confirm_${Date.now() + 1}`,
              role: 'assistant',
              content: `Scheduled reminder for **${formatFrequencyLabel(created)}** (next at **${nextTime}**): **${message}**.\n\nI'll announce it aloud and show it below while you're chatting when it's time.`,
              timestamp: Date.now() + 1,
              modelUsed: 'ForgeX Reminder',
            },
          ],
          selectedModelId,
          created.title
        );
      }
      setScheduledTasks(scheduledTaskService.getTasks());
      setChatSessions(chatService.getSessions());
      handleOpenScheduledTaskInChat(created);
      return;
    }

    setScheduledTasks(scheduledTaskService.getTasks());
    setChatSessions(chatService.getSessions());
    handleRunScheduledTaskInChat(created);
  };

  const currentChatSession = chatSessions.find((s) => s.id === activeChatId) || null;
  const linkedScheduledTask = currentChatSession?.scheduledTaskId
    ? scheduledTasks.find((t) => t.id === currentChatSession.scheduledTaskId) || null
    : null;
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
            user={user}
          />

          <main className="flex-1 flex flex-col">
            <LandingHero
              theme={settings.theme}
              onGetStarted={() => setIsAboutOpen(true)}
              onLaunchStudio={handleLaunchStudio}
              onExplore={() => setIsAboutOpen(true)}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              isAuthenticated={Boolean(user)}
              reduceMotion={settings.reduceMotion}
            />
          </main>

          {/* Minimal Landing Footer */}
          <footer className={`py-6 px-6 text-center text-xs border-t backdrop-blur-sm transition-colors ${
            isDark ? 'text-neutral-500 border-neutral-900/50' : 'text-neutral-600 border-neutral-200/80 bg-white/40'
          }`}>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setIsAboutOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                About ForgeX
              </button>
              <button onClick={() => setIsCreatorOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                Created by VishweshVarman
              </button>
              <button
                onClick={() => {
                  setSettingsInitialTab('personalization');
                  setIsSettingsOpen(true);
                }}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
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
            scheduledTasks={scheduledTasks}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onOpenSettings={() => {
              setSettingsInitialTab('personalization');
              setIsSettingsOpen(true);
            }}
            onOpenAccount={() => {
              setSettingsInitialTab('account');
              setIsSettingsOpen(true);
            }}
            onSignOut={handleSignOut}
            user={user}
            theme={settings.theme}
            isMobileOpen={isMobileNavOpen}
            onCloseMobile={() => setIsMobileNavOpen(false)}
            onReturnToLanding={handleReturnToLanding}
            onOpenAuth={() => setIsAuthOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            onOpenVoiceMode={() => {
              voiceController.unlockAudio();
              setIsVoiceModeOpen(true);
            }}
          />

          {/* Main Workspace Column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <Header
              activeWorkspace={activeWorkspace}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              selectedRoleId={currentChatSession?.roleId || selectedRoleId}
              onSelectRole={handleSelectRole}
              theme={settings.theme}
              themeEffect={settings.themeEffect || 'connected_dots'}
              onSelectThemeEffect={handleSelectThemeEffect}
              onToggleTheme={handleToggleTheme}
              onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
              onNavigateToChat={() => setActiveWorkspace('chat')}
              onOpenSearch={() => setIsSearchOpen(true)}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebarCollapse={handleToggleSidebarCollapse}
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
            />

            {/* Workspace Core Views */}
            <main key={user?.id || 'guest_space'} className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
              {activeWorkspace !== 'chat' && activeWorkspace !== 'library' && activeWorkspace !== 'scheduled' && !user ? (
                <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${
                  isDark ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'
                }`}>
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-xl">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl mb-2">
                    Sign In Required
                  </h2>
                  <p className={`text-sm max-w-md mb-6 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Access to specialized ForgeX creation tools requires an authenticated account. Sign in to continue and store your generation history separately.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveWorkspace('chat')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${
                        isDark ? 'hover:bg-neutral-850 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      Return to Chat
                    </button>
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-transform hover:scale-105 active:scale-95"
                    >
                      Sign In / Create Account
                    </button>
                  </div>
                </div>
              ) : (
                <>
              {activeWorkspace === 'chat' && (
                <ChatWorkspace
                  currentSession={currentChatSession}
                  onUpdateSession={handleUpdateCurrentChatSession}
                  onDeleteSession={handleDeleteChat}
                  onNewChat={handleNewChat}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  selectedRoleId={currentChatSession?.roleId || selectedRoleId}
                  theme={settings.theme}
                  initialComposerTool={pendingComposerTool}
                  onConsumeInitialTool={() => setPendingComposerTool('none')}
                  onNavigateToLibrary={() => setActiveWorkspace('library')}
                  onOpenVoiceMode={() => {
                    voiceController.unlockAudio();
                    setIsVoiceModeOpen(true);
                  }}
                  activeReminder={activeReminder}
                  isReminderSpeaking={isReminderSpeaking}
                  onReplayReminder={() => {
                    if (!activeReminder) return;
                    setIsReminderSpeaking(true);
                    void voiceController.playSynthesizedResponse(
                      activeReminder.spokenText,
                      undefined,
                      undefined,
                      () => setIsReminderSpeaking(false),
                      () => setIsReminderSpeaking(false)
                    );
                  }}
                  onDismissReminder={() => setActiveReminder(null)}
                  linkedScheduledTask={linkedScheduledTask}
                  isLinkedTaskRunning={Boolean(
                    linkedScheduledTask && runningScheduledTaskIds.includes(linkedScheduledTask.id)
                  )}
                  onCreateScheduleInChat={handleCreateScheduleInChat}
                  onOpenVaultSettings={() => {
                    setSettingsInitialTab('vault');
                    setIsSettingsOpen(true);
                  }}
                />
              )}

              {activeWorkspace === 'scheduled' && (
                <ScheduledWorkspace
                  theme={settings.theme}
                  tasks={scheduledTasks}
                  onTasksChange={setScheduledTasks}
                  onOpenTaskInChat={handleOpenScheduledTaskInChat}
                  onRunTaskInChat={handleRunScheduledTaskInChat}
                />
              )}

              {activeWorkspace === 'library' && (
                <LibraryWorkspace
                  theme={settings.theme}
                  images={images}
                  onUpdateImages={setImages}
                  videos={videos}
                  chatSessions={chatSessions}
                  onUpdateChatSessions={setChatSessions}
                  onSelectChat={handleSelectChat}
                  onNewChat={handleNewChat}
                  onNavigateToImage={() => {
                    setActiveWorkspace('chat');
                    setPendingComposerTool('image');
                  }}
                  onViewFullscreen={(type, item) => setViewingMedia({ type, item })}
                  userId={user?.id}
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

              {activeWorkspace === 'spotify' && (
                <SpotifyStudioWorkspace
                  theme={settings.theme}
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

              {activeWorkspace === 'vault' && (
                <VaultWorkspace
                  isDark={isDark}
                  theme={settings.theme}
                  onSendToChat={(text) => {
                    handleSendMessageToActiveChat(text);
                  }}
                  onNavigateToChat={() => {
                    setActiveWorkspace('chat');
                  }}
                />
              )}

                </>
              )}

              {activeReminder &&
                activeWorkspace !== 'chat' &&
                activeWorkspace !== 'scheduled' &&
                !isVoiceModeOpen && (
                  <div
                    id="workspace-reminder-below-bar"
                    role="status"
                    aria-live="polite"
                    className="px-4 pb-3 pt-1 shrink-0"
                  >
                    <div
                      className={`max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border shadow-sm ${
                        isDark
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                          : 'bg-amber-50/95 border-amber-300/70 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BellRing
                          className={`w-4 h-4 shrink-0 ${
                            isReminderSpeaking ? 'text-amber-500 animate-bounce' : 'text-amber-500'
                          }`}
                        />
                        <p className="text-xs sm:text-[13px] font-medium truncate">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">Reminder: </span>
                          {activeReminder.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            voiceController.unlockAudio();
                            setIsReminderSpeaking(true);
                            void voiceController.playSynthesizedResponse(
                              activeReminder.spokenText,
                              undefined,
                              undefined,
                              () => setIsReminderSpeaking(false),
                              () => setIsReminderSpeaking(false)
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                            isDark ? 'hover:bg-amber-500/20 text-amber-300' : 'hover:bg-amber-200/60 text-amber-800'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{isReminderSpeaking ? 'Speaking...' : 'Say'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReminder(null)}
                          className={`p-1 rounded-lg cursor-pointer ${
                            isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-black/5 text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </main>
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
        initialTab={settingsInitialTab}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearNotifications={() => setNotifications([])}
        onAskVaultInChat={() => {
          setIsSettingsOpen(false);
          setActiveWorkspace('chat');
          setPendingComposerTool('vault');
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
          setActiveWorkspace('chat');
          setPendingComposerTool('music');
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
        songs={musicService.getSongs()}
        theme={settings.theme}
        onViewImage={(img) => setViewingMedia({ type: 'image', item: img })}
        onViewVideo={(vid) => setViewingMedia({ type: 'video', item: vid })}
        onSelectSong={(_song) => {
          setIsInWorkspace(true);
          setActiveWorkspace('chat');
          setPendingComposerTool('music');
        }}
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
            const imgUrl =
              viewingMedia?.type === 'image'
                ? (viewingMedia.item as GeneratedImage).imageUrl
                : undefined;
            const updated = imageService.deleteImageByIdOrUrl(id, imgUrl);
            setImages(updated);
            libraryService.deleteReferenceByIdOrUrl(id, imgUrl);
            const updatedSessions = chatService.removeImageFromSessions(imgUrl, id);
            setChatSessions(updatedSessions);
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
        userName={user?.name}
        activeReminder={activeReminder}
        onDismissReminder={() => setActiveReminder(null)}
        onSendToChat={(text) => {
          setActiveWorkspace('chat');
          setIsInWorkspace(true);
          const currentSessions = chatService.getSessions();
          let targetSession = currentSessions.find((s) => s.id === activeChatId);
          if (!targetSession) {
            targetSession = chatService.createSession(selectedModelId, text.slice(0, 32));
          }
          const userMsg = {
            id: `msg-${Date.now()}`,
            role: 'user' as const,
            content: text,
            timestamp: Date.now(),
          };
          const updatedSessions = currentSessions.map((s) =>
            s.id === targetSession!.id ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() } : s
          );
          if (!currentSessions.some((s) => s.id === targetSession!.id)) {
            updatedSessions.unshift({ ...targetSession, messages: [userMsg] });
          }
          chatService.saveSessions(updatedSessions);
          setChatSessions(updatedSessions);
          setActiveChatId(targetSession.id);
        }}
      />

      {startupBriefing && (
        <StartupBriefingView
          theme={settings.theme}
          status={startupBriefing.status}
          items={startupBriefing.items}
          activeTaskTitle={startupBriefing.activeTaskTitle}
          onStartApp={() => {
            startupBriefingCancelledRef.current = true;
            setStartupBriefing(null);
          }}
          onOpenInChat={(title, output, chatSessionId) => {
            startupBriefingCancelledRef.current = true;
            const sessions = chatService.getSessions();
            if (chatSessionId && sessions.some((s) => s.id === chatSessionId)) {
              setChatSessions(sessions);
              setActiveChatId(chatSessionId);
              setActiveWorkspace('chat');
              setStartupBriefing(null);
              return;
            }
            const session = chatService.createSession(selectedModelId, title);
            const updated = chatService.appendMessagesToSession(
              session.id,
              output
                ? [
                    {
                      id: `asst_briefing_${Date.now()}`,
                      role: 'assistant',
                      content: output,
                      timestamp: Date.now(),
                      modelUsed: selectedModelId,
                    },
                  ]
                : [],
              selectedModelId,
              title
            );
            setChatSessions(chatService.getSessions());
            setActiveChatId(updated.id);
            setActiveWorkspace('chat');
            setStartupBriefing(null);
          }}
        />
      )}
    </div>
  );
}
