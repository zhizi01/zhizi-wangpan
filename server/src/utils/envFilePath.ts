import fs from 'fs';
import path from 'path';

/**
 * 与 [config/loadEnv] 中候选顺序一致：先 `server/.env`，再项目根 `.env`。
 * 编译产物在仓库根目录 `dist/` 下，本文件位于 `dist/utils/`，`__dirname/../..` 即仓库根。
 */
function getProjectRoot(): string {
  return path.resolve(__dirname, '../..');
}

export function getEnvFileCandidates(): string[] {
  const root = getProjectRoot();
  return [path.join(root, 'server', '.env'), path.join(root, '.env')];
}

/** 已存在的 .env 路径，用于读；无则 null */
export function getActiveReadEnvPath(): string | null {
  for (const p of getEnvFileCandidates()) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * 用于写入：与 loadEnv 一致优先正在使用的文件，否则在「第一候选 server/.env」创建。
 */
export function getWriteEnvPath(): string {
  return getActiveReadEnvPath() ?? getEnvFileCandidates()[0];
}
