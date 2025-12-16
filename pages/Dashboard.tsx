import React, { useState, useRef } from 'react';
import { useVault } from '../contexts/VaultContext';
import { DecryptedFile, FileViewMode } from '../types';
import Sidebar from '../components/layout/Sidebar';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const { files, logout, uploadFile, downloadFile, deleteFile, user } = useVault();
  const [view, setView] = useState<FileViewMode>(FileViewMode.LIST);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString() + ' ' + new Date(ms).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar currentView={view} setView={setView} storageUsage={totalSize} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-brand-900/50 backdrop-blur border-b border-brand-800 flex items-center justify-between px-6">
          <div className="flex items-center flex-1 max-w-lg">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                placeholder="Search decrypted metadata..." 
                className="w-full bg-brand-800 border-none rounded-md py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">Vault: <span className="text-brand-400 font-medium">{user?.username}</span></span>
            <Button variant="ghost" onClick={logout}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main 
          className="flex-1 overflow-y-auto p-6 relative"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && (
             <div className="absolute inset-0 z-50 bg-brand-500/10 border-4 border-dashed border-brand-500 rounded-lg flex items-center justify-center backdrop-blur-sm m-4 pointer-events-none">
               <div className="text-2xl font-bold text-brand-400 animate-pulse">Drop to Encrypt & Upload</div>
             </div>
          )}

          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-semibold text-white">Files</h2>
             <div className="flex space-x-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Upload File
                </Button>
             </div>
          </div>

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-brand-700 rounded-lg">
              <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-slate-400">Vault is empty. Drag files here.</p>
            </div>
          ) : (
            <div className="bg-brand-900 border border-brand-800 rounded-lg overflow-hidden shadow">
              <table className="w-full text-left">
                <thead className="bg-brand-800 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Encrypted On</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-800">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-brand-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <svg className="w-8 h-8 text-brand-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          <div>
                            <div className="font-medium text-white">{file.name}</div>
                            <div className="text-xs text-slate-500">{file.type || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">{formatSize(file.size)}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{formatDate(file.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => downloadFile(file.id)} className="p-2 text-slate-400 hover:text-brand-400 transition-colors" title="Decrypt & Download">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                          <button onClick={() => deleteFile(file.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;