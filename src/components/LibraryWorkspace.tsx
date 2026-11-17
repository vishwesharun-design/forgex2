import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  Folder,
  FolderPlus,
  Heart,
  Image as ImageIcon,
  ListFilter,
  MessageSquare,
  Music,
  Plus,
  Search,
  Cpu,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import {
  ChatSession,
  ForgeXTheme,
  GeneratedImage,
  GeneratedSong,
  GeneratedVideo,
  LibraryFolder,
  LibraryReferenceItem,
} from '../types';
import { libraryService } from '../services/libraryService';
import { imageService } from '../services/imageService';
import { musicService } from '../services/musicService';
import { chatService } from '../services/chatService';

type LibraryTab = 'suggested' | 'favorites' | 'folders' | 'images' | 'all';
type SortOrder = 'newest' | 'oldest';
type SourceFilter = 'all' | 'reference' | 'generated' | 'chat';

interface UnifiedImageEntry {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: number;
  isFavorite: boolean;
  source: 'reference' | 'generated' | 'chat';
  folderId?: string;
  rawGenerated?: GeneratedImage;
  rawReference?: LibraryReferenceItem;
}

interface LibraryWorkspaceProps {
  theme: ForgeXTheme;
  images: GeneratedImage[];
  onUpdateImages: (images: GeneratedImage[]) => void;
  videos: GeneratedVideo[];
  chatSessions: ChatSession[];
  onUpdateChatSessions?: (sessions: ChatSession[]) => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onNavigateToImage: () => void;
  onViewFullscreen: (type: 'image' | 'video', item: GeneratedImage | GeneratedVideo) => void;
  userId?: string;
}

