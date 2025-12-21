import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, DecryptedFile, EncryptedFile, ToastMessage } from '../types';
import * as cryptoService from '../services/cryptoService';
import { supabase } from '../services/supabase';

interface VaultContextType {
  user: User | null;
  files: DecryptedFile[];
  isLoading: boolean;
  toasts: ToastMessage[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  refreshFiles: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [files, setFiles] = useState<DecryptedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Monitor Supabase Auth State
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setUser(null);
        setMasterKey(null);
        setFiles([]);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const register = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. Derive Key FIRST so we can save it with the user
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveMasterKey(password, salt);
      const verifier = await cryptoService.generateVerifier(key);

      // 2. SignUp with Supabase & Store Metadata
      // CRITICAL: We store salt/verifier in user_metadata so it persists 
      // even if RLS blocks DB inserts for unverified users.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: email.split('@')[0],
            salt: salt,
            verifier: verifier
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      const uid = authData.user.id;

      // 3. Attempt to Sync to public.users (Optional/Best Effort)
      // This might fail if email is not verified yet due to RLS, but that's okay
      // because we have the data in metadata now.
      await supabase.from('users').insert([{
        id: uid,
        email: email,
        salt,
        verifier
      }]).then(({ error }) => {
        if (error) console.log("Note: Public profile creation delayed until verification.");
      });

      // 4. Log in immediately if session is active (no email verify required)
      if (authData.session) {
        setUser({ id: uid, username: email.split('@')[0], salt, verifier });
        setMasterKey(key);
        addToast('success', 'Vault created successfully');
      } else {
        addToast('info', 'Please check your email to verify account');
      }

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. SignIn
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          addToast('error', 'Please verify your email address first.');
        } else {
          throw authError;
        }
        return false;
      }
      if (!authData.user) throw new Error("Login failed");

      const currentUser = authData.user;

      // 2. Get Salt/Verifier (Try Metadata FIRST)
      let salt = currentUser.user_metadata?.salt;
      let verifier = currentUser.user_metadata?.verifier;

      // Fallback: Try public.users table (Legacy)
      if (!salt || !verifier) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (dbUser) {
          salt = dbUser.salt;
          verifier = dbUser.verifier;
        }
      }

      if (!salt || !verifier) {
        throw new Error('User profile missing keys. Please reset account.');
      }

      // 3. Derive & Verify
      const key = await cryptoService.deriveMasterKey(password, salt);
      const isValid = await cryptoService.verifyKey(key, verifier);

      if (isValid) {
        setUser({
          id: currentUser.id,
          username: currentUser.user_metadata?.username || email.split('@')[0],
          salt: salt,
          verifier: verifier
        });
        setMasterKey(key);
        addToast('success', 'Vault unlocked');
        return true;
      } else {
        addToast('error', 'Invalid password');
        await supabase.auth.signOut();
        return false;
      }
    } catch (e: any) {
      console.error("Login Core Error:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMasterKey(null);
    setFiles([]);
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      addToast('success', 'Recovery email sent. Please check your inbox.');
      return true;
    } catch (e: any) {
      console.error("Reset Password Core Error:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. Derive NEW Key
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveMasterKey(password, salt);
      const verifier = await cryptoService.generateVerifier(key);

      // 2. Update Supabase Auth (Password)
      const { error: authError } = await supabase.auth.updateUser({
        password,
        data: { salt, verifier } // Also update metadata
      });
      if (authError) throw authError;

      // 3. Update public.users table (Public key info)
      if (user) {
        const { error: dbError } = await supabase.from('users').update({
          salt,
          verifier
        }).eq('id', user.id);
        if (dbError) console.error("Note: Public profile update failed during password reset.");
      }

      addToast('success', 'Password updated successfully. Please log in.');
      return true;
    } catch (e: any) {
      console.error("Update Password Error:", e);
      addToast('error', e.message || 'Failed to update password');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = useCallback(async () => {
    if (!user || !masterKey) return;
    setIsLoading(true);
    try {
      const { data: encryptedFiles, error } = await supabase
        .from('files')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const decryptedFiles: DecryptedFile[] = [];

      for (const ef of encryptedFiles || []) {
        try {
          const meta = await cryptoService.decryptMetadata(ef.encrypted_metadata, ef.metadata_iv, masterKey);
          decryptedFiles.push({
            id: ef.id,
            name: meta.name,
            type: meta.type,
            size: meta.size,
            createdAt: ef.created_at
          });
        } catch (e) {
          console.error(`Failed to decrypt file ${ef.id}`, e);
        }
      }
      setFiles(decryptedFiles);
    } catch (e) {
      console.error(e);
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

  const generateThumbnail = async (file: File): Promise<{ blob: Blob | null }> => {
    if (!file.type.startsWith('image/')) return { blob: null };
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width, height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve({ blob }), 'image/jpeg', 0.7);
      };
      img.onerror = () => resolve({ blob: null });
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File) => {
    if (!user || !masterKey) return;
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { encryptedBuffer, iv: dataIv } = await cryptoService.encryptData(arrayBuffer, masterKey);

      let thumbnailPath = null;
      let thumbnailIv = null;
      const { blob: thumbBlob } = await generateThumbnail(file);

      if (thumbBlob) {
        const thumbArrayBuffer = await thumbBlob.arrayBuffer();
        const { encryptedBuffer: encThumb, iv: thumbIv } = await cryptoService.encryptData(thumbArrayBuffer, masterKey);

        const thumbPath = `vaults/${user.id}/${crypto.randomUUID()}.thumb`;
        const { error: uploadError } = await supabase.storage.from('vault').upload(thumbPath, encThumb);
        if (uploadError) throw uploadError;

        thumbnailPath = thumbPath;
        thumbnailIv = thumbIv;
      }

      const fileId = crypto.randomUUID();
      const storagePath = `vaults/${user.id}/${fileId}.enc`;

      const { error: uploadError } = await supabase.storage.from('vault').upload(storagePath, encryptedBuffer);
      if (uploadError) throw uploadError;

      const metadata = { name: file.name, type: file.type, size: file.size };
      const { encryptedText: encryptedMetadata, iv: metadataIv } = await cryptoService.encryptMetadata(metadata, masterKey);

      const { error: dbError } = await supabase.from('files').insert([{
        id: fileId,
        owner_id: user.id,
        storage_path: storagePath,
        encrypted_metadata: encryptedMetadata,
        metadata_iv: metadataIv,
        data_iv: dataIv,
        thumbnail_path: thumbnailPath,
        thumbnail_iv: thumbnailIv,
        created_at: Date.now()
      }]);

      if (dbError) throw dbError;

      addToast('success', 'File encrypted & uploaded');
      loadFiles();
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (fileId: string) => {
    if (!user || !masterKey) return;
    const fileMeta = files.find(f => f.id === fileId);
    if (!fileMeta) return;

    try {
      const { data: ef, error: dbError } = await supabase.from('files').select('*').eq('id', fileId).single();
      if (dbError || !ef) throw new Error("File not found");

      const { data: blobData, error: downloadError } = await supabase.storage.from('vault').download(ef.storage_path);
      if (downloadError) throw downloadError;

      const encryptedArrayBuffer = await blobData.arrayBuffer();
      const decryptedBuffer = await cryptoService.decryptData(encryptedArrayBuffer, ef.data_iv, masterKey);
      const blob = new Blob([decryptedBuffer], { type: fileMeta.type });

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
      addToast('error', 'Download failed');
    }
  };

  const getThumbnail = async (fileId: string): Promise<string | undefined> => {
    if (!user || !masterKey) return undefined;
    try {
      const { data: ef } = await supabase.from('files').select('*').eq('id', fileId).single();
      if (!ef || !ef.thumbnail_path) return undefined;

      const { data: blobData } = await supabase.storage.from('vault').download(ef.thumbnail_path);
      if (!blobData) return undefined;

      const encryptedArrayBuffer = await blobData.arrayBuffer();
      const decryptedBuffer = await cryptoService.decryptData(encryptedArrayBuffer, ef.thumbnail_iv, masterKey);
      const blob = new Blob([decryptedBuffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (e: any) {
      console.error("Get Thumbnail Error:", e);
      return undefined;
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { data: ef } = await supabase.from('files').select('*').eq('id', fileId).single();
      if (ef) {
        const paths = [ef.storage_path];
        if (ef.thumbnail_path) paths.push(ef.thumbnail_path);
        await supabase.storage.from('vault').remove(paths);
        await supabase.from('files').delete().eq('id', fileId);
      }
      setFiles(prev => prev.filter(f => f.id !== fileId));
      addToast('success', 'File deleted');
    } catch (e) {
      addToast('error', 'Delete failed');
    }
  };

  return (
    <VaultContext.Provider value={{
      user, files, isLoading, toasts,
      login, register, logout,
      uploadFile, downloadFile, deleteFile, getThumbnail,
      resetPassword, updatePassword,
      refreshFiles: loadFiles
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) throw new Error('useVault must be used within a VaultProvider');
  return context;
};
