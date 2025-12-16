import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, DecryptedFile, EncryptedFile, ToastMessage } from '../types';
import * as cryptoService from '../services/cryptoService';
import { dbService } from '../services/dbService';

interface VaultContextType {
  user: User | null;
  files: DecryptedFile[];
  isLoading: boolean;
  toasts: ToastMessage[];
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  uploadFile: (file: File) => Promise<void>;
  downloadFile: (fileId: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  refreshFiles: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [files, setFiles] = useState<DecryptedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if exists
      const existing = await dbService.getUser(username);
      if (existing) {
        addToast('error', 'User already exists');
        return false;
      }

      // 1. Generate Salt
      const salt = cryptoService.generateSalt();
      
      // 2. Derive Key
      const key = await cryptoService.deriveMasterKey(password, salt);
      
      // 3. Generate Verifier
      const verifier = await cryptoService.generateVerifier(key);

      const newUser: User = {
        id: crypto.randomUUID(),
        username,
        salt,
        verifier
      };

      await dbService.saveUser(newUser);
      
      // Auto login
      setUser(newUser);
      setMasterKey(key);
      addToast('success', 'Vault created successfully');
      return true;
    } catch (e) {
      console.error(e);
      addToast('error', 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userRecord = await dbService.getUser(username);
      if (!userRecord) {
        addToast('error', 'User not found');
        return false;
      }

      const key = await cryptoService.deriveMasterKey(password, userRecord.salt);
      const isValid = await cryptoService.verifyKey(key, userRecord.verifier);

      if (isValid) {
        setUser(userRecord);
        setMasterKey(key);
        addToast('success', 'Vault unlocked');
        return true;
      } else {
        addToast('error', 'Invalid password');
        return false;
      }
    } catch (e) {
      console.error(e);
      addToast('error', 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setMasterKey(null);
    setFiles([]);
  };

  const loadFiles = useCallback(async () => {
    if (!user || !masterKey) return;
    setIsLoading(true);
    try {
      const encryptedFiles = await dbService.getFiles(user.id);
      const decryptedFiles: DecryptedFile[] = [];

      for (const ef of encryptedFiles) {
        try {
          const meta = await cryptoService.decryptMetadata(ef.encryptedMetadata, ef.metadataIv, masterKey);
          decryptedFiles.push({
            id: ef.id,
            name: meta.name,
            type: meta.type,
            size: meta.size,
            createdAt: ef.createdAt
          });
        } catch (e) {
          console.error(`Failed to decrypt metadata for file ${ef.id}`, e);
        }
      }
      setFiles(decryptedFiles.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      addToast('error', 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [user, masterKey]);

  useEffect(() => {
    if (user && masterKey) {
      loadFiles();
    }
  }, [user, masterKey, loadFiles]);

  const uploadFile = async (file: File) => {
    if (!user || !masterKey) return;
    setIsLoading(true);
    
    // Safety check for demo environment memory
    if (file.size > 50 * 1024 * 1024) {
      addToast('error', 'Demo limit: Max 50MB per file');
      setIsLoading(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Encrypt Body
      const { encryptedBuffer, iv: dataIv } = await cryptoService.encryptData(arrayBuffer, masterKey);
      
      // Encrypt Metadata
      const metadata = { name: file.name, type: file.type, size: file.size };
      const { encryptedText: encryptedMetadata, iv: metadataIv } = await cryptoService.encryptMetadata(metadata, masterKey);

      const newFile: EncryptedFile = {
        id: crypto.randomUUID(),
        ownerId: user.id,
        encryptedMetadata,
        metadataIv,
        encryptedData: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
        dataIv,
        createdAt: Date.now()
      };

      await dbService.saveFile(newFile);
      addToast('success', 'File encrypted & uploaded');
      loadFiles();
    } catch (e) {
      console.error(e);
      addToast('error', 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (fileId: string) => {
    if (!user || !masterKey) return;
    
    // Find the file metadata first to get name
    const fileMeta = files.find(f => f.id === fileId);
    if (!fileMeta) return;

    // We need to fetch the raw encrypted file again
    // In a real app we might optimize this, but here we just fetch all and filter
    // or update dbService to get one. Let's assume we can get it from the full list for now or fetch.
    // To be efficient in this demo structure, let's fetch all (since dbService.getFiles returns all).
    // Optimization: Add dbService.getFile(id)
    const allEncrypted = await dbService.getFiles(user.id);
    const target = allEncrypted.find(f => f.id === fileId);
    
    if (!target) {
      addToast('error', 'File not found on disk');
      return;
    }

    try {
      const encryptedArrayBuffer = await target.encryptedData.arrayBuffer();
      const decryptedBuffer = await cryptoService.decryptData(encryptedArrayBuffer, target.dataIv, masterKey);
      const blob = new Blob([decryptedBuffer], { type: fileMeta.type });
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMeta.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast('success', 'File decrypted successfully');
    } catch (e) {
      console.error(e);
      addToast('error', 'Decryption failed (Corrupted data?)');
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!user) return;
    try {
      await dbService.deleteFile(fileId);
      addToast('success', 'File deleted permanently');
      loadFiles();
    } catch (e) {
      addToast('error', 'Delete failed');
    }
  };

  return (
    <VaultContext.Provider value={{
      user,
      files,
      isLoading,
      toasts,
      login,
      register,
      logout,
      uploadFile,
      downloadFile,
      deleteFile,
      refreshFiles: loadFiles
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