export const LibraryWorkspace: React.FC<LibraryWorkspaceProps> = ({
  theme,
  images,
  onUpdateImages,
  videos,
  chatSessions,
  onUpdateChatSessions,
  onSelectChat,
  onNewChat,
  onNavigateToImage,
  onViewFullscreen,
  userId,
}) => {
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<LibraryTab>('images');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const [references, setReferences] = useState<LibraryReferenceItem[]>(() =>
    libraryService.getReferences()
  );
  const [folders, setFolders] = useState<LibraryFolder[]>(() => libraryService.getFolders());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});
  const [folderPickerItemId, setFolderPickerItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const songs: GeneratedSong[] = useMemo(() => musicService.getSongs(), [userId]);

  useEffect(() => {
    setReferences(libraryService.getReferences());
    setFolders(libraryService.getFolders());
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aggregate all images from Library References, Image Studio, and Chat sessions
  const allImageEntries: UnifiedImageEntry[] = useMemo(() => {
    const seenUrls = new Set<string>();
    const entries: UnifiedImageEntry[] = [];

    for (const ref of references) {
      if (!ref.imageUrl) continue;
      seenUrls.add(ref.imageUrl);
      entries.push({
        id: ref.id,
        title: ref.title || 'Reference image',
        imageUrl: ref.imageUrl,
        createdAt: ref.createdAt,
        isFavorite: Boolean(ref.isFavorite),
        source: 'reference',
        folderId: ref.folderId,
        rawReference: ref,
      });
    }

    for (const img of images) {
      if (!img.imageUrl || seenUrls.has(img.imageUrl)) continue;
      seenUrls.add(img.imageUrl);
      entries.push({
        id: img.id,
        title: img.prompt || 'Generated image',
        imageUrl: img.imageUrl,
        createdAt: img.createdAt,
        isFavorite: Boolean(img.isFavorite),
        source: 'generated',
        rawGenerated: img,
      });
    }

    for (const session of chatSessions) {
      for (const msg of session.messages || []) {
        if (Array.isArray(msg.generatedImages)) {
          for (const gImg of msg.generatedImages) {
            if (!gImg.imageUrl || seenUrls.has(gImg.imageUrl)) continue;
            seenUrls.add(gImg.imageUrl);
            entries.push({
              id: gImg.id,
              title: gImg.prompt || session.title || 'Chat image',
              imageUrl: gImg.imageUrl,
              createdAt: gImg.createdAt || msg.timestamp,
              isFavorite: Boolean(gImg.isFavorite),
              source: 'chat',
              rawGenerated: gImg,
            });
          }
        }
        if (Array.isArray(msg.attachments)) {
          for (let idx = 0; idx < msg.attachments.length; idx++) {
            const att = msg.attachments[idx];
            if (att.type === 'image' && att.url && !seenUrls.has(att.url)) {
              seenUrls.add(att.url);
              entries.push({
                id: `chat_att_${msg.id}_${idx}`,
                title: att.name || session.title || 'Chat upload',
                imageUrl: att.url,
                createdAt: msg.timestamp,
                isFavorite: false,
                source: 'chat',
              });
            }
          }
        }
      }
    }

    entries.sort((a, b) =>
      sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );

    return entries;
  }, [references, images, chatSessions, sortOrder]);

  const query = searchQuery.trim().toLowerCase();

  const filteredImages = useMemo(() => {
    return allImageEntries.filter((entry) => {
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
      if (activeTab === 'favorites' && !entry.isFavorite) return false;
      if (activeTab === 'folders' && selectedFolderId) {
        if (selectedFolderId === 'smart_references' && entry.source !== 'reference') return false;
        else if (selectedFolderId === 'smart_generated' && entry.source !== 'generated') return false;
        else if (selectedFolderId === 'smart_chat' && entry.source !== 'chat') return false;
        else if (
          !selectedFolderId.startsWith('smart_') &&
          entry.folderId !== selectedFolderId
        ) {
          return false;
        }
      }
      if (query && !entry.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [allImageEntries, sourceFilter, activeTab, selectedFolderId, query]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (activeTab === 'favorites' && !v.isFavorite) return false;
      if (query && !v.prompt.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [videos, activeTab, query]);

  const filteredSongs = useMemo(() => {
    return songs.filter((s) => {
      if (activeTab === 'favorites' && !s.isFavorite) return false;
      if (
        query &&
        !s.title.toLowerCase().includes(query) &&
        !s.prompt.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [songs, activeTab, query]);

  const filteredChats = useMemo(() => {
    return chatSessions.filter((c) => {
      if (c.messages.length === 0) return false;
      if (query && !(c.title || '').toLowerCase().includes(query)) return false;
      return true;
    });
  }, [chatSessions, query]);

  const handleUploadReferences = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          libraryService.addReference({
            title: file.name.replace(/\.[^.]+$/, ''),
            imageUrl: reader.result,
            isFavorite: false,
            folderId:
              selectedFolderId && !selectedFolderId.startsWith('smart_')
                ? selectedFolderId
                : undefined,
            source: 'reference',
          });
          setReferences(libraryService.getReferences());
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateFolder = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = newFolderName.trim();
    if (!clean) return;
    const updated = libraryService.createFolder(clean);
    setFolders(updated);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setActiveTab('folders');
  };

  const handleToggleFavorite = (entry: UnifiedImageEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.source === 'reference') {
      setReferences(libraryService.toggleReferenceFavorite(entry.id));
    } else {
      if (entry.rawGenerated) {
        const updated = imageService.toggleFavorite(entry.rawGenerated.id);
        onUpdateImages(updated);
      }
      const updatedSessions = chatService.toggleImageFavoriteInSessions(
        entry.imageUrl,
        entry.rawGenerated?.id || entry.id
      );
      onUpdateChatSessions?.(updatedSessions);
    }
  };

  const handleDeleteEntry = (entry: UnifiedImageEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folderPickerItemId === entry.id) {
      setFolderPickerItemId(null);
    }

    const updatedRefs = libraryService.deleteReferenceByIdOrUrl(entry.id, entry.imageUrl);
    setReferences(updatedRefs);

    const updatedImages = imageService.deleteImageByIdOrUrl(
      entry.rawGenerated?.id || entry.id,
      entry.imageUrl
    );
    onUpdateImages(updatedImages);

    const updatedSessions = chatService.removeImageFromSessions(
      entry.imageUrl,
      entry.rawGenerated?.id || entry.id
    );
    onUpdateChatSessions?.(updatedSessions);
  };

  const handleOpenViewer = (entry: UnifiedImageEntry) => {
    const imgPayload: GeneratedImage = entry.rawGenerated || {
      id: entry.id,
      prompt: entry.title,
      imageUrl: entry.imageUrl,
      aspectRatio: '1:1',
      style: 'None',
      modelId: 'forge-2-ultra',
      createdAt: entry.createdAt,
      isFavorite: entry.isFavorite,
      engine: entry.source === 'reference' ? 'Library Reference' : 'ForgeX Chat Media',
    };
    onViewFullscreen('image', imgPayload);
  };

  const handleDownloadEntry = (entry: UnifiedImageEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = entry.imageUrl;
    a.download = `${(entry.title || 'library-image').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40)}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tabs: { id: LibraryTab; label: string }[] = [
    { id: 'suggested', label: 'Suggested' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'folders', label: 'Folders' },
    { id: 'images', label: 'Images' },
    { id: 'all', label: 'All' },
  ];

  const renderImageGrid = (items: UnifiedImageEntry[], emptyTitle: string, emptyHint: string) => {
    if (items.length === 0) {
      return (
        <div
          className={`rounded-2xl border border-dashed py-14 px-6 text-center ${
            isDark
              ? 'border-neutral-800 bg-neutral-900/30 text-neutral-400'
              : 'border-neutral-200 bg-white/70 text-neutral-600'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
              isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
          </div>
          <p className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
            {emptyTitle}
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed">{emptyHint}</p>
          <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                isDark
                  ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                  : 'border-neutral-300 text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reference</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToImage}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-neutral-950 text-white hover:bg-neutral-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Generate Image</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
        {items.map((entry) => {
          const isBroken = Boolean(brokenImageIds[entry.id]);
          const assignedFolder = entry.folderId
            ? folders.find((f) => f.id === entry.folderId)
            : undefined;
          return (
            <div
              key={entry.id}
              onClick={() => handleOpenViewer(entry)}
              className={`group relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'
                  : 'bg-white border-neutral-200/90 hover:border-neutral-400 shadow-2xs hover:shadow-md'
              }`}
            >
              {/* Uniform 1:1 Media Frame */}
              <div
                className={`relative aspect-square w-full overflow-hidden rounded-t-2xl ${
                  isDark ? 'bg-neutral-950' : 'bg-neutral-100'
                }`}
              >
                {isBroken ? (
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${
                      isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <ImageIcon className="w-6 h-6 mb-2 opacity-60" />
                    <span className="text-[11px] font-medium line-clamp-2">{entry.title}</span>
                  </div>
                ) : (
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() =>
                      setBrokenImageIds((prev) => ({ ...prev, [entry.id]: true }))
                    }
                    className="w-full h-full object-cover object-center block transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}

                {/* Subtle top gradient scrim for badge & hover quick actions */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/50 via-black/20 to-transparent opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150" />

                {/* Top-left Source / Folder pill */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {entry.source === 'reference' && folders.length > 0 ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderPickerItemId(
                            folderPickerItemId === entry.id ? null : entry.id
                          );
                        }}
                        title="Assign to folder"
                        className="px-2 py-1 rounded-lg bg-black/65 hover:bg-black/85 text-white text-[10px] font-medium inline-flex items-center gap-1 backdrop-blur-md cursor-pointer"
                      >
                        <Folder className="w-3 h-3" />
                        <span className="max-w-[72px] truncate">
                          {assignedFolder ? assignedFolder.name : 'Folder'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium text-white/95 bg-black/55 px-2 py-0.5 rounded-md backdrop-blur-md">
                      {entry.source === 'generated'
                        ? 'Generated'
                        : entry.source === 'reference'
                        ? 'Reference'
                        : 'Chat'}
                    </span>
                  )}
                </div>

                {/* Top-right Favorite & Download */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                  {(entry.source === 'reference' || entry.rawGenerated) && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(entry, e)}
                      title={entry.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                      className={`p-1.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                        entry.isFavorite
                          ? 'bg-rose-500 text-white'
                          : 'bg-black/60 hover:bg-black/80 text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${entry.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDownloadEntry(entry, e)}
                    title="Download image"
                    className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Folder dropdown popover rendered outside overflow-hidden media frame so it never clips */}
              {folderPickerItemId === entry.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute left-2.5 top-10 w-40 rounded-xl border p-1 shadow-xl z-30 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setReferences(
                        libraryService.assignReferenceFolder(entry.id, undefined)
                      );
                      setFolderPickerItemId(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-neutral-500/10"
                  >
                    No folder
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setReferences(
                          libraryService.assignReferenceFolder(entry.id, f.id)
                        );
                        setFolderPickerItemId(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-neutral-500/10 truncate"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Uniform Footer Row: Title + Delete button */}
              <div
                className={`px-3 py-2.5 flex items-center justify-between gap-2 rounded-b-2xl border-t ${
                  isDark ? 'border-neutral-800/80' : 'border-neutral-100'
                }`}
              >
                <p
                  className={`text-xs font-medium truncate min-w-0 flex-1 ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                  title={entry.title}
                >
                  {entry.title}
                </p>

                <button
                  type="button"
                  onClick={(e) => handleDeleteEntry(entry, e)}
                  title="Delete from library"
                  aria-label={`Delete ${entry.title}`}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                    isDark
                      ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15'
                      : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="workspace-library"
      className={`flex-1 overflow-y-auto custom-scrollbar ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleUploadReferences(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Row: Title on Left, Filter + Search + New on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="font-display font-bold text-2xl sm:text-[26px] tracking-tight">
            Library
          </h1>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Filter Dropdown */}
            <div ref={filterMenuRef} className="relative">
              <button
                type="button"
                id="library-btn-filter"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                title="Filter & Sort Library"
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  sourceFilter !== 'all'
                    ? isDark
                      ? 'bg-white text-black border-white'
                      : 'bg-neutral-900 text-white border-neutral-900'
                    : isDark
                    ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                    : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <ListFilter className="w-4 h-4" />
              </button>

              {isFilterOpen && (
                <div
                  className={`absolute right-0 top-full mt-2 w-52 rounded-2xl border p-2 shadow-xl z-40 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                    Sort Order
                  </p>
                  {(['newest', 'oldest'] as SortOrder[]).map((order) => (
                    <button
                      key={order}
                      type="button"
                      onClick={() => {
                        setSortOrder(order);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        sortOrder === order
                          ? isDark
                            ? 'bg-white/10 font-semibold text-white'
                            : 'bg-neutral-100 font-semibold text-black'
                          : 'hover:bg-neutral-500/10'
                      }`}
                    >
                      {order === 'newest' ? 'Newest first' : 'Oldest first'}
                    </button>
                  ))}

                  <div
                    className={`my-1.5 h-px ${
                      isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                    }`}
                  />
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                    Source
                  </p>
                  {(
                    [
                      { id: 'all', label: 'All sources' },
                      { id: 'reference', label: 'Uploaded references' },
                      { id: 'generated', label: 'Generated images' },
                      { id: 'chat', label: 'Chat media' },
                    ] as { id: SourceFilter; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSourceFilter(opt.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        sourceFilter === opt.id
                          ? isDark
                            ? 'bg-white/10 font-semibold text-white'
                            : 'bg-neutral-100 font-semibold text-black'
                          : 'hover:bg-neutral-500/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Library Input */}
            <div
              className={`relative flex items-center rounded-full border px-3.5 h-9 w-full sm:w-60 transition-colors ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-600 text-neutral-100'
                  : 'bg-white border-neutral-200 focus-within:border-neutral-400 text-neutral-900 shadow-2xs'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-2" />
              <input
                id="library-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search library"
                className="w-full bg-transparent text-xs outline-none placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Black "New" Button */}
            <div ref={newMenuRef} className="relative shrink-0">
              <button
                type="button"
                id="library-btn-new"
                onClick={() => setIsNewMenuOpen((prev) => !prev)}
                className={`h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? 'bg-white hover:bg-neutral-200 text-black'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-white'
                }`}
              >
                <span>New</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {isNewMenuOpen && (
                <div
                  className={`absolute right-0 top-full mt-2 w-48 rounded-2xl border p-1.5 shadow-xl z-40 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-neutral-500/10 text-left"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image(s)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      setIsCreatingFolder(true);
                      setActiveTab('folders');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-neutral-500/10 text-left"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>New Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onNavigateToImage();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-neutral-500/10 text-left"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Generate Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onNewChat();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-neutral-500/10 text-left"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs: Suggested · Favorites · Folders · Images · All */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`library-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'folders') setSelectedFolderId(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                      : 'bg-neutral-200/80 text-neutral-950 font-semibold border border-neutral-300/80'
                    : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* IMAGES TAB */}
        {activeTab === 'images' && (
          <div className="space-y-5">
            {/* Images & References Header Row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Visual Collection
                </h2>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {filteredImages.length} {filteredImages.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <button
                type="button"
                id="library-btn-add-reference"
                onClick={() => fileInputRef.current?.click()}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                    : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 shadow-2xs'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reference</span>
              </button>
            </div>

            {renderImageGrid(
              filteredImages,
              'No images in your library yet',
              'Add reference photos or generate visuals in Image Studio or ForgeX Chat to see them collected here.'
            )}
          </div>
        )}

        {/* SUGGESTED TAB */}
        {activeTab === 'suggested' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recommended & Recent</h2>
              <span className="text-xs text-neutral-500 tabular-nums">
                {Math.min(filteredImages.length, 10)} highlights
              </span>
            </div>

            {renderImageGrid(
              filteredImages.slice(0, 12),
              'Nothing suggested yet',
              'Start chatting, generating visuals, or uploading reference images to see curated highlights.'
            )}

            {filteredChats.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Recent Conversations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredChats.slice(0, 6).map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isDark
                          ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-600'
                          : 'bg-white border-neutral-200 hover:border-neutral-400 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <p className="text-xs font-semibold truncate">
                          {chat.title || 'New conversation'}
                        </p>
                      </div>
                      <p className="text-[11px] text-neutral-500 tabular-nums">
                        {chat.messages.length} messages · {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Saved Favorites</h2>
              <span className="text-xs text-neutral-500 tabular-nums">
                {filteredImages.length + filteredVideos.length + filteredSongs.length} favorited
              </span>
            </div>

            {renderImageGrid(
              filteredImages,
              'No favorite images yet',
              'Hover over any image in your library and click the heart icon to save it here.'
            )}
          </div>
        )}

        {/* FOLDERS TAB */}
        {activeTab === 'folders' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">
                  {selectedFolderId
                    ? selectedFolderId === 'smart_references'
                      ? 'Folders / References'
                      : selectedFolderId === 'smart_generated'
                      ? 'Folders / Generated Images'
                      : selectedFolderId === 'smart_chat'
                      ? 'Folders / Chat Media'
                      : `Folders / ${
                          folders.find((f) => f.id === selectedFolderId)?.name || 'Folder'
                        }`
                    : 'Folders'}
                </h2>
                {selectedFolderId && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer"
                  >
                    Back to all folders
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                    : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Folder</span>
              </button>
            </div>

            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                className={`p-3 rounded-2xl border flex items-center gap-2 max-w-md ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800'
                    : 'bg-white border-neutral-200 shadow-2xs'
                }`}
              >
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="flex-1 bg-transparent text-xs outline-none px-2"
                />
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                    isDark ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {!selectedFolderId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {[
                  {
                    id: 'smart_references',
                    name: 'Uploaded References',
                    count: allImageEntries.filter((i) => i.source === 'reference').length,
                    isSmart: true,
                  },
                  {
                    id: 'smart_generated',
                    name: 'Generated Images',
                    count: allImageEntries.filter((i) => i.source === 'generated').length,
                    isSmart: true,
                  },
                  {
                    id: 'smart_chat',
                    name: 'Chat Media',
                    count: allImageEntries.filter((i) => i.source === 'chat').length,
                    isSmart: true,
                  },
                  ...folders.map((f) => ({
                    id: f.id,
                    name: f.name,
                    count: allImageEntries.filter((i) => i.folderId === f.id).length,
                    isSmart: false,
                  })),
                ].map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`group p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isDark
                        ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-600'
                        : 'bg-white border-neutral-200 hover:border-neutral-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{folder.name}</p>
                        <p className="text-[11px] text-neutral-500 tabular-nums">
                          {folder.count} {folder.count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    {!folder.isSmart && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const res = libraryService.deleteFolder(folder.id);
                          setFolders(res.folders);
                          setReferences(res.refs);
                        }}
                        title="Delete folder"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              renderImageGrid(
                filteredImages,
                'This folder is empty',
                'Upload reference images while inside this folder or assign existing references from the Images tab.'
              )
            )}
          </div>
        )}

        {/* ALL TAB */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Images</h2>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {filteredImages.length}
                </span>
              </div>
              {renderImageGrid(
                filteredImages,
                'No images found',
                'Upload references or generate images to populate your visual library.'
              )}
            </div>

            {filteredVideos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Videos</h2>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {filteredVideos.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => onViewFullscreen('video', vid)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        isDark
                          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'
                          : 'bg-white border-neutral-200 hover:border-neutral-400 shadow-2xs'
                      }`}
                    >
                      <div className="w-16 h-12 rounded-xl overflow-hidden bg-black shrink-0 flex items-center justify-center">
                        {vid.thumbnailUrl ? (
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.prompt}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <VideoIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{vid.prompt}</p>
                        <p className="text-[11px] text-neutral-500 tabular-nums mt-0.5">
                          {vid.duration} · {vid.aspectRatio}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredSongs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Audio & Songs</h2>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {filteredSongs.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredSongs.map((song) => (
                    <div
                      key={song.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 ${
                        isDark
                          ? 'bg-neutral-900 border-neutral-800'
                          : 'bg-white border-neutral-200 shadow-2xs'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-neutral-800 text-white flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{song.title}</p>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {song.genre} · {song.mood}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredChats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Conversations</h2>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {filteredChats.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isDark
                          ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-600'
                          : 'bg-white border-neutral-200 hover:border-neutral-400 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <p className="text-xs font-semibold truncate">
                          {chat.title || 'New conversation'}
                        </p>
                      </div>
                      <p className="text-[11px] text-neutral-500 tabular-nums">
                        {chat.messages.length} messages · {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
