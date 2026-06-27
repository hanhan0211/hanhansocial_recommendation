// Script kiểm tra nhanh UserPreference
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import UserPreference from './models/UserPreference.js';
import User from './models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công\n');

  // Lấy tất cả UserPreference
  const preferences = await UserPreference.find().lean();

  if (preferences.length === 0) {
    console.log('⚠️  Chưa có dữ liệu UserPreference trong database');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📊 Tìm thấy ${preferences.length} bản ghi UserPreference:\n`);
  console.log('─'.repeat(80));

  for (const pref of preferences) {
    // Lấy thông tin user
    const user = await User.findById(pref.userId).select('username fullname');
    
    console.log(`\n👤 User: ${user?.username || 'Unknown'} (${user?.fullname || 'N/A'})`);
    console.log(`   ID: ${pref.userId}`);
    console.log(`   Số lượng tác giả tương tác: ${pref.interactedAuthors.length}`);
    console.log(`\n   📈 Top tác giả theo điểm:`);

    // Sắp xếp theo điểm giảm dần
    const sortedAuthors = [...pref.interactedAuthors].sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(sortedAuthors.length, 10); i++) {
      const author = sortedAuthors[i];
      const authorUser = await User.findById(author.authorId).select('username fullname');
      
      console.log(
        `   ${i + 1}. ${authorUser?.username || 'Unknown'} (${authorUser?.fullname || 'N/A'}) - ${author.score} điểm`
      );
    }

    if (sortedAuthors.length > 10) {
      console.log(`   ... và ${sortedAuthors.length - 10} tác giả khác`);
    }

    console.log('\n' + '─'.repeat(80));
  }

  console.log(`\n✅ Tổng kết: Hệ thống đã ghi nhận ${preferences.length} user có dữ liệu tương tác\n`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
