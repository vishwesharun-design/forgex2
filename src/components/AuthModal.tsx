import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Clipboard,
  RefreshCw,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { ForgeXTheme, UserProfile } from '../types';
import { authService } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  theme: ForgeXTheme;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
  theme,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [signupStep, setSignupStep] = useState<'form' | 'verify'>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [receivedCodePreview, setReceivedCodePreview] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const resetFormState = () => {
    setError(null);
    setSuccessMessage(null);
    setSignupStep('form');
    setVerificationCode('');
    setReceivedCodePreview(null);
  };

  // Google Sign-In: triggers Google OAuth popup
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const loggedInUser = await authService.signInWithGoogle();
      setIsGoogleLoading(false);
      onSuccess(loggedInUser);
      onClose();
    } catch (err: any) {
      setIsGoogleLoading(false);

      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }

      if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and click Continue with Google again.');
        return;
      }

      if (err?.code === 'auth/unauthorized-domain' || err?.isDomainError) {
        setError('This preview URL requires email sign-in or authorization in Firebase Auth domains.');
        return;
      }

      setError(err?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  // Step 1: Send verification code before creating account
  const handleSendVerificationCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (cleanPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.sendVerificationCode(cleanEmail, cleanName);
      setIsLoading(false);
      setReceivedCodePreview(res.code || null);
      setSignupStep('verify');
      setCountdown(60);
      setSuccessMessage(res.message || `Verification code sent to ${cleanEmail}.`);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to send verification code. Please try again.');
    }
  };

  // Step 2: Verify pasted code and create the new account
  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter or paste the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await authService.verifyCodeAndCreateAccount({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        code: cleanCode,
      });

      setIsLoading(false);
      onSuccess(newUser);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Invalid verification code. Please verify and try again.');
    }
  };

  // Paste code from clipboard helper
  const handlePasteFromClipboard = async () => {
    setError(null);
    try {
      let codeText = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        codeText = await navigator.clipboard.readText();
      }
      const digitsOnly = (codeText || receivedCodePreview || '').replace(/[^0-9]/g, '').slice(0, 6);
      if (digitsOnly) {
        setVerificationCode(digitsOnly);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else if (receivedCodePreview) {
        setVerificationCode(receivedCodePreview);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      if (receivedCodePreview) {
        setVerificationCode(receivedCodePreview);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  // Standard Sign-in / Forgot Password handler
  const handleSignInOrForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      setError('Please enter your email address.');
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

    // Sign in
    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const loggedInUser = await authService.signIn(cleanEmail, cleanPassword);
      setIsLoading(false);
      onSuccess(loggedInUser);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Authentication error. Please check your credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/75 animate-in fade-in duration-200">
      <div
        id="modal-auth-forgex"
        className={`relative w-full max-w-md rounded-3xl p-5 sm:p-7 border shadow-2xl transition-all my-auto max-h-[92vh] overflow-y-auto custom-scrollbar ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        {/* Close Button */}
        <button
          id="btn-close-auth"
          onClick={onClose}
          className={`absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5 shadow-md shadow-amber-500/10">
            <Zap className="w-5 h-5 fill-amber-400 text-amber-400 glow-lightning" />
          </div>
          <h2 id="auth-heading" className="font-display font-bold text-xl sm:text-2xl tracking-tight">
            {mode === 'signin' && 'Sign In to ForgeX'}
            {mode === 'signup' && (signupStep === 'verify' ? 'Verify Your Email' : 'Create Your ForgeX Account')}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className={`text-xs sm:text-sm mt-1 max-w-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {mode === 'signin' && 'Access your private cloud-synced chats, AI songs, and studios'}
            {mode === 'signup' && (signupStep === 'verify' ? `Enter the 6-digit code sent to ${email}` : 'Enter your details to receive an email verification code')}
            {mode === 'forgot' && 'Enter your account email to set a new password'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Only shown before verification step) */}
        {signupStep === 'form' && (
          <div className={`flex rounded-xl p-1 mb-4 border ${isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
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
        )}

        {/* Google sign-in available in form mode */}
        {signupStep === 'form' && (
          <>
            <div className="mb-4">
              <button
                id="btn-auth-google"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className={`w-full py-3 px-4 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-700/80 hover:bg-neutral-800/90 text-white hover:border-neutral-600'
                    : 'bg-white border-neutral-300 hover:bg-neutral-50 text-neutral-800 hover:border-neutral-400 shadow-sm'
                } disabled:opacity-50`}
              >
                {isGoogleLoading ? (
                  <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                )}
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className={`w-full border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`} />
              <span className={`absolute px-3 text-[11px] font-medium uppercase tracking-wider ${
                isDark ? 'bg-neutral-900 text-neutral-500' : 'bg-white text-neutral-400'
              }`}>
                or with email
              </span>
            </div>
          </>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STEP 2: VERIFICATION CODE ENTRY SCREEN (AFTER CODE SENT) */}
        {mode === 'signup' && signupStep === 'verify' ? (
          <form onSubmit={handleVerifyAndCreate} className="space-y-4">
            {/* Email verification card indicator */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-neutral-500 font-medium">Verification Code Sent To</div>
                  <div className="text-xs sm:text-sm font-semibold truncate text-amber-500">{email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignupStep('form')}
                className="text-xs text-neutral-400 hover:text-white underline shrink-0 px-2 py-1"
              >
                Change
              </button>
            </div>

            {/* Quick 1-Click Code Display / Paste Helper */}
            {receivedCodePreview && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs">Your verification code: <strong className="font-mono text-sm tracking-widest text-amber-400">{receivedCodePreview}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationCode(receivedCodePreview);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isCopied ? <Check className="w-3 h-3 text-neutral-950" /> : <Clipboard className="w-3 h-3" />}
                  <span>{isCopied ? 'Pasted' : 'Paste Code'}</span>
                </button>
              </div>
            )}

            {/* Verification Code Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Paste 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  id="input-verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setVerificationCode(clean);
                  }}
                  placeholder="• • • • • •"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl text-center text-xl font-mono font-bold tracking-[0.35em] border transition-colors outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-700 text-white placeholder:text-neutral-700'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-300'
                  }`}
                />
              </div>
            </div>

            {/* Create Account Submission Button */}
            <button
              id="btn-verify-create-account"
              type="submit"
              disabled={isLoading || verificationCode.length < 6}
              className="w-full mt-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Code & Create Account</span>
                </>
              )}
            </button>

            {/* Resend Code / Back Footer */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setSignupStep('form')}
                className="text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to details</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendVerificationCode()}
                disabled={countdown > 0 || isLoading}
                className="text-amber-400 hover:text-amber-300 disabled:text-neutral-600 flex items-center gap-1 font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* STEP 1: FORM INPUT SCREEN (SIGN IN OR SIGN UP DETAILS) */
          <form
            onSubmit={mode === 'signup' ? handleSendVerificationCode : handleSignInOrForgot}
            className="space-y-3.5"
          >
            {mode === 'signup' && (
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
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
                    placeholder="e.g. Alex Rivera"
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
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
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
              <div className="flex items-center justify-between mb-1">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
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
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>We will send a 6-digit verification code to your email.</span>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In with Email'}
                    {mode === 'signup' && 'Send Verification Code'}
                    {mode === 'forgot' && 'Save New Password'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
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
