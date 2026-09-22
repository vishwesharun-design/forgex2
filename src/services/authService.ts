import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { UserProfile } from '../types';
import { firestoreStorageService } from './firestoreStorageService';

export interface StoredAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  creditsUsed: number;
  creditsLimit: number;
  avatarUrl?: string;
  isGoogleUser?: boolean;
}

const STORAGE_KEY_ACCOUNTS = 'forgex_registered_accounts';
const STORAGE_KEY_SESSION = 'forgex_session_user';
const STORAGE_KEY_AUTH = 'forgex_is_authenticated';

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fx_' + btoa(hash.toString() + '_' + password.length);
}

function getInitialDefaultAccounts(): StoredAccount[] {
  return [
    {
      id: 'usr_vishwesh',
      name: 'Vishwesh',
      username: 'vishwesh',
      email: 'vishwesh@forgex.local',
      passwordHash: hashPassword('password123'),
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      creditsUsed: 120,
      creditsLimit: 1000,
    },
    {
      id: 'usr_virthika',
      name: 'Virthika',
      username: 'virthika',
      email: 'virthika@forgex.local',
      passwordHash: hashPassword('password123'),
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
      creditsUsed: 45,
      creditsLimit: 1000,
    }
  ];
}

function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const parsed: StoredAccount[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load registered accounts', e);
  }

  const initial = getInitialDefaultAccounts();
  saveRegisteredAccounts(initial);
  return initial;
}

function saveRegisteredAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts', e);
  }
}

function dispatchAuthChanged(user: UserProfile | null) {
  try {
    window.dispatchEvent(new CustomEvent('forgex:auth_changed', { detail: user }));
  } catch (_e) {
    // Ignore in non-browser environments
  }
}

// Global active auth listener
let isInitialized = false;

