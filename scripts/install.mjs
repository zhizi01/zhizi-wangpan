/**
 * 部署安装：依赖安装、交互式 .env 配置、可选执行 init.sql 初始化库表
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
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

function findServerDir(projectRoot) {
  const top = path.join(projectRoot, 'server', 'package.json');
  const under = path.join(projectRoot, 'dist', 'server', 'package.json');
  if (fs.existsSync(top)) return path.join(projectRoot, 'server');
  if (fs.existsSync(under)) return path.join(projectRoot, 'dist', 'server');
  return path.join(projectRoot, 'server');
}

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

/** 从 .env 或 .env.example 读入 KEY -> value */
function parseEnvFile(p) {
  const map = new Map();
  if (!fs.existsSync(p)) return map;
  const t = fs.readFileSync(p, 'utf-8');
  for (const line of t.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq < 1) continue;
    const k = s.slice(0, eq).trim();
    const v = s.slice(eq + 1).trim();
    map.set(k, v);
  }
  return map;
}

function writeEnvFile(projectRoot, values) {
  const lines = [
    '# 由 install.mjs 生成交互配置',
    '',
    '# 数据库（init 时脚本会按 DB_NAME 改写 SQL 并建库）',
    `DB_HOST=${values.DB_HOST ?? ''}`,
    `DB_PORT=${values.DB_PORT ?? '3306'}`,
    `DB_USER=${values.DB_USER ?? ''}`,
    `DB_PASSWORD=${values.DB_PASSWORD ?? ''}`,
    `DB_NAME=${values.DB_NAME ?? 'zhizi_files'}`,
    '',
    '# JWT',
    `JWT_SECRET=${values.JWT_SECRET ?? ''}`,
    `JWT_EXPIRES_IN=${values.JWT_EXPIRES_IN ?? '7d'}`,
    '',
    '# SMTP（可选）',
    `SMTP_HOST=${values.SMTP_HOST ?? ''}`,
    `SMTP_PORT=${values.SMTP_PORT ?? '465'}`,
    `SMTP_SECURE=${values.SMTP_SECURE ?? 'true'}`,
    `SMTP_USER=${values.SMTP_USER ?? ''}`,
    `SMTP_PASS=${values.SMTP_PASS ?? ''}`,
    `SMTP_FROM=${values.SMTP_FROM ?? ''}`,
    '',
    '# 服务',
    `PORT=${values.PORT ?? '3000'}`,
    `NODE_ENV=${values.NODE_ENV ?? 'production'}`,
    `UPLOAD_DIR=${values.UPLOAD_DIR ?? './uploads'}`,
    `MAX_FILE_SIZE=${values.MAX_FILE_SIZE ?? '2147483648'}`,
    '',
    '# 前端',
    `VITE_API_BASE_URL=${values.VITE_API_BASE_URL ?? ''}`,
    '',
  ];
  const out = path.join(projectRoot, '.env');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf-8');
  console.log('已写入', out);
}

/**
 * 交互式配置 .env（使用传入的 readline，勿在内部 close）
 */
