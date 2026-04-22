/** 与后端 MySQL/JSON 对齐，避免枚举、大小写导致文件夹被当成文件 */
export function normalizeFileType(type: string | undefined | null, mimeType?: string | null): 'folder' | 'file' {
  const t = String(type ?? '').toLowerCase();
  if (t === 'folder' || mimeType === 'inode/directory') return 'folder';
  return 'file';
}
