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

export interface SavedGoogleAccount {
  email: string;
  name: string;
  avatarUrl?: string;
  lastUsed: number;
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

function isDemoAccount(acc: any): boolean {
  if (!acc) return false;
  const id = String(acc.id || '');
  const email = String(acc.email || '').toLowerCase();
  const username = String(acc.username || '').toLowerCase();
  return (
    id === 'usr_vishwesh' ||
    id === 'usr_virthika' ||
    email.endsWith('@forgex.local') ||
    email === 'vishwesh@forgex.local' ||
    email === 'virthika@forgex.local' ||
    username === 'vishwesh' ||
    username === 'virthika'
  );
}

function getInitialDefaultAccounts(): StoredAccount[] {
  return [];
}

function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const parsed: StoredAccount[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleanAccounts = parsed.filter((acc) => !isDemoAccount(acc));
        if (cleanAccounts.length !== parsed.length) {
          saveRegisteredAccounts(cleanAccounts);
        }
        return cleanAccounts;
      }
    }
  } catch (e) {
    console.error('Failed to load registered accounts', e);
  }

  return [];
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

    // Purge any stale demo accounts from storage
    try {
      const rawSession = localStorage.getItem(STORAGE_KEY_SESSION);
      if (rawSession) {
        const parsedSession = JSON.parse(rawSession);
        if (isDemoAccount(parsedSession)) {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_AUTH);
        }
      }
      const lastEmail = localStorage.getItem('forgex_last_google_email');
      if (lastEmail && lastEmail.includes('vishwesharun')) {
        localStorage.removeItem('forgex_last_google_email');
      }
      const known = localStorage.getItem('forgex_known_google_accounts');
      if (known && known.includes('vishwesharun')) {
        localStorage.removeItem('forgex_known_google_accounts');
      }
    } catch (_e) {
      // Ignore cleanup error
    }

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
        if (parsed && isDemoAccount(parsed)) {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_AUTH);
          return null;
        }
        if (parsed && parsed.id && (parsed.username || parsed.email || parsed.name)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load current session', e);
    }
    return null;
  },

  /**
   * Returns a canonical storage partition key for the current user.
   * Prioritizes the person's email address so that each email has a strictly
   * separate database, history, and asset vault.
   * Example: "email_alex_at_domain_com"
   */
  getCurrentUserPartitionKey(): string {
    const user = this.getCurrentUser();
    if (!user) {
      try {
        let guestId = localStorage.getItem('forgex_guest_device_id');
        if (!guestId) {
          guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('forgex_guest_device_id', guestId);
        }
        return guestId;
      } catch {
        return 'guest_device';
      }
    }
    const email = (user.email || '').trim().toLowerCase();
    if (email && email.includes('@')) {
      const safeEmail = email.replace(/@/g, '_at_').replace(/[^a-z0-9_]/g, '_');
      return `email_${safeEmail}`;
    }
    if (user.id) {
      return `usr_${user.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    }
    return 'guest_device';
  },

  getCurrentUserEmail(): string {
    const user = this.getCurrentUser();
    return (user?.email || '').trim().toLowerCase();
  },

  getCurrentUserId(): string {
    if (auth.currentUser && auth.currentUser.uid) {
      return auth.currentUser.uid;
    }
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

  getKnownGoogleAccounts(): SavedGoogleAccount[] {
    try {
      const stored = localStorage.getItem('forgex_known_google_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((a) => a && a.email && !a.email.toLowerCase().includes('vishwesharun'));
        }
      }
    } catch {}
    return [];
  },

  saveKnownGoogleAccount(acc: { email: string; name?: string; avatarUrl?: string }): void {
    if (!acc.email || !acc.email.includes('@')) return;
    try {
      const cleanEmail = acc.email.trim().toLowerCase();
      if (cleanEmail.includes('vishwesharun')) return;
      const accounts = this.getKnownGoogleAccounts().filter((a) => a.email !== cleanEmail);
      const name = acc.name?.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      accounts.unshift({
        email: cleanEmail,
        name,
        avatarUrl: acc.avatarUrl || '',
        lastUsed: Date.now(),
      });
      localStorage.setItem('forgex_known_google_accounts', JSON.stringify(accounts.slice(0, 6)));
    } catch {}
  },

  removeKnownGoogleAccount(email: string): SavedGoogleAccount[] {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const accounts = this.getKnownGoogleAccounts().filter((a) => a.email !== cleanEmail);
      localStorage.setItem('forgex_known_google_accounts', JSON.stringify(accounts));
      return accounts;
    } catch {
      return [];
    }
  },

  // --- CONTINUE WITH GOOGLE DIRECT (FOR PREVIEW / CLOUD RUN ENVIRONMENTS) ---
  async signInWithGoogleDirect(emailInput: string, nameInput?: string): Promise<UserProfile> {
    const rawEmail = (emailInput || '').trim();
    const cleanEmail = rawEmail.toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid Google email address.');
    }

    const username = cleanEmail.split('@')[0];
    const displayName = (nameInput || '').trim() || username.charAt(0).toUpperCase() + username.slice(1);
    const userId = 'usr_g_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);

    // Try to load any existing cloud profile from Firestore
    let existingDoc: UserProfile | null = null;
    try {
      existingDoc = await firestoreStorageService.loadUserProfile(userId);
    } catch (_e) {
      // Offline fallback
    }

    const userProfile: UserProfile = {
      id: userId,
      name: existingDoc?.name || displayName,
      email: cleanEmail,
      avatarUrl: existingDoc?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=f59e0b`,
      creditsUsed: existingDoc?.creditsUsed ?? 0,
      creditsLimit: existingDoc?.creditsLimit ?? 2500,
      username: existingDoc?.username || username,
      isGoogleUser: true,
    };

    // Store in Firestore under this user's isolated document
    try {
      await firestoreStorageService.saveUserProfile(userProfile);
    } catch (saveErr) {
      console.warn('Could not sync user profile to Firestore immediately:', saveErr);
    }

    this.saveKnownGoogleAccount({
      email: cleanEmail,
      name: userProfile.name,
      avatarUrl: userProfile.avatarUrl,
    });

    try {
      localStorage.setItem('forgex_last_google_email', cleanEmail);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    } catch (_e) {
      // Ignore storage error
    }

    dispatchAuthChanged(userProfile);
    return userProfile;
  },

  // --- CONTINUE WITH GOOGLE ---
  async signInWithGoogle(explicitEmail?: string, fallbackName?: string): Promise<UserProfile> {
    if (explicitEmail && explicitEmail.includes('@')) {
      return await this.signInWithGoogleDirect(explicitEmail, fallbackName);
    }

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

      this.saveKnownGoogleAccount({
        email: userProfile.email,
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl,
      });

      localStorage.setItem('forgex_last_google_email', userProfile.email);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      dispatchAuthChanged(userProfile);
      return userProfile;
    } catch (error: any) {
      // Handle Firebase unauthorized domain error on Cloud Run / AI Studio preview URLs
      if (
        error?.code === 'auth/unauthorized-domain' ||
        error?.message?.includes('unauthorized-domain') ||
        error?.code === 'auth/operation-not-allowed'
      ) {
        console.warn(
          'Firebase Google Sign-In: Preview domain requires account selection.'
        );

        // DO NOT silently auto-login with old email! Always trigger the Choose Account UI.
        const domainErr: any = new Error(
          'Please choose your Google account to sign in.'
        );
        domainErr.code = 'auth/unauthorized-domain';
        domainErr.isDomainError = true;
        domainErr.currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        throw domainErr;
      }

      if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please choose an account to sign in.');
      } else if (error?.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by browser. Please choose an account below.');
      } else if (error?.code === 'auth/network-request-failed') {
        throw new Error('Network error during Google sign in. Please check your internet connection.');
      }

      console.warn('Firebase Google Sign-In notice:', error?.message);
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
    if (account.passwordHash !== inputHash) {
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
    try {
      localStorage.setItem('forgex_guest_device_id', 'guest_' + Math.random().toString(36).substring(2, 9));
    } catch {}
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
