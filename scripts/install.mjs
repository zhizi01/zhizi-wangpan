/**
 * 部署安装：在仓库根执行 node dist/install.mjs 或 node install.mjs（postbuild 会拷到根）
 * 见 --help
 *
 * npm 依赖目录（二选一，优先前者）:
 *  - 项目根/server/（开发时）
 *  - 项目根/dist/server/（build 时 postbuild 已复制 package.json，部署可不带上层源码 server/）
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveInitSqlPath(projectRoot, scriptDir) {
  const candidates = [
    path.join(scriptDir, 'sql', 'init.sql'),
    path.join(projectRoot, 'dist', 'sql', 'init.sql'),
    path.join(projectRoot, 'server', 'sql', 'init.sql'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

/** 与 start.cjs 一致：优先 项目根/server，否则 项目根/dist/server */
function findServerDir(projectRoot) {
  const top = path.join(projectRoot, 'server', 'package.json');
  const under = path.join(projectRoot, 'dist', 'server', 'package.json');
  if (fs.existsSync(top)) return path.join(projectRoot, 'server');
  if (fs.existsSync(under)) return path.join(projectRoot, 'dist', 'server');
  return path.join(projectRoot, 'server');
}

/**
 * 解析「项目根」与 init.sql；serverDir 由 findServerDir(项目根) 决定
 */
function resolveLayout() {
  const base = path.basename(__dirname);
  let projectRoot;
  let initSqlPath;

  if (base === 'dist') {
    projectRoot = path.resolve(__dirname, '..');
    initSqlPath = resolveInitSqlPath(projectRoot, __dirname);
  } else if (base === 'scripts') {
    projectRoot = path.resolve(__dirname, '..');
    initSqlPath = resolveInitSqlPath(projectRoot, path.join(projectRoot, 'dist'));
  } else if (fs.existsSync(path.join(__dirname, 'server', 'package.json'))) {
    projectRoot = __dirname;
    initSqlPath = resolveInitSqlPath(projectRoot, projectRoot);
  } else if (fs.existsSync(path.join(__dirname, 'dist', 'server', 'package.json'))) {
    // 仅上传构建产物、根目录放了 install.mjs，无上层源码 server/
    projectRoot = __dirname;
    initSqlPath = resolveInitSqlPath(projectRoot, path.join(projectRoot, 'dist'));
  } else {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'server', 'package.json')) || fs.existsSync(path.join(cwd, 'dist', 'server', 'package.json'))) {
      projectRoot = cwd;
      initSqlPath = resolveInitSqlPath(projectRoot, path.join(projectRoot, 'dist'));
    } else {
      projectRoot = cwd;
      initSqlPath = resolveInitSqlPath(projectRoot, path.join(projectRoot, 'dist'));
    }
  }

  const serverDir = findServerDir(projectRoot);
  return { projectRoot, serverDir, initSqlPath };
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

async function installServerDeps(serverDir) {
  const pkg = path.join(serverDir, 'package.json');
  if (!fs.existsSync(pkg)) {
    throw new Error(
      `未找到 ${pkg}。请确保存在 server/package.json 或 dist/server/package.json（需先 npm run build 生成 dist/server，或从仓库带上 server/）。`
    );
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

function loadEnvFromProjectRoot(projectRoot, serverDir) {
  const serverPkg = path.join(serverDir, 'package.json');
  if (!fs.existsSync(serverPkg)) {
    return;
  }
  const require = createRequire(serverPkg);
  const dotenv = require('dotenv');
  const envPath = path.join(projectRoot, '.env');
  dotenv.config({ path: envPath });
}

async function initDatabase(projectRoot, initSqlPath, serverDir) {
  loadEnvFromProjectRoot(projectRoot, serverDir);
  if (!fs.existsSync(initSqlPath)) {
    console.error('未找到 init.sql：', initSqlPath);
    printSqlFallback(projectRoot, initSqlPath, null);
    return;
  }
  const serverPkg = path.join(serverDir, 'package.json');
  if (!fs.existsSync(path.join(serverDir, 'node_modules', 'mysql2'))) {
    console.warn('未安装 server 依赖，无法自动执行 --init-db。请先运行本脚本（不要带 --no-deps）以安装依赖');
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
用法:
  项目根:  node install.mjs  或  node dist/install.mjs

依赖装到哪里（二选一，脚本自动检测）:
  开发:     项目根/server/package.json  →  node_modules 在 server/
  部署构建: 项目根/dist/server/package.json  →  node_modules 在 dist/server/
  （先 npm run build 后 dist/ 下会有与后端编译结果放在一起的 dist/server/ 包清单。）

  在网站根执行时请用  node /path/install.mjs  或先 cd 到项目根。

步骤:
  1) npm install 生产依赖到上述 server 目录之一
  2) 若无 .env 则从 .env.example 生成

选项:
  --no-deps   跳过 npm 安装
  --init-db   在已装依赖且 .env 中 DB_* 正确时，执行 dist/sql 或 server/sql 下的 init.sql
  --help, -h  本说明
`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    printHelp();
    return;
  }
  const { projectRoot, serverDir, initSqlPath } = resolveLayout();
  const noDeps = args.has('--no-deps');
  const wantDb = args.has('--init-db');

  console.log('项目根目录：', projectRoot);
  console.log('server 依赖目录（含 package.json）：', serverDir);

  if (!noDeps) {
    await installServerDeps(serverDir);
  } else {
    console.log('已按 --no-deps 跳过安装依赖。');
  }

  copyEnvIfMissing(projectRoot);

  if (wantDb) {
    await initDatabase(projectRoot, initSqlPath, serverDir);
  }

  console.log(
    '\n完成后请：编辑 .env，然后 npm start 或 node start.cjs（已支持 server/ 与 dist/server 两种 node_modules）。'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
