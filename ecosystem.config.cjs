/**
 * PM2: 在仓库根执行  pm2 start ecosystem.config.cjs
 * 或: pm2 start start.cjs --name zhizi-files -i 1
 */
const path = require('path');
const root = path.resolve(__dirname);

module.exports = {
  apps: [
    {
      name: 'zhizi-files',
      script: 'start.cjs',
      interpreter: 'node',
      cwd: root,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