async function interactiveEnvConfig(rl, projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  const exPath = path.join(projectRoot, '.env.example');
  const fromExisting = parseEnvFile(envPath);
  const fromExample = parseEnvFile(exPath);
  const def = (k) => fromExisting.get(k) ?? fromExample.get(k) ?? '';

  const ask = async (tip, dflt, secret = false) => {
    const show = dflt === undefined || dflt === '' ? '(可留空)' : `[回车=默认: ${secret && dflt ? '******' : dflt}]`;
    const a = (await rl.question(`${tip} ${show}\n> `)).trim();
    return a === '' ? dflt : a;
  };

  console.log('\n========== 配置 .env（直接回车采用默认值）==========\n');

  if (fs.existsSync(envPath)) {
    const o = (await rl.question('已存在 .env，是否重新配置? (y/N) ')).trim().toLowerCase();
    if (o !== 'y' && o !== 'yes') {
      console.log('已保留现有 .env。');
      return;
    }
  }

  const portStr = (await ask('服务监听端口 PORT', def('PORT') || '3000', false)) || '3000';
  const port = parseInt(portStr, 10) || 3000;

  console.log('\n--- 数据库 (MySQL) ---');
  const DB_HOST = await ask('DB 主机', def('DB_HOST') || '127.0.0.1', false);
  const DB_PORT = await ask('DB 端口', def('DB_PORT') || '3306', false);
  const DB_USER = await ask('DB 用户', def('DB_USER') || 'root', false);
  const DB_PASSWORD = await ask('DB 密码', def('DB_PASSWORD') || '', true);
  const DB_NAME = await ask('库名 DB_NAME', def('DB_NAME') || 'zhizi_files', false);

  console.log('\n--- JWT ---');
  const randJwt = crypto.randomBytes(32).toString('hex');
  const JWT_IN = (await rl.question('JWT_SECRET [回车=随机生成 32 字节 hex]\n> ')).trim();
  const JWT_SECRET = JWT_IN || def('JWT_SECRET') || randJwt;
  const JWT_EXPIRES_IN = (await ask('JWT_EXPIRES_IN', def('JWT_EXPIRES_IN') || '7d', false)) || '7d';

  console.log('\n--- SMTP 邮件(可选,需注册/发信可填) ---');
  const SMTP_HOST = await ask('SMTP_HOST', def('SMTP_HOST') || '', false);
  const SMTP_PORT = (await ask('SMTP_PORT', def('SMTP_PORT') || '465', false)) || '465';
  const SMTP_SECURE = (await ask('SMTP_SECURE (true/false)', def('SMTP_SECURE') || 'true', false)) || 'true';
  const SMTP_USER = await ask('SMTP_USER', def('SMTP_USER') || '', false);
  const SMTP_PASS = await ask('SMTP_PASS', def('SMTP_PASS') || '', true);
  const SMTP_FROM = await ask('SMTP_FROM(例: 名 <a@b.com>)', def('SMTP_FROM') || '', false);

  console.log('\n--- 运行 ---');
  const NODE_ENV = (await ask('NODE_ENV (development/production)', def('NODE_ENV') || 'production', false)) || 'production';
  const UPLOAD_DIR = (await ask('上传目录 UPLOAD_DIR(相对项目根)', def('UPLOAD_DIR') || './uploads', false)) || './uploads';
  const MAX_FILE_SIZE = (await ask('单文件最大字节', def('MAX_FILE_SIZE') || '2147483648', false)) || '2147483648';
  const defaultVite = `http://127.0.0.1:${port}/api`;
  const VITE_API_BASE_URL = (await ask('VITE_API_BASE_URL(浏览器调 API,生产请改为公网+https)', def('VITE_API_BASE_URL') || defaultVite, false)) || defaultVite;

  writeEnvFile(projectRoot, {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    PORT: String(port),
    NODE_ENV,
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    VITE_API_BASE_URL,
  });
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
  console.log('已根据 .env.example 创建 .env。');
}

function loadEnvFromProjectRoot(projectRoot, serverDir) {
  const serverPkg = path.join(serverDir, 'package.json');
  if (!fs.existsSync(serverPkg)) {
    return;
  }
  const require = createRequire(serverPkg);
  const dotenv = require('dotenv');
  const envPath = path.join(projectRoot, '.env');
  dotenv.config({ path: envPath, override: true });
}

