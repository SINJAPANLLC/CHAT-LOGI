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

export function buildEmailHtml(subject: string, body: string, recipientName?: string): string {
  const greeting = recipientName ? `${recipientName} 様` : "お客様";
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#000000;padding:24px 32px">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.5px">Chat LOGI</span>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:15px;color:#333">${greeting}</p>
          <div style="font-size:15px;color:#333;line-height:1.8;white-space:pre-wrap">${body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
          <p style="margin:0;font-size:12px;color:#999">このメールは Chat LOGI システムから自動送信されています。<br>ご不明な点は担当者までお問い合わせください。</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
