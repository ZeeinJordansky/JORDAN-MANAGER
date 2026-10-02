import crypto from 'crypto';

// Secret key for AES-256 data encryption
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'mint_secret_key_32_bytes_long_1234!';
const ALGORITHM = 'aes-256-cbc';

/**
 * Hashes a password using PBKDF2 with SHA-512 and a random or provided salt.
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, usedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: usedSalt };
}

/**
 * Safely verifies a password against a stored salt and hash using timingSafeEqual.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    const bufA = Buffer.from(hash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

/**
 * Encrypts sensitive data using AES-256-CBC.
 */
export function encryptData(text: string): string {
  if (!text) return '';
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (e) {
    return text;
  }
}

/**
 * Decrypts sensitive data using AES-256-CBC.
 */
export function decryptData(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
    const [ivHex, textHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(textHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
}
