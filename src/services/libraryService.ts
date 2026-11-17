import { LibraryFolder, LibraryReferenceItem } from '../types';
import { authService } from './authService';

function getRefStorageKey(): string {
  return `forgex_library_refs_${authService.getCurrentUserPartitionKey()}`;
}

function getFolderStorageKey(): string {
  return `forgex_library_folders_${authService.getCurrentUserPartitionKey()}`;
}

export const libraryService = {
  getReferences(): LibraryReferenceItem[] {
    try {
      const raw = localStorage.getItem(getRefStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore parse failures
    }
    return [];
  },

  saveReferences(items: LibraryReferenceItem[]): void {
    try {
      localStorage.setItem(getRefStorageKey(), JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save library references:', e);
    }
  },

  addReference(item: Omit<LibraryReferenceItem, 'id' | 'createdAt'>): LibraryReferenceItem {
    const newItem: LibraryReferenceItem = {
      ...item,
      id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      source: item.source || 'reference',
    };
    const updated = [newItem, ...this.getReferences()];
    this.saveReferences(updated);
    return newItem;
  },

  toggleReferenceFavorite(id: string): LibraryReferenceItem[] {
    const updated = this.getReferences().map((r) =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    );
    this.saveReferences(updated);
    return updated;
  },

  assignReferenceFolder(id: string, folderId: string | undefined): LibraryReferenceItem[] {
    const updated = this.getReferences().map((r) =>
      r.id === id ? { ...r, folderId } : r
    );
    this.saveReferences(updated);
    return updated;
  },

  deleteReference(id: string): LibraryReferenceItem[] {
    const updated = this.getReferences().filter((r) => r.id !== id);
    this.saveReferences(updated);
    return updated;
  },

  getFolders(): LibraryFolder[] {
    try {
      const raw = localStorage.getItem(getFolderStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore parse failures
    }
    return [];
  },

  saveFolders(folders: LibraryFolder[]): void {
    try {
      localStorage.setItem(getFolderStorageKey(), JSON.stringify(folders));
    } catch (e) {
      console.warn('Failed to save library folders:', e);
    }
  },

  createFolder(name: string): LibraryFolder[] {
    const clean = name.trim();
    if (!clean) return this.getFolders();
    const folder: LibraryFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      createdAt: Date.now(),
    };
    const updated = [folder, ...this.getFolders()];
    this.saveFolders(updated);
    return updated;
  },

  deleteFolder(folderId: string): { folders: LibraryFolder[]; refs: LibraryReferenceItem[] } {
    const folders = this.getFolders().filter((f) => f.id !== folderId);
    this.saveFolders(folders);
    const refs = this.getReferences().map((r) =>
      r.folderId === folderId ? { ...r, folderId: undefined } : r
    );
    this.saveReferences(refs);
    return { folders, refs };
  },
};
