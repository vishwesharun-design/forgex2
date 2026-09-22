import { UserProfile } from '../types';

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Base64 encoded or hashed credential
  createdAt: number;
  creditsUsed: number;
  creditsLimit: number;
}

const STORAGE_KEY_ACCOUNTS = 'forgex_registered_accounts';
const STORAGE_KEY_SESSION = 'forgex_session_user';
const STORAGE_KEY_AUTH = 'forgex_is_authenticated';

// Clean legacy sample accounts that may contain hardcoded dummy emails
function sanitizeLegacyStorage() {
  try {
    const legacy = localStorage.getItem('forgex_user_profile');
    if (legacy && (legacy.includes('alex@forgex.ai') || legacy.includes('creator@forgex.ai'))) {
      localStorage.removeItem('forgex_user_profile');
    }
    const currentSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (currentSession && (currentSession.includes('alex@forgex.ai') || currentSession.includes('creator@forgex.ai'))) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  } catch (e) {
    // Ignore storage check failures
  }
}

sanitizeLegacyStorage();

function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      return JSON.parse(raw);
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

// Simple deterministic hash for local client-side password verification
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fx_' + btoa(hash.toString() + '_' + password.length);
}

export const authService = {
  getCurrentUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Verify this is a real user, not a sample email
        if (parsed && parsed.email && !parsed.email.includes('alex@forgex.ai') && !parsed.email.includes('creator@forgex.ai')) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load current session', e);
    }
    return null;
  },

  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return Boolean(user && localStorage.getItem(STORAGE_KEY_AUTH) === 'true');
  },

  signIn(emailInput: string, passwordInput: string): Promise<UserProfile> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const email = (emailInput || '').trim().toLowerCase();
        const password = passwordInput || '';

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          return reject(new Error('Please enter a valid email address.'));
        }
        if (!password) {
          return reject(new Error('Please enter your password.'));
        }

        const accounts = getRegisteredAccounts();
        const account = accounts.find((acc) => acc.email.toLowerCase() === email);

        if (!account) {
          return reject(
            new Error(`No account found for "${email}". Please click "Create an Account" to register.`)
          );
        }

        const inputHash = hashPassword(password);
        if (account.passwordHash !== inputHash) {
          return reject(new Error('Incorrect password. Please verify your credentials and try again.'));
        }

        const userProfile: UserProfile = {
          id: account.id,
          name: account.name,
          email: account.email,
          creditsUsed: account.creditsUsed,
          creditsLimit: account.creditsLimit,
        };

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        resolve(userProfile);
      }, 500);
    });
  },

  signUp(nameInput: string, emailInput: string, passwordInput: string): Promise<UserProfile> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const name = (nameInput || '').trim();
        const email = (emailInput || '').trim().toLowerCase();
        const password = passwordInput || '';

        if (!name) {
          return reject(new Error('Please enter your full name.'));
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          return reject(new Error('Please enter a valid email address (e.g. name@domain.com).'));
        }

        if (password.length < 6) {
          return reject(new Error('Password must be at least 6 characters long.'));
        }

        const accounts = getRegisteredAccounts();
        const existing = accounts.find((acc) => acc.email.toLowerCase() === email);

        if (existing) {
          return reject(
            new Error(`An account with email "${email}" already exists. Please sign in instead.`)
          );
        }

        const newAccount: StoredAccount = {
          id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: name,
          email: email,
          passwordHash: hashPassword(password),
          createdAt: Date.now(),
          creditsUsed: 0,
          creditsLimit: 1000,
        };

        accounts.push(newAccount);
        saveRegisteredAccounts(accounts);

        const userProfile: UserProfile = {
          id: newAccount.id,
          name: newAccount.name,
          email: newAccount.email,
          creditsUsed: newAccount.creditsUsed,
          creditsLimit: newAccount.creditsLimit,
        };

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        resolve(userProfile);
      }, 600);
    });
  },

  resetPassword(emailInput: string, newPasswordInput: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const email = (emailInput || '').trim().toLowerCase();
        const newPassword = newPasswordInput || '';

        if (!email) {
          return reject(new Error('Please enter your account email.'));
        }
        if (newPassword.length < 6) {
          return reject(new Error('New password must be at least 6 characters long.'));
        }

        const accounts = getRegisteredAccounts();
        const index = accounts.findIndex((acc) => acc.email.toLowerCase() === email);

        if (index === -1) {
          return reject(new Error(`No account found with email "${email}".`));
        }

        accounts[index].passwordHash = hashPassword(newPassword);
        saveRegisteredAccounts(accounts);
        resolve();
      }, 600);
    });
  },

  signOut(): Promise<void> {
    return new Promise((resolve) => {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem('forgex_in_workspace');
      resolve();
    });
  },

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('No active user session found to update.');
    }

    const updated: UserProfile = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));

    // Also update registered accounts storage
    const accounts = getRegisteredAccounts();
    const index = accounts.findIndex((acc) => acc.id === current.id);
    if (index !== -1) {
      if (updates.name) accounts[index].name = updates.name;
      if (updates.email) accounts[index].email = updates.email;
      if (updates.creditsUsed !== undefined) accounts[index].creditsUsed = updates.creditsUsed;
      saveRegisteredAccounts(accounts);
    }

    return updated;
  },

  updateUser(updates: Partial<UserProfile>): UserProfile {
    return this.updateProfile(updates);
  }
};
