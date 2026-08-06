# Hostinger VPS デプロイ手順（Mac ターミナル）

**VPS情報**
- IP: `212.85.24.206`
- OS: Ubuntu 24.04
- ユーザー: `root`

---

## STEP 1 — VPSにSSH接続

```bash
ssh root@212.85.24.206
```

---

## STEP 2 — 使用中ポートを確認（競合防止）

```bash
# 現在使用中のポート一覧
ss -tlnp | grep LISTEN

# PM2アプリのポートを確認
pm2 list
for id in $(pm2 list | grep online | awk '{print $2}'); do
  echo "=== $id ==="; pm2 env $id 2>/dev/null | grep PORT
done
```

空いているポートをメモしておく（例: **8085** が空いている場合）

---

## STEP 3 — Neon DB を作成（まだの場合）

1. https://neon.tech で無料アカウント作成
2. 新規プロジェクト作成 → **Asia Pacific (Singapore)** を選択
3. 接続文字列をコピー: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`

---

## STEP 4 — コードをVPSにクローン

```bash
# GitHubからクローン
git clone https://github.com/SINJAPANLLC/CHAT-LOGI.git /var/www/chatlogi
cd /var/www/chatlogi
```

---

## STEP 5 — 環境変数を設定

```bash
cp /var/www/chatlogi/deploy/.env.example /var/www/chatlogi/.env
nano /var/www/chatlogi/.env
```

`.env` に以下を入力（ポートは STEP 2 で確認した空きポートに）:

```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-...
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@chatlogi.jp
SMTP_PASS=メールのパスワード
SMTP_FROM=Chat LOGI <noreply@chatlogi.jp>
ADMIN_EMAIL=info@sinjapan.jp
SQUARE_ACCESS_TOKEN=...
SQUARE_APPLICATION_ID=...
SQUARE_LOCATION_ID=...
SQUARE_ENVIRONMENT=production
SESSION_SECRET=ランダムな32文字以上の文字列
PORT=8085          ← 空きポートに変更
NODE_ENV=production
SITE_URL=https://chatlogi.jp
```

---

## STEP 6 — デプロイスクリプトを実行

```bash
bash /var/www/chatlogi/deploy/deploy-vps.sh
```

スクリプトが自動で:
- 空きポートを検出して使用
- 依存パッケージをインストール
- ビルド（API・フロント）
- DBスキーマ適用
- PM2で起動
- Nginx設定を生成

---

## STEP 7 — SSL取得

```bash
# certbot がなければインストール
apt-get install -y certbot python3-certbot-nginx

# SSL証明書を取得（Nginx自動設定）
certbot --nginx -d chatlogi.jp -d www.chatlogi.jp
```

---

## STEP 8 — Nginx再起動 & PM2自動起動設定

```bash
nginx -t && systemctl reload nginx
pm2 startup          # 表示されたコマンドをコピー&実行
pm2 save
```

---

## 動作確認

```bash
# PM2の状態
pm2 list

# APIログ
pm2 logs chatlogi-api --lines 50

# 使用ポート確認
ss -tlnp | grep 808
```

ブラウザで `https://chatlogi.jp` を開いて確認。

---

## 更新時（コード変更後）

```bash
ssh root@212.85.24.206
cd /var/www/chatlogi
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/sinjapan run build
pm2 reload chatlogi-api --update-env
```
