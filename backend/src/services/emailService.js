import nodemailer from 'nodemailer';

const cleanEnv = (value) => value?.trim().replace(/^['"]|['"]$/g, '');
const cleanSecret = (value) => cleanEnv(value)?.replace(/\s+/g, '');

const getMailConfig = () => {
  const user = cleanEnv(process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER);
  const pass = cleanSecret(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS);
  const host = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
  const port = Number(cleanEnv(process.env.SMTP_PORT) || 587);
  const from = cleanEnv(process.env.EMAIL_FROM) || user;

  return { user, pass, host, port, from };
};

const createTransporter = ({ user, pass, host, port, secure }) => {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 5000,
  });
};

export const sendPasswordResetEmail = async ({ to, code, username }) => {
  const { user, pass, host, port, from } = getMailConfig();

  if (!user || !pass) {
    throw new Error('Missing email SMTP configuration.');
  }

  const mailOptions = {
    from: `"HanHan Social" <${from}>`,
    to,
    subject: 'Ma xac nhan dat lai mat khau HanHan Social',
    text: `Xin chao ${username || ''}, ma xac nhan dat lai mat khau cua ban la ${code}. Ma co hieu luc trong 10 phut.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Dat lai mat khau HanHan Social</h2>
        <p>Xin chao ${username || 'ban'},</p>
        <p>Ma xac nhan dat lai mat khau cua ban la:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f3f4f6;padding:14px 18px;border-radius:10px;display:inline-block">
          ${code}
        </div>
        <p>Ma nay co hieu luc trong 10 phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter({ user, pass, host, port, secure: port === 465 });
    await transporter.sendMail(mailOptions);
  } catch (error) {
    if (host === 'smtp.gmail.com' && port !== 465) {
      const fallbackTransporter = createTransporter({ user, pass, host, port: 465, secure: true });
      await fallbackTransporter.sendMail(mailOptions);
      return;
    }
    throw error;
  }
};
