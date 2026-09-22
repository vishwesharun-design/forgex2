import React, { useState } from 'react';
import { X, Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ForgeXTheme, UserProfile } from '../types';
import { authService } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  theme: ForgeXTheme;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
  theme,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const resetFormState = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (mode === 'forgot') {
      if (!cleanPassword || cleanPassword.length < 6) {
        setError('Please provide a new password of at least 6 characters.');
        return;
      }
      setIsLoading(true);
      try {
        await authService.resetPassword(cleanEmail, cleanPassword);
        setIsLoading(false);
        setSuccessMessage('Password successfully updated! You can now sign in.');
        setTimeout(() => {
          setMode('signin');
          setSuccessMessage(null);
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setError(err?.message || 'Failed to reset password.');
      }
      return;
    }

    if (mode === 'signup' && cleanPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      let loggedInUser: UserProfile;
      if (mode === 'signup') {
        loggedInUser = await authService.signUp(name.trim(), cleanEmail, cleanPassword);
      } else {
        loggedInUser = await authService.signIn(cleanEmail, cleanPassword);
      }

      setIsLoading(false);
      onSuccess(loggedInUser);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Authentication error. Please check your details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
      <div
        id="modal-auth-forgex"
        className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        {/* Close Button */}
        <button
          id="btn-close-auth"
          onClick={onClose}
          className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-md shadow-amber-500/10">
            <Zap className="w-6 h-6 fill-amber-400 text-amber-400 glow-lightning" />
          </div>
          <h2 id="auth-heading" className="font-display font-bold text-2xl tracking-tight">
            {mode === 'signin' && 'Sign in to ForgeX'}
            {mode === 'signup' && 'Create Your ForgeX Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className={`text-xs sm:text-sm mt-1.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {mode === 'signin' && 'Access your AI chat, image generations, and video creations'}
            {mode === 'signup' && 'Register your real creator account with 1,000 monthly credits'}
            {mode === 'forgot' && 'Enter your account email to set a new password'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className={`flex rounded-xl p-1 mb-6 border ${isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              resetFormState();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              resetFormState();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <span className="font-bold shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="input-auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-colors outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                id="input-auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@domain.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-colors outline-none focus:border-amber-500 ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                {mode === 'forgot' ? 'New Password' : 'Password'}
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    resetFormState();
                  }}
                  className="text-xs text-amber-400 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                id="input-auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-colors outline-none focus:border-amber-500 ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="input-auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-colors outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                  }`}
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Free 1,000 monthly compute credits included upon registration.</span>
            </div>
          )}

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Save New Password'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                resetFormState();
              }}
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
