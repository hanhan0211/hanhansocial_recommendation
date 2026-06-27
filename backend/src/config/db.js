import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI_DIRECT || process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI chưa được cấu hình trong file .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Không kết nối được MongoDB:", error.message);
    if (error.message?.includes("querySrv")) {
      console.error(
        "Gợi ý: đổi MONGO_URI từ mongodb+srv:// sang mongodb:// (chuỗi kết nối trực tiếp từ MongoDB Atlas)."
      );
    }
    process.exit(1);
  }
};

export default connectDB;