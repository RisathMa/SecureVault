export interface User {
  id: string;
  username: string;
  salt: string; // Base64 encoded salt for key derivation
  verifier: string; // Hash of the key to verify password without storing it
}

export interface EncryptedFile {
  id: string;
  ownerId: string;
  encryptedMetadata: string; // Base64 encoded JSON string { name, type, size, iv }
  metadataIv: string; // IV used for metadata encryption
  storagePath: string; // Path in Firebase Storage
  dataIv: string; // IV used for file content encryption
  thumbnailPath?: string; // Path to encrypted thumbnail in Storage
  thumbnailIv?: string; // IV for thumbnail
  createdAt: number;
}

export interface DecryptedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  url?: string; // Object URL for preview
}

export interface CryptoContextState {
  masterKey: CryptoKey | null;
  deriveMasterKey: (password: string, salt: string) => Promise<CryptoKey>;
  generateSalt: () => string;
  encryptFile: (file: File, key: CryptoKey) => Promise<{ encryptedData: Blob; iv: string }>;
  decryptFile: (encryptedData: Blob, iv: string, key: CryptoKey) => Promise<Blob>;
  encryptMetadata: (metadata: object, key: CryptoKey) => Promise<{ encryptedText: string; iv: string }>;
  decryptMetadata: (encryptedText: string, iv: string, key: CryptoKey) => Promise<any>;
}

export enum FileViewMode {
  GRID = 'GRID',
  LIST = 'LIST',
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
