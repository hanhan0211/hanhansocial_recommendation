import { sendTransactionalEmail } from "../services/emailService.js";

const sendEmail = async ({ email, subject, message, html }) => {
  await sendTransactionalEmail({
    to: email,
    subject,
    text: message,
    html,
  });
};

export default sendEmail;
