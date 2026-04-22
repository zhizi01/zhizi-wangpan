/**
 * 经 API 拉取二进制，浏览器侧分块读入内存后组 Blob 再「另存为」，
 * 避免 window.open 无法带鉴权。大文件会占用与文件大小相当的内存，后续可接 HTTP Range 或 FSAW。
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

function normalizeBase(): string {
  return API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
}

function buildApiUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizeBase()}${path}`;
}

function getBearerHeaders(includeAuth: boolean): HeadersInit {
  const h: Record<string, string> = { Accept: '*/*' };
  if (includeAuth) {
    const token = localStorage.getItem('token');
    if (token) h.Authorization = `Bearer ${token}`;
  }
  return h;
}

async function readErrorJson(res: Response): Promise<string> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const j = (await res.json()) as { message?: string };
      return j.message || `请求失败 (${res.status})`;
    } catch {
      return `请求失败 (${res.status})`;
    }
  }
  return `请求失败 (${res.status})`;
}

function saveBlobToDisk(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseContentLength(res: Response): number | undefined {
  const v = res.headers.get('content-length');
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export interface DownloadToBrowserOptions {
  /** 相对根路径，如 /files/download/1（会接在 VITE_API_BASE_URL 后）或完整 http(s) URL */
  path: string;
  method?: 'GET' | 'POST';
  body?: object;
  fileName: string;
  includeAuth?: boolean;
  onProgress?: (loaded: number, total: number | undefined) => void;
}

/**
 * 分块读取 body，拼为 Blob 后触发本地下载。
 */
export async function downloadToBrowser(options: DownloadToBrowserOptions): Promise<void> {
  const {
    path,
    method = 'GET',
    body: jsonBody,
    fileName,
    includeAuth = true,
    onProgress,
  } = options;

  const finalUrl = buildApiUrl(path);
  const headers: Record<string, string> = {
    ...getBearerHeaders(includeAuth) as Record<string, string>,
  };
  if (jsonBody && method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: method === 'POST' && jsonBody != null ? JSON.stringify(jsonBody) : undefined,
  });

  if (!res.ok) {
    throw new Error(await readErrorJson(res));
  }

  const total = parseContentLength(res);
  if (!res.body) {
    const blob = await res.blob();
    saveBlobToDisk(fileName, blob);
    onProgress?.(blob.size, total);
    return;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress?.(loaded, total);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const blob = new Blob(chunks as BlobPart[]);
  saveBlobToDisk(fileName, blob);
}

/** 私有文件：GET /api/.../files/download/:id */
export function getPrivateFileDownloadPath(fileId: number): string {
  return `/files/download/${fileId}`;
}
