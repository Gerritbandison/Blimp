/**
 * AES-256-GCM encryption utilities for sensitive data at rest
 * (e.g. integration credentials stored in the database).
 *
 * Requires ENCRYPTION_KEY env var — a 64-char hex string (32 bytes).
 * Generate one with: openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      '[encryption] ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
      'Generate one with: openssl rand -hex 32',
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string → base64 encoded `iv:ciphertext:tag`
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Combine iv + ciphertext + tag into a single base64 string
  return [
    iv.toString('base64'),
    encrypted.toString('base64'),
    tag.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a previously encrypted string (base64 `iv:ciphertext:tag` format)
 */
export function decrypt(encryptedStr: string): string {
  const key = getKey();
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('[encryption] Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const ciphertext = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('[encryption] Invalid IV or auth tag length');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}
