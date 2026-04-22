import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const distSql = path.join(dist, 'sql');
const distServer = path.join(dist, 'server');

const installSrc = path.join(root, 'scripts', 'install.mjs');
const initSqlSrc = path.join(root, 'server', 'sql', 'init.sql');
const startSrc = path.join(root, 'start.cjs');
const serverPkg = path.join(root, 'server', 'package.json');
const serverLock = path.join(root, 'server', 'package-lock.json');

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
if (!fs.existsSync(startSrc)) {
  console.error('postbuild: 未找到', startSrc);
  process.exit(1);
}
if (!fs.existsSync(serverPkg)) {
  console.error('postbuild: 未找到', serverPkg);
  process.exit(1);
}

fs.mkdirSync(distSql, { recursive: true });
fs.mkdirSync(distServer, { recursive: true });
fs.copyFileSync(installSrc, path.join(dist, 'install.mjs'));
fs.copyFileSync(installSrc, path.join(root, 'install.mjs'));
fs.copyFileSync(initSqlSrc, path.join(distSql, 'init.sql'));
fs.copyFileSync(startSrc, path.join(dist, 'start.cjs'));
fs.copyFileSync(serverPkg, path.join(distServer, 'package.json'));
if (fs.existsSync(serverLock)) {
  fs.copyFileSync(serverLock, path.join(distServer, 'package-lock.json'));
}
const deployTxt = [
  'zhizi-files 部署（dist 内已含 dist/server/package.json 供生产 npm install，无需再带源码版 server/）',
  '',
  '1. 整站建议目录:  项目根/.env,  项目根/dist/（含 index.js、app-dist/、server/package.json 等）',
  '   安装依赖:  node install.mjs  或  cd dist/server && npm install --omit=dev',
  '   依赖会装在 dist/server/node_modules（与构建脚本、启动脚本约定一致）',
  '',
  '2. 若仍保留开发用「顶层 server/」，install.mjs 会优先在 server/ 装依赖。',
  '',
  '3. 项目根启动:  node start.cjs  或  npm start',
  '4. 静态: dist/app-dist/ 配 Nginx，API 反代到 .env 中 PORT',
  '',
].join('\r\n');
fs.writeFileSync(path.join(dist, 'DEPLOY.txt'), deployTxt, 'utf8');
console.log(
  'postbuild: dist/install.mjs, dist/sql, dist/server/package.json, 根 install.mjs, dist/start.cjs, dist/DEPLOY.txt 已写入'
);