// Script tạo tài khoản admin
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công');

  const hash = await bcrypt.hash('admin123', 10);

  // Tìm user có email admin@hanhan.com, nếu chưa có thì tạo mới
  const existing = await User.findOne({ email: 'admin@hanhan.com' });
  if (existing) {
    existing.role = 'admin';
    existing.isBanned = false;
    await existing.save();
    console.log('✅ Đã nâng cấp existing user thành Admin');
  } else {
    await User.create({
      username: 'admin_hanhan',
      fullname: 'HanHan Admin',
      email: 'admin@hanhan.com',
      password: hash,
      role: 'admin',
      avatar: '',
      isBanned: false,
    });
    console.log('✅ Đã tạo tài khoản Admin mới');
  }

  console.log('\n📋 Thông tin đăng nhập:');
  console.log('   Email   : admin@hanhan.com');
  console.log('   Password: admin123');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
