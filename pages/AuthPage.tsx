import React, { useState } from 'react';
import { useVault } from '../contexts/VaultContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const AuthPage: React.FC = () => {
  const { login, register, isLoading } = useVault();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Master password must be at least 6 characters');
      return;
    }
    setError('');
    
    if (isLogin) {
      await login(username, password);
    } else {
      await register(username, password);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-800/50 backdrop-blur-lg border border-brand-700 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-900 border border-brand-700 mb-4">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Secure Data Vault</h1>
          <p className="text-slate-400">Zero-knowledge, military-grade encryption.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            placeholder="Enter username"
            required
          />
          <Input 
            label="Master Password" 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
            required
            error={error}
          />
          
          <Button type="submit" className="w-full h-12 text-lg" isLoading={isLoading}>
            {isLogin ? 'Unlock Vault' : 'Create Vault'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            {isLogin ? "Need a vault? Initialize here" : "Already have a vault? Unlock here"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-slate-500 text-sm max-w-md text-center">
        <p>Your Master Password encrypts your data locally. We cannot recover it if lost.</p>
      </div>
    </div>
  );
};

export default AuthPage;