const BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";
const EMAIL_TIMEOUT_MS = 15000;

const cleanEnv = (value) => value?.trim().replace(/^['"]|['"]$/g, "");
const cleanSecret = (value) => cleanEnv(value)?.replace(/\s+/g, "");

const extractEmail = (value) => {
  const cleaned = cleanEnv(value);
  if (!cleaned) return "";

  const match = cleaned.match(/<([^>]+)>/);
  return (match?.[1] || cleaned).trim();
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getMailConfig = () => {
  const apiKey = cleanSecret(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY);
  const senderEmail = extractEmail(
    process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER
  );
  const senderName = cleanEnv(process.env.BREVO_SENDER_NAME || process.env.EMAIL_FROM_NAME) || "HanHan Social";

  return { apiKey, senderEmail, senderName };
};

export const sendTransactionalEmail = async ({ to, toName, subject, text, html }) => {
  const { apiKey, senderEmail, senderName } = getMailConfig();

  if (!apiKey || !senderEmail) {
    throw new Error("Missing Brevo email configuration. Set BREVO_API_KEY and BREVO_SENDER_EMAIL.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_EMAIL_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to,
            ...(toName ? { name: toName } : {}),
          },
        ],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      const detail = body ? ` ${body}` : "";
      throw new Error(`Brevo email API failed (${response.status}).${detail}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Brevo email API request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const sendPasswordResetEmail = async ({ to, code, username }) => {
  const safeUsername = escapeHtml(username || "ban");
  const safeCode = escapeHtml(code);

  await sendTransactionalEmail({
    to,
    toName: username,
    subject: "Ma xac nhan dat lai mat khau HanHan Social",
    text: `Xin chao ${username || "ban"}, ma xac nhan dat lai mat khau cua ban la ${code}. Ma co hieu luc trong 10 phut.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Dat lai mat khau HanHan Social</h2>
        <p>Xin chao ${safeUsername},</p>
        <p>Ma xac nhan dat lai mat khau cua ban la:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f3f4f6;padding:14px 18px;border-radius:10px;display:inline-block">
          ${safeCode}
        </div>
        <p>Ma nay co hieu luc trong 10 phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
      </div>
    `,
  });
};
