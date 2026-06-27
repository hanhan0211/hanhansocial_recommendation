// src/seed.js
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { fakerVI } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Like from './models/Like.js';
import Follow from './models/Follow.js';
import Hashtag from './models/Hashtag.js';
import { extractHashtags } from './utils/hashtagUtils.js';

dotenv.config();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Lấy n phần tử ngẫu nhiên không trùng từ mảng */
const sample = (arr, n) => faker.helpers.shuffle([...arr]).slice(0, n);

/** Random số nguyên [min, max] */
const randInt = (min, max) => faker.number.int({ min, max });

/** Tên người dùng: 80% Tiếng Việt, 20% nước ngoài */
const randomFullname = () =>
  Math.random() < 0.8 ? fakerVI.person.fullName() : faker.person.fullName();

/** Username an toàn từ tên */
const toUsername = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase()
    .slice(0, 20) + '_' + faker.string.alphanumeric(4);

// ─── Nội dung tiếng Việt theo chủ đề ───────────────────────────────────────

const viPhrases = [
  // Âm nhạc
  'Hôm nay mình nghe lại bài cũ, tự nhiên thấy nhớ quá 🎵 Âm nhạc thật kỳ diệu, nó có thể đưa mình về một khoảng thời gian tưởng đã quên từ lâu.',
  'Đang trong mood nghe nhạc acoustic cả ngày ☕🎸 Không cần lời, chỉ cần melody thôi là đã đủ cảm xúc rồi.',
  'Playlist buổi sáng của mình toàn nhạc lo-fi, chill phết! Ai có bài nào hay recommend mình với nhé 🎧',
  'Mới xem concert online của ban nhạc yêu thích, ước gì được trực tiếp một lần 🥲🎤 Tiếng guitar live nó khác hẳn studio.',
  'Rap Việt đang lên quá! Mình không ngờ âm nhạc underground lại bùng nổ mạnh như vậy 🔥 Proud of the scene!',

  // Du lịch
  'Vừa về từ Đà Lạt, thành phố mù sương mà mình yêu từ lần đầu đặt chân đến 🌸 Khí hậu ở đây khác hẳn Sài Gòn oi bức.',
  'Hội An về đêm đẹp đến nao lòng 🏮 Những chiếc đèn lồng đủ màu sắc phản chiếu xuống sông Hoài, mình đứng nhìn mãi không chán.',
  'Sapa mùa này lạnh lắm mà view thì đẹp không tả nổi ⛰️ Ruộng bậc thang lúa chín vàng, thấy cuộc đời sao mà bình yên.',
  'Phú Quốc biển xanh, cát trắng, nắng vàng... Đây đích thực là thiên đường! 🌊🏝️ Mình đang plan trip cho hè này rồi.',
  'Đang lang thang ở phố cổ Hà Nội, ăn bún chả buổi sáng rồi uống cà phê trứng nghe nhạc xẩm... Cuộc đời còn hơn cả thế 😌',

  // Con người & cảm xúc
  'Có những ngày mình thức dậy và tự hỏi: liệu mình có đang đi đúng hướng không? Nhưng rồi nhìn xung quanh, thấy bao nhiêu người yêu thương mình, lại thấy ổn rồi 💙',
  'Một lời cảm ơn chân thành gửi đến những người bạn luôn ở đây khi mình cần 🤍 Bạn bè tốt là tài sản quý giá nhất.',
  'Đôi khi không cần phải giỏi nhất, chỉ cần cố gắng hết sức là đã đủ tự hào với bản thân rồi 💪 Keep going!',
  'Mình học được rằng: so sánh bản thân với người khác chỉ lấy đi niềm vui của mình. Hành trình của mỗi người là duy nhất 🌱',
  'Cà phê sáng + quyển sách hay + một góc yên tĩnh = ngày hoàn hảo 📚☕ Simple life, happy mind!',

  // Học tập
  'Ôn thi cuối kỳ mà não đang đình công 😭 Ai có tips học bài hiệu quả không chỉ mình với? Mình đã thử Pomodoro nhưng vẫn bị phân tâm.',
  'Vừa defend đề tài xong! Cảm giác nhẹ nhõm pha lẫn hồi hộp khi chờ kết quả 😅 4 năm đại học tóm gọn trong 20 phút thuyết trình.',
  'Học lập trình khó nhưng khi code chạy đúng thì nghiện luôn 💻🔥 Bug sáng nay fix cả tiếng mới ra, mà vui không tả được.',
  'Mình đang học tiếng Anh mỗi ngày, dù chỉ 15 phút thôi nhưng consistency mới là key 🎯 1 năm sau nhìn lại sẽ thấy khác biệt.',
  'Thư viện trường vào mùa thi đông nghịt người, chỗ ngồi hiếm như vàng 📖 Nhưng cái không khí học tập tập thể nó cũng có gì đó motivating lắm.',

  // Đời thường
  'Mưa Sài Gòn đổ xuống bất ngờ quá, kẹt xe cả tiếng đồng hồ mà không có dù ☔ Thôi kệ, coi như thử thách mỗi ngày!',
  'Hôm nay nấu ăn hỏng hoàn toàn 😂 Cơm khê, canh mặn, nhưng vẫn ăn hết vì tự tay làm mà. Lần sau sẽ rút kinh nghiệm!',
  'Gym xong người nhẹ hơn hẳn, endorphin lên cao ngùn ngụt 🏋️ Ai bảo tập thể dục không vui là chưa tìm được môn phù hợp thôi!',
  'Cuối tuần này không đi đâu, chỉ ở nhà đọc sách và nấu ăn thôi 🏠 Introvert mode: ON. Cần nạp năng lượng cho tuần mới.',
];

