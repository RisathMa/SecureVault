import React, { useState, useEffect } from 'react';
import { useVault } from '../contexts/VaultContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

type AuthMode = 'login' | 'register' | 'forgot' | 'update';

const AuthPage: React.FC = () => {
  const { login, register, resetPassword, updatePassword, isLoading } = useVault();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle redirects from Supabase (verification or password recovery)
  useEffect(() => {
    const handleRedirect = async () => {
      // Supabase uses URL fragments/hashes for redirects (e.g. #access_token=...&type=recovery)
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const type = params.get('type');
      const error = params.get('error_description');

      if (error) {
        setError(decodeURIComponent(error.replace(/\+/g, ' ')));
        return;
      }

      if (type === 'recovery') {
        setMode('update');
        setSuccess('Recovery link verified. Please set your new master password.');
        // Don't clear immediately, let the session stabilize
        setTimeout(() => {
          window.history.replaceState(null, '', window.location.pathname);
        }, 1000);
      } else if (type === 'signup') {
        setMode('login');
        setSuccess('Email verified! Please sign in to your secure vault.');
        // 1. SignIn
        // Assuming addToast is a function available in the context or globally,
        // or that the user intends to add a toast context/hook.
        // For now, I'll add a console log as a placeholder for addToast.
        console.log('info', 'Connecting to secure vault (v1.1)...');
        setTimeout(() => {
          window.history.replaceState(null, '', window.location.pathname);
        }, 1000);
      }
    };

    handleRedirect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (mode === 'register' || mode === 'update') {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
      }

      if (mode === 'login') {
        const ok = await login(email, password);
        if (!ok) throw new Error('Unlock failed. Please check credentials or verification.');
      } else if (mode === 'register') {
        const ok = await register(email, password);
        if (ok) setMode('login');
        else throw new Error('Registration failed. Please try again.');
      } else if (mode === 'forgot') {
        const ok = await resetPassword(email);
        if (ok) {
          setSuccess('Reset link sent! Please check your email.');
          setTimeout(() => setMode('login'), 5000);
        }
      } else if (mode === 'update') {
        const ok = await updatePassword(password);
        if (ok) {
          setSuccess('Password updated! You can now log in.');
          setTimeout(() => setMode('login'), 3000);
        }
      }
    } catch (err: any) {
      console.error("Auth Page Caught Error:", err);

      // Better error extraction
      let msg = '';
      if (typeof err === 'string') msg = err;
      else if (err.message) msg = err.message;
      else if (err.error_description) msg = err.error_description;
      else if (err.error?.message) msg = err.error.message;
      else if (typeof err === 'object') msg = JSON.stringify(err);

      if (!msg || msg === '{}') {
        msg = 'Registration failed. Check your Supabase SMTP settings or network.';
      }

      setError(msg);
    }
  };

  const renderTitle = () => {
    switch (mode) {
      case 'login': return 'Unlock Vault';
      case 'register': return 'Create Vault';
      case 'forgot': return 'Recover Vault';
      case 'update': return 'Set New Password';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0f18] selection:bg-brand-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 p-[1px] shadow-lg shadow-brand-500/20 mb-4 md:mb-6">
            <div className="w-full h-full bg-[#0a0f18] rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 md:mb-3">RM Vault <span className="text-[10px] align-top bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full border border-brand-500/30">v1.1</span></h1>
          <p className="text-slate-400 text-base md:text-lg">Secure, redundant, zero-knowledge.</p>
        </div>

        <div className="bg-brand-800/20 backdrop-blur-2xl border border-white/5 p-1 rounded-2xl shadow-2xl mb-6">
          {/* Toggle Buttons */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex p-1 gap-1 mb-8">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'login'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'register'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                Register
              </button>
            </div>
          )}

          <div className="p-7">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">{renderTitle()}</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode !== 'update' && (
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              )}

              {mode !== 'forgot' && (
                <Input
                  label={mode === 'update' ? 'New Master Password' : 'Master Password'}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              )}

              {(mode === 'register' || mode === 'update') && (
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-400 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-sm text-emerald-400 animate-in fade-in slide-in-from-top-1">
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-bold bg-brand-500 hover:bg-brand-400 !bg-none" isLoading={isLoading}>
                {mode === 'login' && 'Unlock My Vault'}
                {mode === 'register' && 'Create Secure Account'}
                {mode === 'forgot' && 'Send Reset Link'}
                {mode === 'update' && 'Update Password'}
              </Button>
            </form>

            {mode === 'login' && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {(mode === 'forgot' || mode === 'update') && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Back to login
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="px-8 text-slate-500 text-xs text-center leading-relaxed">
          {mode === 'register'
            ? "By creating a vault, you acknowledge that your master password is your ONLY key. We cannot recover it."
            : "Your master password is used to derive encryption keys locally. No one but you can access your data."}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
