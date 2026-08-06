// PM2 設定ファイル
// 使い方: pm2 start deploy/ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: 'chatlogi-api',
      script: './artifacts/api-server/dist/index.mjs',
      cwd: '/var/www/chatlogi',        // ← VPS上のプロジェクトパスに合わせる
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: '8080',
        // 以下は /var/www/chatlogi/.env に記述する（ここには書かない）
      },
      error_file: '/var/log/chatlogi/api-error.log',
      out_file:   '/var/log/chatlogi/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
