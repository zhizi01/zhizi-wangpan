import fs from 'fs';
import path from 'path';
import { getWriteEnvPath, getActiveReadEnvPath } from './envFilePath';

export const MANAGED_BANNER = '# zhizi-files managed env (do not duplicate keys above)';

export const ENV_WHITELIST = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'PORT',
  'NODE_ENV',
  'UPLOAD_DIR',
  'MAX_FILE_SIZE',
  'VITE_API_BASE_URL',
] as const;

const WHITELIST_SET = new Set<string>(ENV_WHITELIST);

export function isWhitelistedKey(key: string): boolean {
  return WHITELIST_SET.has(key);
}

export function isSecretKey(key: string): boolean {
  if (/(_PASSWORD|_PASS|_SECRET|TOKEN|_KEY|SECRET)$/i.test(key)) return true;
  return ['DB_PASSWORD', 'JWT_SECRET', 'SMTP_PASS'].includes(key);
}

export function maskEnvValue(value: string | undefined): { display: string; isSet: boolean } {
  if (value == null || value === '') {
    return { display: '', isSet: false };
  }
  return { display: '********', isSet: true };
}

/** 解析为键值，仅白名单内键会进入 map */
export function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || !WHITELIST_SET.has(k)) continue;
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
      v = v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    map.set(k, v);
  }
  return map;
}

function formatEnvLine(k: string, v: string): string {
  if (/[\r\n#"'=]/.test(v) || /\s/.test(v)) {
    return `${k}="${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `${k}=${v}`;
}

/**
 * 移除原内容中由白名单管理的行，再追加新块。保留注释与其它键。
 */
export function buildEnvFileContent(original: string, finalValues: Map<string, string | undefined>): string {
  const lines = (original || '').split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      out.push(line);
      continue;
    }
    if (t.startsWith('#')) {
      if (t === MANAGED_BANNER) break;
      out.push(line);
      continue;
    }
    const eq = t.indexOf('=');
    if (eq < 1) {
      out.push(line);
      continue;
    }
    const k = t.slice(0, eq).trim();
    if (WHITELIST_SET.has(k)) {
      continue;
    }
    out.push(line);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  if (out.length) out.push('');
  out.push(MANAGED_BANNER);
  for (const k of ENV_WHITELIST) {
    if (!finalValues.has(k)) continue;
    const v = finalValues.get(k);
    if (v === undefined || v === null) continue;
    if (v === '') continue;
    out.push(formatEnvLine(k, v));
  }
  return out.join('\n') + '\n';
}

export function readEnvFileMap(): { path: string; fromFile: Map<string, string> } {
  const p = getActiveReadEnvPath();
  const pathToUse = p ?? getWriteEnvPath();
  if (p) {
    const content = fs.readFileSync(p, 'utf-8');
    return { path: p, fromFile: parseEnvFile(content) };
  }
  return { path: pathToUse, fromFile: new Map() };
}

/**
 * 合并 file、process.env 的有效值，用于读展示（file 优先于 env）
 */
export function getMergedUnmasked(
  fromFile: Map<string, string>
): Map<string, string> {
  const m = new Map<string, string>();
  for (const k of ENV_WHITELIST) {
    const f = fromFile.get(k);
    if (f !== undefined) {
      m.set(k, f);
    } else if (process.env[k] !== undefined) {
      m.set(k, process.env[k]!);
    }
  }
  return m;
}

export function maskForResponse(merged: Map<string, string>): {
  filePath: string;
  readPath: string | null;
  values: Record<string, { display: string; isSet: boolean; isSecret: boolean }>;
} {
  const filePath = getWriteEnvPath();
  const readPath = getActiveReadEnvPath();
  const values: Record<string, { display: string; isSet: boolean; isSecret: boolean }> = {};
  for (const k of ENV_WHITELIST) {
    const raw = merged.get(k);
    const secret = isSecretKey(k);
    if (secret) {
      const m = maskEnvValue(raw);
      values[k] = { display: m.display, isSet: m.isSet, isSecret: true };
    } else {
      const v = raw ?? '';
      values[k] = { display: v, isSet: v !== '', isSecret: false };
    }
  }
  return { filePath, readPath, values };
}

export function backupAndWrite(newContent: string, targetPath: string): void {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(targetPath)) {
    const bak = path.join(
      dir,
      `env.bak.${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    );
    try {
      fs.copyFileSync(targetPath, bak);
    } catch {
      // ignore
    }
  }
  fs.writeFileSync(targetPath, newContent, 'utf-8');
}

/**
 * 以文件内键为基准作部分更新（不把 `process.env` 仅因展示合并而写回文件）。
 * 未出现在 `updates` 的键保留文件内原值；`""` 从文件中移除此键；密文未改时前端可传 `********`。
 */
export function applyEnvUpdates(
  fromFile: Map<string, string>,
  updates: Record<string, string | undefined>
): Map<string, string | undefined> {
  const result = new Map<string, string | undefined>();
  for (const k of ENV_WHITELIST) {
    if (!Object.prototype.hasOwnProperty.call(updates, k)) {
      if (fromFile.has(k)) result.set(k, fromFile.get(k));
      continue;
    }
    const v = updates[k];
    if (v === '') {
      result.set(k, undefined);
      continue;
    }
    if (v === undefined) {
      if (fromFile.has(k)) result.set(k, fromFile.get(k));
      continue;
    }
    if (isSecretKey(k) && (v === '********' || v === '****')) {
      if (fromFile.has(k)) result.set(k, fromFile.get(k));
      continue;
    }
    result.set(k, v);
  }
  return result;
}