export const authService = {
  init(): void {
    if (isInitialized) return;
    isInitialized = true;

    // Listen to Firebase Auth state
    onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // User is logged into Firebase
        const existingLocal = this.getCurrentUser();
        // Load cloud profile from Firestore
        const cloudProfile = await firestoreStorageService.loadUserProfile(fbUser.uid);
        
        const userProfile: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || cloudProfile?.name || existingLocal?.name || 'ForgeX Creator',
          email: fbUser.email || cloudProfile?.email || '',
          avatarUrl: fbUser.photoURL || cloudProfile?.avatarUrl || existingLocal?.avatarUrl || '',
          creditsUsed: cloudProfile?.creditsUsed ?? existingLocal?.creditsUsed ?? 0,
          creditsLimit: cloudProfile?.creditsLimit ?? existingLocal?.creditsLimit ?? 2500,
          isGoogleUser: true,
          username: fbUser.email ? fbUser.email.split('@')[0] : 'creator',
        };

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        // Keep Firestore in sync
        firestoreStorageService.saveUserProfile(userProfile).catch(() => {});
        dispatchAuthChanged(userProfile);
      }
    });
  },

  getCurrentUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && (parsed.username || parsed.email || parsed.name)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load current session', e);
    }
    return null;
  },

  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    return user && user.id ? user.id : 'guest';
  },

  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return Boolean(user && localStorage.getItem(STORAGE_KEY_AUTH) === 'true');
  },

  getAvailableAccounts(): { id: string; name: string; username: string; email: string }[] {
    const accounts = getRegisteredAccounts();
    return accounts.map(a => ({
      id: a.id,
      name: a.name,
      username: a.username || a.name.toLowerCase().replace(/\s+/g, ''),
      email: a.email,
    }));
  },

  // --- CONTINUE WITH GOOGLE ---
  async signInWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Check if profile exists in Firestore
      const existingDoc = await firestoreStorageService.loadUserProfile(fbUser.uid);

      const userProfile: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || 'ForgeX Creator',
        email: fbUser.email || '',
        avatarUrl: fbUser.photoURL || '',
        creditsUsed: existingDoc?.creditsUsed ?? 0,
        creditsLimit: existingDoc?.creditsLimit ?? 2500,
        username: fbUser.email ? fbUser.email.split('@')[0] : 'creator',
        isGoogleUser: true,
      };

      // Store in Firestore under this user's isolated document
      await firestoreStorageService.saveUserProfile(userProfile);

      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      dispatchAuthChanged(userProfile);
      return userProfile;
    } catch (error: any) {
      console.error('Firebase Google Sign-In error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please click "Continue with Google" again.');
      } else if (error?.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by browser. Please allow popups or open in new window.');
      } else if (error?.code === 'auth/network-request-failed') {
        throw new Error('Network error during Google sign in. Please check your internet connection.');
      }
      throw new Error(error?.message || 'Failed to sign in with Google. Please try again.');
    }
  },

  // --- EMAIL / PASSWORD SIGN IN ---
  async signIn(identifierInput: string, passwordInput: string): Promise<UserProfile> {
    const raw = (identifierInput || '').trim();
    const identifier = raw.toLowerCase();
    const password = passwordInput || '';

    if (!identifier) {
      throw new Error('Please enter your username or email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    // If it looks like an email, attempt Firebase Auth first
    if (identifier.includes('@')) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, identifier, password);
        const fbUser = userCred.user;
        const cloudDoc = await firestoreStorageService.loadUserProfile(fbUser.uid);
        
        const profile: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || cloudDoc?.name || identifier.split('@')[0],
          email: fbUser.email || identifier,
          avatarUrl: fbUser.photoURL || cloudDoc?.avatarUrl || '',
          creditsUsed: cloudDoc?.creditsUsed ?? 0,
          creditsLimit: cloudDoc?.creditsLimit ?? 1500,
          username: identifier.split('@')[0],
        };

        await firestoreStorageService.saveUserProfile(profile);
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(profile));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        dispatchAuthChanged(profile);
        return profile;
      } catch (fbErr: any) {
        // If Firebase says wrong password or user not found, check local accounts fallback
        if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
          // Check local stored accounts
        }
      }
    }

    // Local / Demo accounts fallback (Vishwesh, Virthika, or locally registered)
    const accounts = getRegisteredAccounts();
    const account = accounts.find((acc) => {
      const accUser = (acc.username || '').toLowerCase();
      const accEmail = (acc.email || '').toLowerCase();
      const accName = (acc.name || '').toLowerCase();
      return accUser === identifier || accEmail === identifier || accName === identifier;
    });

    if (!account) {
      throw new Error(`No account found for "${raw}". Click "Create an Account" or "Continue with Google".`);
    }

    const inputHash = hashPassword(password);
    const isSpecialTestAccount = (account.username === 'vishwesh' || account.username === 'virthika') &&
      (password === 'password' || password === 'password123' || password === '123456');

    if (account.passwordHash !== inputHash && !isSpecialTestAccount) {
      throw new Error('Incorrect password. Please verify your credentials and try again.');
    }

    const userProfile: UserProfile = {
      id: account.id,
      name: account.name,
      email: account.email,
      creditsUsed: account.creditsUsed,
      creditsLimit: account.creditsLimit,
      username: account.username,
      avatarUrl: account.avatarUrl,
    };

    // Also sync to Firestore
    firestoreStorageService.saveUserProfile(userProfile).catch(() => {});

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    dispatchAuthChanged(userProfile);
    return userProfile;
  },

  // --- EMAIL / PASSWORD SIGN UP ---
  async signUp(nameInput: string, identifierInput: string, passwordInput: string): Promise<UserProfile> {
    const name = (nameInput || '').trim();
    const rawIdentifier = (identifierInput || '').trim();
    const identifier = rawIdentifier.toLowerCase();
    const password = passwordInput || '';

    if (!name) {
      throw new Error('Please enter your name.');
    }
    if (!identifier || identifier.length < 3) {
      throw new Error('Please enter a valid username or email (at least 3 characters).');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const isEmail = identifier.includes('@');
    const validEmail = isEmail ? identifier : `${identifier.replace(/[^a-zA-Z0-9_]/g, '')}@forgex.app`;

    // Attempt Firebase Email/Password creation if possible
    try {
      const cred = await createUserWithEmailAndPassword(auth, validEmail, password);
      const fbUser = cred.user;
      
      const userProfile: UserProfile = {
        id: fbUser.uid,
        name: name,
        email: validEmail,
        creditsUsed: 0,
        creditsLimit: 1500,
        username: isEmail ? identifier.split('@')[0] : identifier,
      };

      await firestoreStorageService.saveUserProfile(userProfile);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      dispatchAuthChanged(userProfile);
      return userProfile;
    } catch (fbErr: any) {
      // If Firebase Auth email/pass is disabled or errors, fallback seamlessly to local account + Firestore sync
      console.warn('Firebase createUserWithEmailAndPassword fallback:', fbErr?.message);
    }

    // Local account registration fallback
    const accounts = getRegisteredAccounts();
    const existing = accounts.find((acc) => {
      const accUser = (acc.username || '').toLowerCase();
      const accEmail = (acc.email || '').toLowerCase();
      return accUser === identifier || accEmail === identifier;
    });

    if (existing) {
      throw new Error(`An account with username or email "${rawIdentifier}" already exists. Please sign in instead.`);
    }

    const username = isEmail ? identifier.split('@')[0] : identifier;
    const userId = 'usr_' + username.replace(/[^a-zA-Z0-9_]/g, '') + '_' + Date.now().toString(36);

    const newAccount: StoredAccount = {
      id: userId,
      name: name,
      username: username,
      email: validEmail,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
      creditsUsed: 0,
      creditsLimit: 1500,
    };

    accounts.push(newAccount);
    saveRegisteredAccounts(accounts);

    const userProfile: UserProfile = {
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      creditsUsed: newAccount.creditsUsed,
      creditsLimit: newAccount.creditsLimit,
      username: newAccount.username,
    };

    // Save to Firestore under isolated user ID
    firestoreStorageService.saveUserProfile(userProfile).catch(() => {});

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    dispatchAuthChanged(userProfile);
    return userProfile;
  },

  async resetPassword(identifierInput: string, newPasswordInput: string): Promise<void> {
    const identifier = (identifierInput || '').trim().toLowerCase();
    const newPassword = newPasswordInput || '';

    if (!identifier) {
      throw new Error('Please enter your account username or email.');
    }
    if (newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters long.');
    }

    const accounts = getRegisteredAccounts();
    const index = accounts.findIndex((acc) => {
      const accUser = (acc.username || '').toLowerCase();
      const accEmail = (acc.email || '').toLowerCase();
      return accUser === identifier || accEmail === identifier;
    });

    if (index === -1) {
      throw new Error(`No account found for "${identifierInput}".`);
    }

    accounts[index].passwordHash = hashPassword(newPassword);
    saveRegisteredAccounts(accounts);
  },

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    dispatchAuthChanged(null);
  },

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('No active user session found to update.');
    }

    const updated: UserProfile = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));

    // Update in Firestore as well
    firestoreStorageService.saveUserProfile(updated).catch(() => {});

    const accounts = getRegisteredAccounts();
    const index = accounts.findIndex((acc) => acc.id === current.id);
    if (index !== -1) {
      if (updates.name) accounts[index].name = updates.name;
      if (updates.email) accounts[index].email = updates.email;
      if (updates.creditsUsed !== undefined) accounts[index].creditsUsed = updates.creditsUsed;
      if (updates.avatarUrl) accounts[index].avatarUrl = updates.avatarUrl;
      saveRegisteredAccounts(accounts);
    }

    dispatchAuthChanged(updated);
    return updated;
  },

  updateUser(updates: Partial<UserProfile>): UserProfile {
    return this.updateProfile(updates);
  }
};

// Initialize listener right away
authService.init();
