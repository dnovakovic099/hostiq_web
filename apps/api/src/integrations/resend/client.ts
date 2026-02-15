import { env } from "../../env";

const RESEND_API_URL = "https://api.resend.com/emails";

const DEFAULT_FROM = env.RESEND_FROM_EMAIL ?? "HostIQ <noreply@hostiq.com>";

async function sendEmailRequest(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<{ id: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const to = Array.isArray(params.to) ? params.to : [params.to];
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from ?? DEFAULT_FROM,
      to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ id: string }> {
  return sendEmailRequest({
    to: params.to,
    subject: params.subject,
    html: params.html,
    from: params.from,
  });
}

export async function sendPasswordReset(
  email: string,
  resetToken: string,
  baseUrl: string
): Promise<void> {
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="margin:0 0 16px;font-size:24px;color:#111">Reset your password</h1>
    <p style="margin:0 0 24px;color:#555;line-height:1.6">You requested a password reset. Click the button below to set a new password.</p>
    <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Reset password</a>
    <p style="margin:24px 0 0;font-size:13px;color:#888">If you didn't request this, you can ignore this email.</p>
  </div>
</body>
</html>`;
  await sendEmail({ to: email, subject: "Reset your HostIQ password", html });
}

export async function sendInviteEmail(
  email: string,
  inviterName: string,
  role: string,
  inviteToken: string,
  baseUrl: string
): Promise<void> {
  const inviteLink = `${baseUrl}/invite?token=${encodeURIComponent(inviteToken)}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="margin:0 0 16px;font-size:24px;color:#111">You're invited to HostIQ</h1>
    <p style="margin:0 0 24px;color:#555;line-height:1.6">${inviterName} has invited you to join as <strong>${role}</strong>. Accept the invite to get started.</p>
    <a href="${inviteLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Accept invite</a>
  </div>
</body>
</html>`;
  await sendEmail({ to: email, subject: `You're invited to HostIQ by ${inviterName}`, html });
}

export async function sendEscalationAlert(
  email: string,
  escalation: { type: string; severity: string; summary: string; propertyName: string }
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="margin:0 0 16px;font-size:24px;color:#dc2626">Escalation Alert</h1>
    <p style="margin:0 0 8px;color:#555"><strong>Type:</strong> ${escalation.type}</p>
    <p style="margin:0 0 8px;color:#555"><strong>Severity:</strong> ${escalation.severity}</p>
    <p style="margin:0 0 8px;color:#555"><strong>Property:</strong> ${escalation.propertyName}</p>
    <p style="margin:16px 0 0;color:#333;line-height:1.6">${escalation.summary}</p>
  </div>
</body>
</html>`;
  await sendEmail({
    to: email,
    subject: `[${escalation.severity}] Escalation: ${escalation.type} - ${escalation.propertyName}`,
    html,
  });
}

export async function sendOwnerReport(
  email: string,
  reportHtml: string,
  reportPdf?: Buffer
): Promise<void> {
  const attachments = reportPdf
    ? [{ filename: "report.pdf", content: reportPdf.toString("base64") }]
    : undefined;
  await sendEmailRequest({
    to: email,
    subject: "Your HostIQ Owner Report",
    html: reportHtml,
    attachments,
  });
}
