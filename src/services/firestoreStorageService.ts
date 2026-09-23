import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatSession, GeneratedImage, GeneratedSong, GeneratedVideo, UserProfile, UserSettings } from '../types';

export interface UserWebSearchItem {
  id: string;
  query: string;
  correctedQuery?: string;
  didYouMean?: string;
  exactApp?: {
    name: string;
    url: string;
    category?: string;
    developer?: string;
    description?: string;
    access?: string;
  };
  summary: string;
  sources: { title: string; url: string; snippet?: string }[];
  searchType: 'fast' | 'deep';
  timestamp: number;
}

/**
 * Checks if the current Firebase Auth user is authorized to read/write this user ID.
 * Prevents unauthenticated permission errors in the console when operating in guest/demo mode.
 */
function isAuthorizedForUser(userId: string): boolean {
  if (!userId || userId === 'guest') return false;
  const current = auth.currentUser;
  if (!current) return false;
  return current.uid === userId;
}

export const firestoreStorageService = {
  // --- USER PROFILE STORAGE ---
  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!profile || !profile.id) return;
    if (!isAuthorizedForUser(profile.id)) return;

    try {
      const userRef = doc(db, 'users', profile.id);
      await setDoc(userRef, {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl || '',
        creditsUsed: profile.creditsUsed ?? 0,
        creditsLimit: profile.creditsLimit ?? 2500,
        username: profile.username || '',
        isGoogleUser: Boolean(profile.isGoogleUser),
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserProfile notice:', err);
    }
  },

  async loadUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId || !isAuthorizedForUser(userId)) return null;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          id: userId,
          name: d.name || 'ForgeX Creator',
          email: d.email || '',
          avatarUrl: d.avatarUrl || '',
          creditsUsed: d.creditsUsed ?? 0,
          creditsLimit: d.creditsLimit ?? 2500,
          username: d.username,
          isGoogleUser: d.isGoogleUser,
        };
      }
    } catch (err) {
      console.warn('Firestore loadUserProfile notice:', err);
    }
    return null;
  },

  // --- SEPARATE USER CHATS STORAGE ---
  async saveUserChat(userId: string, session: ChatSession): Promise<void> {
    if (!userId || !session || !session.id) return;
    if (!isAuthorizedForUser(userId)) return;

    try {
      const chatRef = doc(db, 'users', userId, 'chats', session.id);
      await setDoc(chatRef, {
        ...session,
        userId,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserChat notice:', err);
    }
  },

  async loadUserChats(userId: string): Promise<ChatSession[]> {
    if (!userId || !isAuthorizedForUser(userId)) return [];
    try {
      const chatsRef = collection(db, 'users', userId, 'chats');
      const q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const list: ChatSession[] = [];
      snap.forEach((d) => {
        const data = d.data() as ChatSession;
        list.push({
          id: d.id,
          title: data.title || 'Untitled Chat',
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          modelId: data.modelId || 'unreal-5',
          messages: Array.isArray(data.messages) ? data.messages : [],
        });
      });
      return list;
    } catch (err) {
      console.warn('Firestore loadUserChats notice:', err);
      return [];
    }
  },

  async deleteUserChat(userId: string, chatId: string): Promise<void> {
    if (!userId || !chatId || !isAuthorizedForUser(userId)) return;
    try {
      const chatRef = doc(db, 'users', userId, 'chats', chatId);
      await deleteDoc(chatRef);
    } catch (err) {
      console.warn('Firestore deleteUserChat notice:', err);
    }
  },

  // --- SEPARATE USER IMAGES STORAGE ---
  async saveUserImage(userId: string, image: GeneratedImage): Promise<void> {
    if (!userId || !image || !image.id) return;
    if (!isAuthorizedForUser(userId)) return;

    try {
      const imgRef = doc(db, 'users', userId, 'images', image.id);
      await setDoc(imgRef, {
        ...image,
        userId,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserImage notice:', err);
    }
  },

  async loadUserImages(userId: string): Promise<GeneratedImage[]> {
    if (!userId || !isAuthorizedForUser(userId)) return [];
    try {
      const imgsRef = collection(db, 'users', userId, 'images');
      const q = query(imgsRef, orderBy('timestamp', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list: GeneratedImage[] = [];
      snap.forEach((d) => {
        list.push(d.data() as GeneratedImage);
      });
      return list;
    } catch (err) {
      console.warn('Firestore loadUserImages notice:', err);
      return [];
    }
  },

  async deleteUserImage(userId: string, imageId: string): Promise<void> {
    if (!userId || !imageId || !isAuthorizedForUser(userId)) return;
    try {
      const imgRef = doc(db, 'users', userId, 'images', imageId);
      await deleteDoc(imgRef);
    } catch (err) {
      console.warn('Firestore deleteUserImage notice:', err);
    }
  },

  // --- SEPARATE USER SONGS STORAGE ---
  async saveUserSong(userId: string, song: GeneratedSong): Promise<void> {
    if (!userId || !song || !song.id) return;
    if (!isAuthorizedForUser(userId)) return;

    try {
      const songRef = doc(db, 'users', userId, 'songs', song.id);
      await setDoc(songRef, {
        ...song,
        userId,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserSong notice:', err);
    }
  },

  async loadUserSongs(userId: string): Promise<GeneratedSong[]> {
    if (!userId || !isAuthorizedForUser(userId)) return [];
    try {
      const songsRef = collection(db, 'users', userId, 'songs');
      const q = query(songsRef, orderBy('createdAt', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list: GeneratedSong[] = [];
      snap.forEach((d) => {
        list.push(d.data() as GeneratedSong);
      });
      return list;
    } catch (err) {
      console.warn('Firestore loadUserSongs notice:', err);
      return [];
    }
  },

  async deleteUserSong(userId: string, songId: string): Promise<void> {
    if (!userId || !songId || !isAuthorizedForUser(userId)) return;
    try {
      const songRef = doc(db, 'users', userId, 'songs', songId);
      await deleteDoc(songRef);
    } catch (err) {
      console.warn('Firestore deleteUserSong notice:', err);
    }
  },

  // --- SEPARATE USER VIDEOS STORAGE ---
  async saveUserVideo(userId: string, video: GeneratedVideo): Promise<void> {
    if (!userId || !video || !video.id) return;
    if (!isAuthorizedForUser(userId)) return;

    try {
      const vidRef = doc(db, 'users', userId, 'videos', video.id);
      await setDoc(vidRef, {
        ...video,
        userId,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserVideo notice:', err);
    }
  },

  async loadUserVideos(userId: string): Promise<GeneratedVideo[]> {
    if (!userId || !isAuthorizedForUser(userId)) return [];
    try {
      const vidsRef = collection(db, 'users', userId, 'videos');
      const q = query(vidsRef, orderBy('createdAt', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list: GeneratedVideo[] = [];
      snap.forEach((d) => {
        list.push(d.data() as GeneratedVideo);
      });
      return list;
    } catch (err) {
      console.warn('Firestore loadUserVideos notice:', err);
      return [];
    }
  },

  async deleteUserVideo(userId: string, videoId: string): Promise<void> {
    if (!userId || !videoId || !isAuthorizedForUser(userId)) return;
    try {
      const vidRef = doc(db, 'users', userId, 'videos', videoId);
      await deleteDoc(vidRef);
    } catch (err) {
      console.warn('Firestore deleteUserVideo notice:', err);
    }
  },

  // --- SEPARATE USER WEB SEARCHES STORAGE ---
  async saveUserWebSearch(userId: string, search: UserWebSearchItem): Promise<void> {
    if (!userId || !search || !isAuthorizedForUser(userId)) return;
    try {
      const searchId = search.id || `search_${search.timestamp}`;
      const searchRef = doc(db, 'users', userId, 'webSearches', searchId);
      await setDoc(searchRef, {
        ...search,
        id: searchId,
        userId,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserWebSearch notice:', err);
    }
  },

  async loadUserWebSearches(userId: string): Promise<UserWebSearchItem[]> {
    if (!userId || !isAuthorizedForUser(userId)) return [];
    try {
      const searchesRef = collection(db, 'users', userId, 'webSearches');
      const q = query(searchesRef, orderBy('timestamp', 'desc'), limit(60));
      const snap = await getDocs(q);
      const list: UserWebSearchItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as UserWebSearchItem;
        list.push({
          ...data,
          id: d.id,
        });
      });
      return list;
    } catch (err) {
      console.warn('Firestore loadUserWebSearches notice:', err);
      return [];
    }
  },

  async deleteUserWebSearch(userId: string, searchId: string): Promise<void> {
    if (!userId || !searchId || !isAuthorizedForUser(userId)) return;
    try {
      const searchRef = doc(db, 'users', userId, 'webSearches', searchId);
      await deleteDoc(searchRef);
    } catch (err) {
      console.warn('Firestore deleteUserWebSearch notice:', err);
    }
  },

  async clearUserWebSearches(userId: string): Promise<void> {
    if (!userId || !isAuthorizedForUser(userId)) return;
    try {
      const searchesRef = collection(db, 'users', userId, 'webSearches');
      const snap = await getDocs(searchesRef);
      const promises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(promises);
    } catch (err) {
      console.warn('Firestore clearUserWebSearches notice:', err);
    }
  },

  // --- SEPARATE USER SETTINGS STORAGE ---
  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    if (!userId || !settings || !isAuthorizedForUser(userId)) return;
    try {
      const setRef = doc(db, 'users', userId, 'settings', 'preferences');
      await setDoc(setRef, {
        ...settings,
        userId,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserSettings notice:', err);
    }
  },

  async loadUserSettings(userId: string): Promise<UserSettings | null> {
    if (!userId || !isAuthorizedForUser(userId)) return null;
    try {
      const setRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snap = await getDoc(setRef);
      if (snap.exists()) {
        return snap.data() as UserSettings;
      }
    } catch (err) {
      console.warn('Firestore loadUserSettings notice:', err);
    }
    return null;
  }
};
