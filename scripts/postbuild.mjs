import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const distSql = path.join(dist, 'sql');

const installSrc = path.join(root, 'scripts', 'install.mjs');
const initSqlSrc = path.join(root, 'server', 'sql', 'init.sql');

if (!fs.existsSync(dist)) {
  console.error('postbuild: 未找到 dist/，请先执行 build:server');
  process.exit(1);
}
if (!fs.existsSync(installSrc)) {
  console.error('postbuild: 未找到', installSrc);
  process.exit(1);
}
if (!fs.existsSync(initSqlSrc)) {
  console.error('postbuild: 未找到', initSqlSrc);
  process.exit(1);
}

fs.mkdirSync(distSql, { recursive: true });
fs.copyFileSync(installSrc, path.join(dist, 'install.mjs'));
fs.copyFileSync(initSqlSrc, path.join(distSql, 'init.sql'));
console.log('postbuild: dist/install.mjs, dist/sql/init.sql 已写入');
