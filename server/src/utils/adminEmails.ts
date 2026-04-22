import { query } from '../config/database';

const ADMIN_EMAILS_KEY = 'admin_emails';

/**
 * 管理员列表在 settings 表的 `admin_emails`：逗号/分号/换行分隔，不区分大小写。与 `users.is_admin` 列无关。
 */
export async function getAdminEmailSet(): Promise<Set<string>> {
  const rows = await query<{ value: string }>('SELECT value FROM settings WHERE `key` = ?', [
    ADMIN_EMAILS_KEY,
  ]);
  const raw = rows.length > 0 ? rows[0].value : null;
  if (raw == null || !String(raw).trim()) return new Set();
  return new Set(
    String(raw)
      .split(/[,\n;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function isEmailAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const s = await getAdminEmailSet();
  return s.has(String(email).trim().toLowerCase());
}

export { ADMIN_EMAILS_KEY };