/** Lấy nội dung tiếng Việt ngẫu nhiên (có thể ghép 1–2 câu) */
const viContent = () => {
  const pick = () => viPhrases[randInt(0, viPhrases.length - 1)];
  return randInt(0, 1) === 0 ? pick() : `${pick()}\n\n${pick()}`;
};

// ─── URL media ───────────────────────────────────────────────────────────────

const VIDEO_URLS = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
];

// Biến đếm toàn cục để mỗi bài viết có seed ảnh riêng
let _imgSeedCounter = 100;
const randImage = () => {
  // picsum.photos/seed/{n}/width/height → mỗi seed cho ảnh khác nhau hoàn toàn
  const s = _imgSeedCounter++;
  const w = [800, 900, 1000][s % 3];
  const h = [900, 1000, 1100][s % 3];
  return `https://picsum.photos/seed/${s}/${w}/${h}`;
};
const randVideo = () => VIDEO_URLS[randInt(0, VIDEO_URLS.length - 1)];

// ─── Seed chính ──────────────────────────────────────────────────────────────

const seed = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI chưa được định nghĩa trong .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công');

  // ── 1. Xóa trắng DB ────────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Like.deleteMany({}),
    Follow.deleteMany({}),
    Hashtag.deleteMany({}),
  ]);
  console.log('🗑️  Đã xóa sạch dữ liệu cũ (bao gồm Hashtags)');

  // ── 2. Tạo 100 Users ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('123456', 10);
  const usedUsernames = new Set();
  const usedEmails = new Set();

  const userDocs = [];
  while (userDocs.length < 100) {
    const fullname = randomFullname();
    let username = toUsername(fullname);
    let email = faker.internet.email().toLowerCase();

    // Đảm bảo không trùng
    if (usedUsernames.has(username)) username += faker.string.alphanumeric(3);
    if (usedEmails.has(email)) email = `u${userDocs.length}_${email}`;

    usedUsernames.add(username);
    usedEmails.add(email);

    // createdAt trải dài 2 năm để timeline đa dạng
    const userCreatedAt = faker.date.past({ years: 2 });

    userDocs.push({
      username,
      fullname,
      email,
      password: passwordHash,
      avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      bio: Math.random() < 0.6
        ? fakerVI.lorem.sentence(randInt(5, 12))
        : '',
      role: 'user',
      isBanned: false,
      followers: [],
      following: [],
      savedPosts: [],
      createdAt: userCreatedAt,
      updatedAt: userCreatedAt,
    });
  }

  // Dùng raw collection để bypass Mongoose timestamps auto-override
  await User.collection.insertMany(userDocs);
  const createdUsers = await User.find({ email: { $in: userDocs.map(u => u.email) } }).lean();
  const userIds = createdUsers.map((u) => u._id);
  console.log(`✅ Đã tạo ${createdUsers.length} người dùng`);

  // ── 3. Mạng lưới Follow chéo ───────────────────────────────────────────────
  console.log('⏳ Đang xây dựng mạng lưới follow...');
  const followDocs = [];

  for (let i = 0; i < userIds.length; i++) {
    const me = userIds[i];
    const others = userIds.filter((_, j) => j !== i);
    const targets = sample(others, randInt(15, 40));

    for (const target of targets) {
      followDocs.push({ followerId: me, followingId: target });

      // Cập nhật mảng following/followers inline (bulk sẽ xử lý sau)
      createdUsers[i].following.push(target);
      const targetUser = createdUsers.find((u) => u._id.equals(target));
      if (targetUser) targetUser.followers.push(me);
    }
  }

  // Bulk write follow docs
  await Follow.insertMany(followDocs, { ordered: false });

  // Bulk update following/followers arrays trên User collection
  const userBulkOps = createdUsers.map((u) => ({
    updateOne: {
      filter: { _id: u._id },
      update: { $set: { following: u.following, followers: u.followers } },
    },
  }));
  await User.bulkWrite(userBulkOps);
  console.log(`✅ Đã tạo ${followDocs.length} quan hệ follow`);

  // ── 4. Tạo Posts, Comments, Likes, Saves ──────────────────────────────────
  console.log('⏳ Đang tạo bài viết và tương tác...');
  const postDocs = [];
  const commentDocs = [];
  const likeDocs = [];
  const userSavedMap = {}; // userId -> [postId]
  const hashtagCounts = {}; // tag -> count

  for (const user of createdUsers) {
    const numPosts = randInt(5, 10);

    for (let p = 0; p < numPosts; p++) {
      // Media: 80% ảnh, 20% video
      const isImage = Math.random() < 0.8;
      const mediaCount = isImage ? randInt(1, 3) : 1;
      const images = isImage
        ? Array.from({ length: mediaCount }, randImage)
        : [randVideo()];

      // 1. RANDOM HASHTAG: Khai báo một mảng các hashtag mẫu mang tính thực tế
      const hashtagPool = ['#dulich', '#hoctap', '#chill', '#MERNstack', '#IT', '#thugian', '#genZ', '#coding'];
      const chosenTags = sample(hashtagPool, randInt(1, 3));
      const hashtagSuffix = chosenTags.join(' ');
      const rawContent = viContent();
      const contentWithTags = `${rawContent}\n\n${hashtagSuffix}`;

      // Trích xuất các tag hợp lệ
      const tags = extractHashtags(contentWithTags);

      // Lưu đếm hashtag vào map bộ nhớ
      for (const tag of tags) {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      }

      // Likes: 10–50 user ID khác nhau
      const likers = sample(userIds, randInt(10, 50));

      // Saves: 5–20 user ID khác nhau
      const savers = sample(userIds, randInt(5, 20));

      // Shares: con số đơn thuần (không có model riêng)
      const shares = randInt(0, 20);

      const postId = new mongoose.Types.ObjectId();

      const postCreatedAt = faker.date.past({ years: 1 });

      postDocs.push({
        _id: postId,
        content: contentWithTags,
        images,
        hashtags: tags,
        userId: user._id,
        likes: likers,
        shares,
        createdAt: postCreatedAt,
        updatedAt: postCreatedAt,
      });

      // Like docs (collection Like)
      for (const likerId of likers) {
        likeDocs.push({ userId: likerId, postId });
      }

      // Save: đẩy postId vào savedPosts của từng saver
      for (const saverId of savers) {
        const key = saverId.toString();
        if (!userSavedMap[key]) userSavedMap[key] = [];
        userSavedMap[key].push(postId);
      }

      // Comments: 2–15 bình luận
      const numComments = randInt(2, 15);
      for (let c = 0; c < numComments; c++) {
        const cmtDate = faker.date.between({ from: postCreatedAt, to: new Date() });
        commentDocs.push({
          content: viPhrases[randInt(0, viPhrases.length - 1)].slice(0, 120),
          userId: userIds[randInt(0, userIds.length - 1)],
          postId,
          parentId: null,
          createdAt: cmtDate,
          updatedAt: cmtDate,
        });
      }
    }
  }

  // Dùng raw MongoDB collection.insertMany để bypass Mongoose timestamps hoàn toàn
  // → createdAt ngẫu nhiên sẽ được ghi đúng vào DB, không bị override
  const cleanPostDocs = postDocs.map(({ shares: _s, ...rest }) => {
    // Đảm bảo isHidden có mặt để query không bị lỗi
    return { ...rest, isHidden: false };
  });
  await Post.collection.insertMany(cleanPostDocs);
  console.log(`✅ Đã tạo ${cleanPostDocs.length} bài viết với createdAt ngẫu nhiên`);

  // BulkWrite for Hashtags
  const hashtagOps = Object.entries(hashtagCounts).map(([tag, count]) => ({
    updateOne: {
      filter: { name: tag },
      update: { $inc: { count: count } },
      upsert: true
    }
  }));
  if (hashtagOps.length > 0) {
    await Hashtag.bulkWrite(hashtagOps);
    console.log(`✅ Đã đồng bộ ${hashtagOps.length} hashtags`);
  }

  await Comment.collection.insertMany(commentDocs);
  console.log(`✅ Đã tạo ${commentDocs.length} bình luận với createdAt ngẫu nhiên`);

  await Like.insertMany(likeDocs, { ordered: false });
  console.log(`✅ Đã tạo ${likeDocs.length} lượt thích (Like collection)`);

  // Cập nhật savedPosts cho từng user
  const saveBulkOps = Object.entries(userSavedMap).map(([uid, postIds]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(uid) },
      update: { $addToSet: { savedPosts: { $each: postIds } } },
    },
  }));
  if (saveBulkOps.length > 0) {
    await User.bulkWrite(saveBulkOps);
    console.log(`✅ Đã cập nhật savedPosts cho ${saveBulkOps.length} users`);
  }

  console.log('\n🚀 Seeding hoàn tất!');
  console.log('💡 Đăng nhập thử với email bất kỳ trong DB, mật khẩu: 123456');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Lỗi seed:', err);
  process.exit(1);
});