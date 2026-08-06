#!/bin/bash
# ビルド & デプロイスクリプト
# VPS上で実行: bash deploy/build.sh

set -e
cd /var/www/chatlogi   # ← プロジェクトルート

echo "=== 依存パッケージインストール ==="
pnpm install --frozen-lockfile

echo "=== APIサーバー ビルド ==="
pnpm --filter @workspace/api-server run build

echo "=== フロントエンド ビルド ==="
BASE_PATH=/ pnpm --filter @workspace/sinjapan run build

echo "=== DBスキーマ適用 ==="
# 初回 or スキーマ変更時のみ実行（冪等）
pnpm --filter @workspace/db run db:push

echo "=== PM2 再起動 ==="
pm2 reload chatlogi-api --update-env 2>/dev/null || pm2 start deploy/ecosystem.config.cjs --env production

echo "✅ デプロイ完了"
