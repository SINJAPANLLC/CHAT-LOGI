import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "Chat LOGI <noreply@chatlogi.jp>";

  if (!host || !user || !pass) return null;

  return {
    from,
    transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
  };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  const cfg = createTransport();
  if (!cfg) {
    console.log(`[EMAIL MOCK] To: ${to}\nSubject: ${subject}\n---\n${html}\n---`);
    return { sent: false, reason: "SMTP未設定（ログ出力のみ）" };
  }
  try {
    await cfg.transport.sendMail({ from: cfg.from, to, subject, html });
    return { sent: true };
  } catch (e: any) {
    console.error("[EMAIL ERROR]", e.message);
    return { sent: false, reason: e.message };
  }
}

export interface EmailOptions {
  subject: string;
  body: string;
  recipientName?: string;
  /** ステータスバッジ（例: "配車確定"） */
  statusBadge?: string;
  /** 案件IDへのリンク */
  shipmentId?: number;
  /** CTAボタンテキスト */
  ctaText?: string;
}

// ステータスバッジ色
const BADGE_COLOR: Record<string, string> = {
  "配車確定":   "#1a1a1a",
  "集荷完了":   "#1a1a1a",
  "配送中":     "#1a1a1a",
  "納品完了":   "#1a1a1a",
  "請求完了":   "#1a1a1a",
  "キャンセル": "#666666",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

export function buildEmailHtml(opts: EmailOptions | string, bodyArg?: string, recipientNameArg?: string): string {
  // 後方互換：buildEmailHtml(subject, body, name) の形式もサポート
  let subject: string, body: string, recipientName: string | undefined,
      statusBadge: string | undefined, shipmentId: number | undefined, ctaText: string | undefined;

  if (typeof opts === "string") {
    subject = opts;
    body = bodyArg ?? "";
    recipientName = recipientNameArg;
  } else {
    subject = opts.subject;
    body = opts.body;
    recipientName = opts.recipientName;
    statusBadge = opts.statusBadge;
    shipmentId = opts.shipmentId;
    ctaText = opts.ctaText;
  }

  const greeting = recipientName ? `${recipientName} 様` : "お客様";
  const badgeColor = statusBadge ? (BADGE_COLOR[statusBadge] ?? "#1a1a1a") : null;
  const baseUrl = process.env.APP_BASE_URL ?? "https://chatlogi.jp";
  const ctaHref = shipmentId ? `${baseUrl}/shipment/${shipmentId}` : `${baseUrl}/`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f0f0;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">

        <!-- ヘッダー -->
        <tr><td style="background:#000000;padding:28px 40px;border-radius:12px 12px 0 0">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:1px">Chat LOGI</span>
                <span style="color:#888;font-size:12px;margin-left:10px;letter-spacing:0.5px">物流AIプラットフォーム</span>
              </td>
              ${statusBadge ? `
              <td align="right">
                <span style="display:inline-block;background:${badgeColor};color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;border:1px solid rgba(255,255,255,0.2)">${statusBadge}</span>
              </td>` : ""}
            </tr>
          </table>
        </td></tr>

        <!-- ボディ -->
        <tr><td style="background:#ffffff;padding:40px 40px 32px">

          <!-- 挨拶 -->
          <p style="margin:0 0 24px;font-size:15px;color:#333;font-weight:500">${greeting}</p>

          <!-- 本文 -->
          <div style="font-size:15px;color:#333;line-height:1.9;margin-bottom:32px">${esc(body)}</div>

          ${(ctaText || shipmentId) ? `
          <!-- CTAボタン -->
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 32px">
            <tr><td style="background:#000;border-radius:8px">
              <a href="${ctaHref}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px">${ctaText ?? "案件を確認する →"}</a>
            </td></tr>
          </table>` : ""}

          <!-- 区切り -->
          <hr style="border:none;border-top:1px solid #ebebeb;margin:0 0 24px">

          <!-- フッター情報 -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-size:12px;color:#aaa;line-height:1.7">
                <p style="margin:0 0 4px">このメールは <strong>Chat LOGI</strong> から自動送信されています。</p>
                <p style="margin:0">心当たりのない場合や、ご不明な点は担当者までお問い合わせください。</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- フッターバー -->
        <tr><td style="background:#f7f7f7;padding:20px 40px;border-radius:0 0 12px 12px;border-top:1px solid #ebebeb">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-size:11px;color:#bbb">© ${new Date().getFullYear()} Chat LOGI</td>
              <td align="right" style="font-size:11px">
                <a href="${baseUrl}" style="color:#bbb;text-decoration:none">マイページ</a>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
