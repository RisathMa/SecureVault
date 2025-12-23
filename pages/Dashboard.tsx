import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../contexts/VaultContext';
import { DecryptedFile, FileViewMode } from '../types';
import Sidebar from '../components/layout/Sidebar';
import Button from '../components/ui/Button';

// Thumbnail Component to handle async loading
const FileThumbnail: React.FC<{ fileId: string, type: string }> = ({ fileId, type }) => {
  const { getThumbnail } = useVault();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (type.startsWith('image/')) {
      getThumbnail(fileId).then(url => {
        if (active && url) setSrc(url);
      });
    }
    return () => { active = false; };
  }, [fileId, type, getThumbnail]);

  if (src) {
    return <img src={src} alt="Thumbnail" className="w-full h-full object-cover" />;
  }

  // Fallback icons
  return (
    <div className="w-full h-full flex items-center justify-center bg-brand-800 text-slate-600">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { files, logout, uploadFile, downloadFile, deleteFile, user } = useVault();
  const [view, setView] = useState<FileViewMode>(FileViewMode.LIST);
  const [dragActive, setDragActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    return new Date(ms).toLocaleDateString();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 relative">
      <Sidebar
        currentView={view}
        setView={setView}
        storageUsage={totalSize}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-brand-900/50 backdrop-blur border-b border-brand-800 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight truncate">Vault<span className="text-brand-500">.</span></h1>
            {/* Search could go here */}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-white">{user?.username}</span>
              <span className="text-xs text-brand-500">Encrypted Session</span>
            </div>
            <Button variant="ghost" onClick={logout} title="Lock Vault" className="p-2">
              <svg className="w-5 h-5 md:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <h2 className="text-xl font-semibold text-white">Files</h2>
              <div className="bg-brand-800 rounded-lg p-1 flex ml-auto sm:ml-0">
                <button onClick={() => setView(FileViewMode.LIST)} className={`p-1.5 rounded ${view === FileViewMode.LIST ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <button onClick={() => setView(FileViewMode.GRID)} className={`p-1.5 rounded ${view === FileViewMode.GRID ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
              </div>
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Upload
              </Button>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[16rem] border-2 border-dashed border-brand-700 rounded-lg p-6 text-center">
              <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-slate-400">Vault is empty.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-brand-400 hover:text-brand-300 font-medium"
              >
                Select a file to encrypt
              </button>
            </div>
          ) : view === FileViewMode.LIST ? (
            <div className="bg-brand-900 border border-brand-800 rounded-lg shadow overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-brand-800 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="px-4 md:px-6 py-4">Name</th>
                    <th className="px-4 md:px-6 py-4">Size</th>
                    <th className="px-4 md:px-6 py-4 hidden sm:table-cell">Date</th>
                    <th className="px-4 md:px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-800">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-brand-800/50 transition-colors group text-sm">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-brand-800 flex-shrink-0 mr-3 border border-brand-700 overflow-hidden">
                            {file.type.startsWith('image/')
                              ? <FileThumbnail fileId={file.id} type={file.type} />
                              : <div className="w-full h-full flex items-center justify-center text-slate-500"><svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate max-w-[120px] sm:max-w-xs" title={file.name}>{file.name}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 truncate max-w-[100px]">{file.type || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-slate-300 font-mono whitespace-nowrap">{formatSize(file.size)}</td>
                      <td className="px-4 md:px-6 py-4 text-slate-400 hidden sm:table-cell whitespace-nowrap">{formatDate(file.createdAt)}</td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex justify-end space-x-1 md:space-x-2">
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
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {files.map((file) => (
                <div key={file.id} className="bg-brand-900 border border-brand-800 rounded-lg overflow-hidden hover:border-brand-600 transition-colors group relative">
                  <div className="aspect-square bg-brand-800 relative">
                    {file.type.startsWith('image/')
                      ? <FileThumbnail fileId={file.id} type={file.type} />
                      : <div className="w-full h-full flex items-center justify-center text-slate-600"><svg className="w-12 h-12 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                    }
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                      <button onClick={() => downloadFile(file.id)} className="p-2 bg-brand-600 text-white rounded-full hover:bg-brand-500 shadow-lg" title="Download">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      <button onClick={() => deleteFile(file.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 shadow-lg" title="Delete">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-2 md:p-3">
                    <h3 className="text-xs md:text-sm font-medium text-white truncate" title={file.name}>{file.name}</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 mt-1">{formatSize(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;