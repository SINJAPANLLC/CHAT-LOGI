#!/bin/bash
# Hostinger VPS セットアップスクリプト
# Ubuntu 22.04 / 24.04 対象
# 使い方: sudo bash deploy/setup.sh

set -e

echo "=== 1. パッケージ更新 ==="
apt-get update && apt-get upgrade -y

echo "=== 2. Node.js 22.x インストール ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "=== 3. pnpm インストール ==="
npm install -g pnpm@latest

echo "=== 4. PM2 インストール ==="
npm install -g pm2

echo "=== 5. Nginx インストール ==="
apt-get install -y nginx

echo "=== 6. Certbot（SSL）インストール ==="
apt-get install -y certbot python3-certbot-nginx

echo "=== 7. ログディレクトリ作成 ==="
mkdir -p /var/log/chatlogi

echo "=== 8. プロジェクトディレクトリ作成 ==="
mkdir -p /var/www/chatlogi

echo ""
echo "✅ セットアップ完了"
echo ""
echo "次のステップ:"
echo "  1. git clone <repo> /var/www/chatlogi"
echo "  2. /var/www/chatlogi/.env を作成（deploy/.env.example を参考）"
echo "  3. cd /var/www/chatlogi && bash deploy/build.sh"
echo "  4. sudo cp deploy/nginx.conf /etc/nginx/sites-available/chatlogi"
echo "  5. sudo ln -s /etc/nginx/sites-available/chatlogi /etc/nginx/sites-enabled/"
echo "  6. sudo certbot --nginx -d chatlogi.jp -d www.chatlogi.jp"
echo "  7. pm2 start deploy/ecosystem.config.cjs --env production"
echo "  8. pm2 save && pm2 startup"
