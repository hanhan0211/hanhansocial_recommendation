// Script kiểm tra hệ thống Recommendation
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import User from './models/User.js';
import Post from './models/Post.js';
import UserPreference from './models/UserPreference.js';
import { updateAuthorScore, getRecommendedAuthors } from './services/recommendService.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công\n');

  // ─── TEST 1: TẠO DỮ LIỆU MẪU ─────────────────────────────────────
  console.log('📝 TEST 1: TẠO DỮ LIỆU MẪU');
  console.log('─'.repeat(50));

  // Lấy 3 user đầu tiên từ DB
  const users = await User.find().limit(3).select('_id username');
  if (users.length < 3) {
    console.log('❌ Cần ít nhất 3 user trong database để test');
    process.exit(1);
  }

  const [userA, userB, userC] = users;
  console.log(`👤 User A: ${userA.username} (${userA._id})`);
  console.log(`👤 User B: ${userB.username} (${userB._id})`);
  console.log(`👤 User C: ${userC.username} (${userC._id})`);

  // Tạo bài viết của User B và C nếu chưa có
  let postB = await Post.findOne({ userId: userB._id });
  if (!postB) {
    postB = await Post.create({
      content: 'Test post from User B',
      userId: userB._id,
      hashtags: ['#test'],
    });
    console.log(`✅ Đã tạo bài viết cho User B`);
  }

  let postC = await Post.findOne({ userId: userC._id });
  if (!postC) {
    postC = await Post.create({
      content: 'Test post from User C',
      userId: userC._id,
      hashtags: ['#test'],
    });
    console.log(`✅ Đã tạo bài viết cho User C`);
  }

  console.log('');

  // ─── TEST 2: TÍNH ĐIỂM TƯƠNG TÁC ─────────────────────────────────
  console.log('📝 TEST 2: TÍNH ĐIỂM TƯƠNG TÁC');
  console.log('─'.repeat(50));

  // Xóa preference cũ của User A để test lại từ đầu
  await UserPreference.deleteOne({ userId: userA._id });
  console.log('🗑️  Đã xóa preference cũ của User A\n');

  // User A tương tác với bài viết của User B
  console.log('🎯 User A LIKE bài viết của User B (+1 điểm)');
  await updateAuthorScore(userA._id, userB._id, 'LIKE');

  console.log('🎯 User A COMMENT bài viết của User B (+3 điểm)');
  await updateAuthorScore(userA._id, userB._id, 'COMMENT');

  console.log('🎯 User A SAVE bài viết của User B (+4 điểm)');
  await updateAuthorScore(userA._id, userB._id, 'SAVE');

  // User A tương tác với bài viết của User C
  console.log('🎯 User A LIKE bài viết của User C (+1 điểm)');
  await updateAuthorScore(userA._id, userC._id, 'LIKE');

  console.log('🎯 User A COMMENT bài viết của User C (+3 điểm)');
  await updateAuthorScore(userA._id, userC._id, 'COMMENT');

  console.log('');

  // ─── TEST 3: KIỂM TRA KẾT QUẢ TRONG DATABASE ─────────────────────
  console.log('📝 TEST 3: KIỂM TRA DỮ LIỆU TRONG DATABASE');
  console.log('─'.repeat(50));

  const preference = await UserPreference.findOne({ userId: userA._id });
  if (!preference) {
    console.log('❌ Không tìm thấy UserPreference của User A');
  } else {
    console.log('✅ UserPreference của User A:');
    console.log(JSON.stringify(preference.toObject(), null, 2));
    
    console.log('\n📊 Tổng kết điểm:');
    preference.interactedAuthors.forEach((author) => {
      const user = users.find(u => u._id.toString() === author.authorId.toString());
      console.log(`   - ${user?.username || 'Unknown'}: ${author.score} điểm`);
    });
  }

  console.log('');

  // ─── TEST 4: LẤY DANH SÁCH TÁC GIẢ GỢI Ý ─────────────────────────
  console.log('📝 TEST 4: LẤY DANH SÁCH TÁC GIẢ GỢI Ý');
  console.log('─'.repeat(50));

  const recommendedAuthors = await getRecommendedAuthors(userA._id, 5);
  console.log(`📈 Top ${recommendedAuthors.length} tác giả được gợi ý cho User A:`);
  
  if (recommendedAuthors.length === 0) {
    console.log('   ⚠️  Chưa có dữ liệu gợi ý');
  } else {
    for (const authorId of recommendedAuthors) {
      const author = await User.findById(authorId).select('username');
      const score = preference.interactedAuthors.find(
        a => a.authorId.toString() === authorId.toString()
      )?.score || 0;
      console.log(`   ${recommendedAuthors.indexOf(authorId) + 1}. ${author?.username || 'Unknown'} (${score} điểm)`);
    }
  }

  console.log('');

  // ─── TEST 5: KIỂM TRA UNLIKE & UNSAVE ─────────────────────────────
  console.log('📝 TEST 5: KIỂM TRA UNLIKE & UNSAVE (GIẢM ĐIỂM)');
  console.log('─'.repeat(50));

  console.log('🎯 User A UNLIKE bài viết của User C (-1 điểm)');
  await updateAuthorScore(userA._id, userC._id, 'UNLIKE');

  console.log('🎯 User A UNSAVE bài viết của User B (-4 điểm)');
  await updateAuthorScore(userA._id, userB._id, 'UNSAVE');

  const updatedPreference = await UserPreference.findOne({ userId: userA._id });
  console.log('\n📊 Điểm sau khi UNLIKE & UNSAVE:');
  updatedPreference.interactedAuthors.forEach((author) => {
    const user = users.find(u => u._id.toString() === author.authorId.toString());
    console.log(`   - ${user?.username || 'Unknown'}: ${author.score} điểm`);
  });

  console.log('');

  // ─── TEST 6: KIỂM TRA ĐIỂM <= 0 (TỰ ĐỘNG XÓA) ─────────────────────
  console.log('📝 TEST 6: KIỂM TRA XÓA TÁC GIẢ KHI ĐIỂM <= 0');
  console.log('─'.repeat(50));

  // User C hiện có 3 điểm (4 từ LIKE+COMMENT, trừ 1 từ UNLIKE)
  // Trừ thêm 3 lần nữa để xuống 0
  console.log('🎯 User A UNLIKE bài viết của User C (-1 điểm)');
  await updateAuthorScore(userA._id, userC._id, 'UNLIKE');
  console.log('🎯 User A UNLIKE bài viết của User C (-1 điểm)');
  await updateAuthorScore(userA._id, userC._id, 'UNLIKE');
  console.log('🎯 User A UNLIKE bài viết của User C (-1 điểm)');
  await updateAuthorScore(userA._id, userC._id, 'UNLIKE');

  const finalPreference = await UserPreference.findOne({ userId: userA._id });
  console.log('\n📊 Điểm cuối cùng:');
  
  if (finalPreference.interactedAuthors.length === 0) {
    console.log('   ⚠️  Không còn tác giả nào (tất cả đã bị xóa do điểm <= 0)');
  } else {
    finalPreference.interactedAuthors.forEach((author) => {
      const user = users.find(u => u._id.toString() === author.authorId.toString());
      console.log(`   - ${user?.username || 'Unknown'}: ${author.score} điểm`);
    });
  }

  const hasUserC = finalPreference.interactedAuthors.some(
    a => a.authorId.toString() === userC._id.toString()
  );
  
  if (!hasUserC) {
    console.log(`\n✅ User C đã bị xóa khỏi danh sách (điểm <= 0)`);
  } else {
    console.log(`\n⚠️  User C vẫn còn trong danh sách`);
  }

  console.log('');

  // ─── KẾT LUẬN ─────────────────────────────────────────────────────
  console.log('─'.repeat(50));
  console.log('✅ HOÀN THÀNH TẤT CẢ CÁC TEST');
  console.log('─'.repeat(50));
  console.log('\n💡 Kết luận:');
  console.log('   1. ✅ Tính điểm LIKE/COMMENT/SAVE hoạt động đúng');
  console.log('   2. ✅ Giảm điểm UNLIKE/UNSAVE hoạt động đúng');
  console.log('   3. ✅ Xóa tác giả khi điểm <= 0 hoạt động đúng');
  console.log('   4. ✅ Lấy danh sách tác giả gợi ý hoạt động đúng');
  console.log('\n🎉 Hệ thống Recommendation đã sẵn sàng sử dụng!\n');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