/** 将 init.sql 模板中的库名改为 DB_NAME（仅替换内置占位 zhizi_files，不落盘） */
function mysqlBacktickIdent(name) {
  return '`' + String(name).replace(/`/g, '``') + '`';
}

function applyDbNameToInitSql(sql, dbName) {
  const raw = (dbName || 'zhizi_files').trim() || 'zhizi_files';
  const id = mysqlBacktickIdent(raw);
  let out = sql;
  out = out.replace(
    /CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+zhizi_files\b/gi,
    `CREATE DATABASE IF NOT EXISTS ${id}`
  );
  out = out.replace(/\bUSE\s+zhizi_files\s*;/gi, `USE ${id};`);
  return out;
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
    console.warn('未安装 server 依赖，无法执行数据库初始化。请先安装依赖。');
    printSqlFallback(projectRoot, initSqlPath, null);
    return;
  }
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? '';
  if (!user) {
    console.warn('DB_USER 未设置，已跳过。');
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
  const rawSql = fs.readFileSync(initSqlPath, 'utf-8');
  const dbName = (process.env.DB_NAME || 'zhizi_files').trim() || 'zhizi_files';
  const sql = applyDbNameToInitSql(rawSql, dbName);
  if (dbName !== 'zhizi_files') {
    console.log('已按 .env 中 DB_NAME 改写 init.sql 中的建库/USE 语句：', dbName);
  }
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
  const rel = path.isAbsolute(initSqlPath) ? initSqlPath : path.relative(projectRoot, initSqlPath) || initSqlPath;
  console.log('\n可改用手动导入：');
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
    console.log('（若库名与 init.sql 中默认 zhizi_files 不同，请先编辑 SQL 中 CREATE DATABASE / USE，或将 DB_NAME 配好后用本脚本的 init。）');
  }
  console.log(`当前 .env 中 DB_NAME: ${db}\n`);
}

function printHelp() {
  console.log(`
zhizi-files 安装脚本

默认流程(交互式):
  1) 安装 server 生产依赖
  2) 在终端中逐项配置 .env(数据库、JWT、SMTP 等)
  3) 询问是否执行 init.sql 初始化库表

用法:
  node install.mjs
  node dist/install.mjs

选项:
  --no-deps         不执行 npm install
  --non-interactive / -n
                    不提问：若无 .env 则从 .env.example 复制; 可再加 --init-db 执行 init.sql
  --init-db         仅与 -n 联用: 在已有/刚复制的 .env 上执行 init.sql(非交互)
  --skip-init-db    交互模式下写完 .env 后「不」尝试初始化库
  -h, --help

目录说明(依赖): 见项目 README；优先 server/ 或 dist/server/ 的 package.json
`);
}

async function askInitDb(rl) {
  const a = (await rl.question('\n是否现在执行 init.sql 初始化库表? (Y/n) ')).trim().toLowerCase();
  if (a === 'n' || a === 'no') return false;
  return true;
}

async function main() {
  const raw = process.argv.slice(2);
  const args = new Set(
    raw.map((a) => {
      if (a === '-n') return '--non-interactive';
      return a;
    })
  );
  if (args.has('--help') || args.has('-h')) {
    printHelp();
    return;
  }

  const { projectRoot, serverDir, initSqlPath } = resolveLayout();
  const noDeps = args.has('--no-deps');
  const nonInteractive = args.has('--non-interactive');
  const initDbNonInteractive = args.has('--init-db');
  const skipInitDb = args.has('--skip-init-db');

  console.log('项目根目录：', projectRoot);
  console.log('server 依赖目录：', serverDir);

  if (!noDeps) {
    await installServerDeps(serverDir);
  } else {
    console.log('已按 --no-deps 跳过安装依赖。');
  }

  if (nonInteractive) {
    copyEnvIfMissing(projectRoot);
    if (initDbNonInteractive) {
      await initDatabase(projectRoot, initSqlPath, serverDir);
    }
    console.log('\n(非交互) 完成后: npm start 或 node start.cjs\n');
    return;
  }

  const rl = readline.createInterface({ input, output, terminal: true });
  try {
    await interactiveEnvConfig(rl, projectRoot);
    if (!skipInitDb) {
      const ok = await askInitDb(rl);
      if (ok) {
        await initDatabase(projectRoot, initSqlPath, serverDir);
      } else {
        console.log('已跳过 init.sql。可稍后执行: node install.mjs -n --init-db');
      }
    }
  } finally {
    rl.close();
  }

  console.log('\n请执行: npm start 或 node start.cjs 启动服务。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
