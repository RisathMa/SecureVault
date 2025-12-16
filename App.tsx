import React from 'react';
import { VaultProvider, useVault } from './contexts/VaultContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

const AppContent: React.FC = () => {
  const { user, toasts } = useVault();

  return (
    <>
      {user ? <Dashboard /> : <AuthPage />}
      
      {/* Global Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`px-4 py-3 rounded-md shadow-lg border-l-4 text-sm font-medium animate-slide-in ${
              toast.type === 'success' ? 'bg-brand-800 border-brand-500 text-white' :
              toast.type === 'error' ? 'bg-brand-800 border-red-500 text-white' :
              'bg-brand-800 border-blue-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  );
};

export default App;