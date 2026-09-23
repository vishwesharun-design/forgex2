import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { authService } from './authService';
import { GeneratedSong } from '../types';
import { firestoreStorageService } from './firestoreStorageService';

export const storageService = {
  /**
   * Upload an arbitrary Blob or File to Firebase Storage
   * Falls back gracefully to an in-memory object URL if offline or unauthenticated.
   */
  async uploadFile(blobOrFile: Blob | File, destinationPath: string): Promise<string> {
    try {
      const storageRef = ref(storage, destinationPath);
      const snapshot = await uploadBytes(storageRef, blobOrFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err: any) {
      console.warn('Firebase Storage upload notice (falling back to local URL):', err?.message || err);
      // Create local fallback URL so user experience is never blocked
      return URL.createObjectURL(blobOrFile);
    }
  },

  /**
   * Upload audio file to user's isolated folder in Firebase Storage:
   * /users/{userId}/audio/{fileName}
   */
  async uploadAudio(audioBlob: Blob, fileName: string, customUserId?: string): Promise<string> {
    const userId = customUserId || authService.getCurrentUserId();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `users/${userId}/audio/${Date.now()}_${cleanFileName}`;
    return this.uploadFile(audioBlob, path);
  },

  /**
   * Upload image to user's isolated folder in Firebase Storage:
   * /users/{userId}/images/{fileName}
   */
  async uploadImage(imageBlob: Blob, fileName: string, customUserId?: string): Promise<string> {
    const userId = customUserId || authService.getCurrentUserId();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `users/${userId}/images/${Date.now()}_${cleanFileName}`;
    return this.uploadFile(imageBlob, path);
  },

  /**
   * Upload a generated song's audio track to Firebase Storage and sync to Firestore
   */
  async saveSongAudioToStorage(song: GeneratedSong, audioBlob: Blob): Promise<{ success: boolean; cloudUrl: string }> {
    const userId = authService.getCurrentUserId();
    const safeTitle = song.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const fileName = `${safeTitle}_${song.id}.wav`;
    
    try {
      const cloudUrl = await this.uploadAudio(audioBlob, fileName, userId);
      
      // Update song with cloud storage reference
      song.cloudStorageUrl = cloudUrl;
      if (!song.audioUrl || song.audioUrl.startsWith('blob:')) {
        song.audioUrl = cloudUrl;
      }
      
      // Persist to Firestore if user is authenticated
      if (userId && userId !== 'guest') {
        await firestoreStorageService.saveUserSong(userId, song);
      }

      return { success: true, cloudUrl };
    } catch (err: any) {
      console.warn('Failed to save song to Firebase Storage:', err);
      const fallbackUrl = URL.createObjectURL(audioBlob);
      return { success: false, cloudUrl: fallbackUrl };
    }
  },

  /**
   * Delete an object from Firebase Storage if it exists
   */
  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      return true;
    } catch (err) {
      console.warn('Firebase Storage deleteFile skipped:', err);
      return false;
    }
  },
};
