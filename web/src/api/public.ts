import apiClient from './client';

export async function fetchPublicSiteName(): Promise<string | null> {
  try {
    const r = (await apiClient.get('/public/site-name')) as {
      success?: boolean;
      data?: { siteName?: string };
    };
    if (r?.success && r.data?.siteName) return r.data.siteName;
  } catch {
    // 无后端或失败时保持默认标题
  }
  return null;
}
