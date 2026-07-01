import dotenv from 'dotenv';
import { sendPasswordResetEmail } from './services/emailService.js';

dotenv.config();

const to = process.argv[2] || process.env.EMAIL_USER || process.env.GMAIL_USER;

if (!to) {
  console.error('Usage: npm run test:email -- your_email@gmail.com');
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
    response: error?.response,
    code: error?.code,
    command: error?.command,
  });
  process.exitCode = 1;
}
