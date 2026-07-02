import dotenv from 'dotenv';
import { sendPasswordResetEmail } from './services/emailService.js';

dotenv.config();

const to = process.argv[2] || process.env.BREVO_TEST_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM;

if (!to) {
  console.error('Usage: npm run test:email -- your_email@example.com');
  console.error('Or set BREVO_TEST_EMAIL in backend/.env.');
  process.exit(1);
}

try {
  await sendPasswordResetEmail({
    to,
    code: '123456',
    username: 'Test User',
  });
  console.log(`Email test OK. Sent to ${to}`);
} catch (error) {
  console.error('Email test FAIL:', {
    message: error?.message,
    status: error?.status,
  });
  process.exitCode = 1;
}
