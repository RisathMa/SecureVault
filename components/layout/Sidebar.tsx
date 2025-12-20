import React from 'react';
import { FileViewMode } from '../../types';

interface SidebarProps {
  currentView: FileViewMode;
  setView: (view: FileViewMode) => void;
  storageUsage?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, storageUsage = 0 }) => {
  const menuItems = [
    {
      id: 'all', label: 'All Files', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
      )
    },
    {
      id: 'recent', label: 'Recent', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },

  ];

  return (
    <div className="w-64 bg-brand-900 border-r border-brand-800 flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center space-x-2 text-brand-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-xl font-bold text-white tracking-tight">RM Vault</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:bg-brand-800 hover:text-white rounded-md transition-colors"
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-brand-800">
        <div className="bg-brand-800 rounded-lg p-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Storage</span>
            <span>{(storageUsage / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="w-full bg-brand-900 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${Math.min((storageUsage / (100 * 1024 * 1024)) * 100, 100)}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Zero-knowledge active</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;