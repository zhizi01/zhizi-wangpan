/**
 * 部署安装：在仓库根执行 node dist/install.mjs（或开发时 node scripts/install.mjs）
 * 见 --help
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPaths() {
  const base = path.basename(__dirname);
  let projectRoot;
  let initSqlPath;
  if (base === 'dist') {
    projectRoot = path.resolve(__dirname, '..');
    initSqlPath = path.join(__dirname, 'sql', 'init.sql');
  } else if (base === 'scripts') {
    projectRoot = path.resolve(__dirname, '..');
    initSqlPath = path.join(projectRoot, 'server', 'sql', 'init.sql');
  } else {
    projectRoot = process.cwd();
    initSqlPath = path.join(projectRoot, 'dist', 'sql', 'init.sql');
  }
  return { projectRoot, initSqlPath };
}

function runNpm(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      stdio: 'inherit',
      shell: true,
      cwd,
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`npm 退出码 ${code}`))));
    child.on('error', reject);
  });
}

async function installServerDeps(projectRoot) {
  const serverDir = path.join(projectRoot, 'server');
  if (!fs.existsSync(path.join(serverDir, 'package.json'))) {
    throw new Error(`未找到 ${path.join('server', 'package.json')}，请从仓库根运行`);
  }
  const lock = path.join(serverDir, 'package-lock.json');
  try {
    if (fs.existsSync(lock)) {
      await runNpm(['ci', '--omit=dev'], serverDir);
    } else {
      await runNpm(['install', '--omit=dev'], serverDir);
    }
  } catch {
    await runNpm(['install', '--omit=dev'], serverDir);
  }
  console.log('已安装 server 生产依赖。');
}

function copyEnvIfMissing(projectRoot) {
  const target = path.join(projectRoot, '.env');
  const example = path.join(projectRoot, '.env.example');
  if (fs.existsSync(target)) {
    return;
  }
  if (!fs.existsSync(example)) {
    console.warn('未找到 .env.example，已跳过创建 .env，请自行新建 .env。');
    return;
  }
  fs.copyFileSync(example, target);
  console.log('已根据 .env.example 创建 .env，请编辑其中的密钥与连接信息。');
}

function loadEnvFromProjectRoot(projectRoot) {
  const serverPkg = path.join(projectRoot, 'server', 'package.json');
  if (!fs.existsSync(serverPkg)) {
    return;
  }
  const require = createRequire(serverPkg);
  const dotenv = require('dotenv');
  const envPath = path.join(projectRoot, '.env');
  dotenv.config({ path: envPath });
}

async function initDatabase(projectRoot, initSqlPath) {
  loadEnvFromProjectRoot(projectRoot);
  if (!fs.existsSync(initSqlPath)) {
    console.error('未找到 init.sql：', initSqlPath);
    printSqlFallback(projectRoot, initSqlPath, null);
    return;
  }
  const serverPkg = path.join(projectRoot, 'server', 'package.json');
  if (!fs.existsSync(path.join(projectRoot, 'server', 'node_modules', 'mysql2'))) {
    console.warn('未安装 server 依赖，无法自动执行 --init-db。请先运行：node dist/install.mjs（不带 --no-deps）');
    printSqlFallback(projectRoot, initSqlPath, null);
    return;
  }
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? '';
  if (!user) {
    console.warn('环境变量 DB_USER 未设置，已跳过 --init-db。');
    printSqlFallback(projectRoot, initSqlPath, null);
    return;
  }
  const require = createRequire(serverPkg);
  let mysql2;
  try {
    mysql2 = require('mysql2/promise');
  } catch (e) {
    console.error('无法加载 mysql2：', (e && e.message) || e);
    printSqlFallback(projectRoot, initSqlPath, null);
    return;
  }
  const sql = fs.readFileSync(initSqlPath, 'utf-8');
  let conn;
  try {
    conn = await mysql2.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });
    await conn.query(sql);
    console.log('已执行 init.sql，数据库与表已就绪。');
  } catch (e) {
    const msg = (e && e.message) || String(e);
    console.error('执行 init.sql 失败：', msg);
    printSqlFallback(projectRoot, initSqlPath, msg);
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        // ignore
      }
    }
  }
}

function printSqlFallback(projectRoot, initSqlPath, errMsg) {
  const rel = path.isAbsolute(initSqlPath)
    ? initSqlPath
    : path.relative(projectRoot, initSqlPath) || initSqlPath;
  console.log('\n可改用手动导入（在已配置 MySQL 客户端的机器上执行）：');
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const db = process.env.DB_NAME || 'zhizi_files';
  const passPart = process.env.DB_PASSWORD
    ? `-p'${String(process.env.DB_PASSWORD).replace(/'/g, "'\\''")}' `
    : '';
  const cmd = `mysql -h ${host} -P ${port} -u ${user} ${passPart}< "${rel}"`;
  console.log(cmd);
  if (errMsg) {
    console.log('（若需指定已创建的库，可先手动 CREATE DATABASE，并确保 .env 中 DB_NAME 与脚本一致。）');
  }
  console.log(`当前期望库名与脚本一致，默认: ${db}\n`);
}

function printHelp() {
  console.log(`
用法（在仓库根目录）:
  node dist/install.mjs [选项]

步骤:
  1. 在 server/ 下安装生产依赖 (npm ci 或 npm install --omit=dev)
  2. 若不存在 .env，则从 .env.example 复制

选项:
  --no-deps   跳过 npm 安装
  --init-db   在已安装 server 依赖且 .env 已配置 DB_* 时，执行 init.sql（多语句一次执行）
  --help, -h  显示本说明
`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    printHelp();
    return;
  }
  const { projectRoot, initSqlPath } = getPaths();
  const noDeps = args.has('--no-deps');
  const wantDb = args.has('--init-db');

  console.log('项目根目录：', projectRoot);

  if (!noDeps) {
    await installServerDeps(projectRoot);
  } else {
    console.log('已按 --no-deps 跳过安装依赖。');
  }

  copyEnvIfMissing(projectRoot);

  if (wantDb) {
    await initDatabase(projectRoot, initSqlPath);
  }

  console.log('\n完成后请：编辑 .env，然后在仓库根执行 node dist/index.js 或 npm start。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
