// src/utils/uploadImage.js
import axios from 'axios';

export const uploadToCloudinary = async (files) => {
  const CLOUD_NAME = "djillgu7j"; 
  const UPLOAD_PRESET = "hanhan_social";
  
  const uploadPromises = Array.from(files).map(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    // THAY ĐỔI QUAN TRỌNG: Dùng cổng /auto/upload để hỗ trợ cả Video lẫn ẢNh
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      formData
    );
    return response.data.secure_url;
  });

  return await Promise.all(uploadPromises);
};