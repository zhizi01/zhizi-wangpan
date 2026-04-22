import fs from 'fs';
import dotenv from 'dotenv';
import { getEnvFileCandidates } from '../utils/envFilePath';

let loaded = false;

/**
 * 与 Python 测试脚本、本地编辑习惯对齐：
 * 优先读取 server/.env，否则读取项目根目录 .env（例如 zhizi-files/.env）
 * 候选路径与 [utils/envFilePath] 中一致。
 */
export function loadEnv(): void {
  if (loaded) return;
  for (const p of getEnvFileCandidates()) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      loaded = true;
      return;
    }
  }
  dotenv.config();
  loaded = true;
}

loadEnv();
