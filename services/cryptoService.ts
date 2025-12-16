import { PBKDF2_ITERATIONS, SALT_LENGTH, IV_LENGTH, KEY_LENGTH } from '../constants';

// Helper to convert string to buffer
const strToBuf = (str: string): Uint8Array => new TextEncoder().encode(str);
// Helper to convert buffer to string
const bufToStr = (buf: ArrayBuffer): string => new TextDecoder().decode(buf);
// Helper to convert buffer to Base64
const bufToBase64 = (buf: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};
// Helper to convert Base64 to buffer
const base64ToBuf = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const generateSalt = (): string => {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return bufToBase64(salt);
};

export const deriveMasterKey = async (password: string, saltBase64: string): Promise<CryptoKey> => {
  const salt = base64ToBuf(saltBase64);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    strToBuf(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // Master key is non-extractable
    ['encrypt', 'decrypt']
  );
};

// Generate a verifier hash to check password correctness without storing password
export const generateVerifier = async (key: CryptoKey): Promise<string> => {
  // We encrypt a known constant. If decryption works later, key is correct.
  // Alternatively, export key data if extractable (ours is not).
  // Better approach for non-extractable: Encrypt a static string "VALID"
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = strToBuf("VALID_USER_KEY");
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Return IV + Encrypted Data as verifier string
  return JSON.stringify({
    iv: bufToBase64(iv),
    data: bufToBase64(encrypted)
  });
};

export const verifyKey = async (key: CryptoKey, verifierStr: string): Promise<boolean> => {
  try {
    const { iv, data } = JSON.parse(verifierStr);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuf(iv) },
      key,
      base64ToBuf(data)
    );
    return bufToStr(decrypted) === "VALID_USER_KEY";
  } catch (e) {
    return false;
  }
};

export const encryptData = async (data: ArrayBuffer, key: CryptoKey): Promise<{ encryptedBuffer: ArrayBuffer; iv: string }> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return { encryptedBuffer, iv: bufToBase64(iv) };
};

export const decryptData = async (encryptedData: ArrayBuffer, ivBase64: string, key: CryptoKey): Promise<ArrayBuffer> => {
  const iv = base64ToBuf(ivBase64);
  return await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
};

export const encryptMetadata = async (metadata: object, key: CryptoKey): Promise<{ encryptedText: string; iv: string }> => {
  const jsonStr = JSON.stringify(metadata);
  const { encryptedBuffer, iv } = await encryptData(strToBuf(jsonStr), key);
  return { encryptedText: bufToBase64(encryptedBuffer), iv };
};

export const decryptMetadata = async (encryptedText: string, iv: string, key: CryptoKey): Promise<any> => {
  const buffer = base64ToBuf(encryptedText);
  const decryptedBuffer = await decryptData(buffer, iv, key);
  const jsonStr = bufToStr(decryptedBuffer);
  return JSON.parse(jsonStr);
};
