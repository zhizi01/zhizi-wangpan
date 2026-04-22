import fs from 'fs';
import path from 'path';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

export function getUploadDir(): string {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const absolutePath = path.isAbsolute(uploadDir) ? uploadDir : path.resolve(process.cwd(), uploadDir);
  ensureDir(absolutePath);
  return absolutePath;
}

export function getUserDir(userId: number): string {
  const dir = path.join(getUploadDir(), 'private', userId.toString());
  ensureDir(dir);
  return dir;
}
