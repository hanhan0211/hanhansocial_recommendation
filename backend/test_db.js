import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;

mongoose.connect(uri).then(async () => {
  const count = await mongoose.connection.collection('posts').countDocuments();
  console.log('Total posts in DB:', count);

  const posts = await mongoose.connection.collection('posts').find({ isHidden: { $ne: true } }).limit(5).toArray();
  console.log('Posts matching query:', posts.length);

  mongoose.disconnect();
});
