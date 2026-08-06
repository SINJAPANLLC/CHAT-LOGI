#!/bin/bash
# Chat LOGI — Hostinger VPS デプロイスクリプト
# 使い方: bash deploy/deploy-vps.sh
# Ubuntu 24.04 / PM2 / Nginx 環境前提

set -e

APP_NAME="chatlogi-api"
APP_DIR="/var/www/chatlogi"
LOG_DIR="/var/log/chatlogi"

echo "======================================"
echo " Chat LOGI VPS デプロイ"
echo "======================================"

# ── 1. ポート競合チェック ──────────────────────────────────────────────────
echo ""
echo ">>> 使用中のポート確認中..."
echo "現在使用中のポート一覧:"
ss -tlnp | grep LISTEN | awk '{print $4}' | grep -oP ':\K[0-9]+$' | sort -n | uniq

# 8081〜8099 の中から空きを探す
FREE_PORT=""
for port in 8081 8082 8083 8084 8085 8086 8087 8088 8089 8090 8091 8092 8093 8094 8095; do
  if ! ss -tlnp | grep -q ":${port} "; then
    FREE_PORT=$port
    break
  fi
done

if [ -z "$FREE_PORT" ]; then
  echo "❌ 8081-8095 が全て使用中です。手動でポートを指定してください。"
  exit 1
fi

echo ""
echo "✅ 使用するポート: $FREE_PORT"

# ── 2. Node.js / pnpm / PM2 確認 ─────────────────────────────────────────
echo ""
echo ">>> Node.js / pnpm / PM2 確認中..."

if ! command -v node &> /dev/null; then
  echo "Node.js をインストール中..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pnpm &> /dev/null; then
  echo "pnpm をインストール中..."
  npm install -g pnpm@latest
fi

if ! command -v pm2 &> /dev/null; then
  echo "PM2 をインストール中..."
  npm install -g pm2
fi

node --version
pnpm --version
pm2 --version

# ── 3. ディレクトリ確認 ────────────────────────────────────────────────────
echo ""
echo ">>> ディレクトリ準備..."
mkdir -p $APP_DIR $LOG_DIR

# ── 4. .env 確認 ────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "❌ $APP_DIR/.env が存在しません。"
  echo "   deploy/.env.example を参考に作成してください:"
  echo ""
  echo "   nano $APP_DIR/.env"
  echo ""
  exit 1
fi

# .env の PORT をデプロイ用に上書き（競合回避）
sed -i "s/^PORT=.*/PORT=$FREE_PORT/" $APP_DIR/.env
grep -q "^PORT=" $APP_DIR/.env || echo "PORT=$FREE_PORT" >> $APP_DIR/.env

echo "PORT=$FREE_PORT を .env に設定しました"

# ── 5. 依存インストール & ビルド ───────────────────────────────────────────
echo ""
echo ">>> 依存インストール中..."
cd $APP_DIR
pnpm install --frozen-lockfile

echo ""
echo ">>> APIサーバー ビルド中..."
pnpm --filter @workspace/api-server run build

echo ""
echo ">>> フロントエンド ビルド中..."
BASE_PATH=/ pnpm --filter @workspace/sinjapan run build

echo ""
echo ">>> DBスキーマ適用..."
pnpm --filter @workspace/db run db:push || echo "⚠️ db:push スキップ（手動で実行してください）"

# ── 6. PM2 起動 ─────────────────────────────────────────────────────────────
echo ""
echo ">>> PM2 起動..."

# ecosystem を動的に生成（ポートを埋め込み）
cat > $APP_DIR/deploy/ecosystem.generated.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: '$APP_DIR/artifacts/api-server/dist/index.mjs',
    cwd: '$APP_DIR',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: '$FREE_PORT',
    },
    error_file: '$LOG_DIR/api-error.log',
    out_file:   '$LOG_DIR/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
EOF

if pm2 list | grep -q "$APP_NAME"; then
  pm2 reload $APP_NAME --update-env
else
  pm2 start $APP_DIR/deploy/ecosystem.generated.cjs
fi

pm2 save

# ── 7. Nginx 設定 ────────────────────────────────────────────────────────────
echo ""
echo ">>> Nginx 設定ファイルを生成..."

cat > /etc/nginx/sites-available/chatlogi << EOF
server {
    listen 80;
    server_name chatlogi.jp www.chatlogi.jp;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chatlogi.jp www.chatlogi.jp;

    ssl_certificate     /etc/letsencrypt/live/chatlogi.jp/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chatlogi.jp/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    root $APP_DIR/artifacts/sinjapan/dist/public;
    index index.html;

    location /api/ {
        proxy_pass         http://127.0.0.1:$FREE_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        client_max_body_size 20M;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|otf|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
EOF

# sites-enabled にリンク
ln -sf /etc/nginx/sites-available/chatlogi /etc/nginx/sites-enabled/chatlogi

# Nginx 設定テスト
if nginx -t; then
  echo ""
  echo "✅ Nginx設定OK"
else
  echo "❌ Nginx設定にエラーがあります"
  exit 1
fi

# ── 8. 完了レポート ──────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo " デプロイ完了！"
echo "======================================"
echo ""
echo "  APIポート : $FREE_PORT"
echo "  PM2 名前  : $APP_NAME"
echo "  静的ファイル: $APP_DIR/artifacts/sinjapan/dist/public"
echo ""
echo "次のステップ:"
echo "  1. SSL取得: certbot --nginx -d chatlogi.jp -d www.chatlogi.jp"
echo "  2. Nginx再起動: systemctl reload nginx"
echo "  3. PM2自動起動: pm2 startup"
echo ""
echo "  ログ確認: pm2 logs $APP_NAME"
echo "  状態確認: pm2 list"
