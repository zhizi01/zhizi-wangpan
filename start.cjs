/**
 * 启动 dist/index.js；NODE_PATH 指向 server/node_modules 或 dist/server/node_modules（与 install.mjs 一致）
 * 放法：项目根 start.cjs，或 dist/start.cjs（与 index.js 同目录）
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const here = path.resolve(__dirname);
const inDist = path.basename(here) === 'dist' && fs.existsSync(path.join(here, 'index.js'));

let projectRoot;
let distIndex;

if (inDist) {
  projectRoot = path.resolve(here, '..');
  distIndex = path.join(here, 'index.js');
} else {
  projectRoot = here;
  distIndex = path.join(projectRoot, 'dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    console.error('[zhizi-files] 未找到', distIndex);
    console.error('请先在开发机执行: npm run build，并将 dist/、server/ 等一并发布到服务器。');
    process.exit(1);
  }
}

function findServerNodeModules(root) {
  const a = path.join(root, 'server', 'node_modules');
  const b = path.join(root, 'dist', 'server', 'node_modules');
  const m = (d) => path.join(d, 'dotenv', 'package.json');
  if (fs.existsSync(m(a))) return a;
  if (fs.existsSync(m(b))) return b;
  return null;
}

const serverModules = findServerNodeModules(projectRoot);
if (!serverModules) {
  console.error('[zhizi-files] 未找到依赖（已检查 server/node_modules 与 dist/server/node_modules）');
  console.error('请执行:  node install.mjs  或  cd dist/server && npm install --omit=dev');
  process.exit(1);
}

const nodePath = serverModules + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : '');
const env = { ...process.env, NODE_PATH: nodePath };
const child = spawn(process.execPath, [distIndex], {
  stdio: 'inherit',
  cwd: projectRoot,
  env,
});
child.on('exit', (code) => process.exit(code == null ? 1 : code));
