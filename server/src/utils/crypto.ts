import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateShareCode(): string {
  return crypto.randomBytes(16).toString('base64url').substring(0, 10);
}

export function md5File(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}
