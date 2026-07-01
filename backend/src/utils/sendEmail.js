import nodemailer from "nodemailer";

const cleanEnv = (value) => value?.trim().replace(/^['"]|['"]$/g, "");
const cleanSecret = (value) => cleanEnv(value)?.replace(/\s+/g, "");

const sendEmail = async ({ email, subject, message, html }) => {
  const user = cleanEnv(process.env.EMAIL_USER || process.env.GMAIL_USER);
  const pass = cleanSecret(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD);

  if (!user || !pass) {
    throw new Error("Missing Gmail email configuration.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"HanHan Social" <${user}>`,
    to: email,
    subject,
    text: message,
    html,
  });
};

export default sendEmail;
