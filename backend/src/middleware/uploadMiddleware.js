// backend/src/middleware/uploadMiddleware.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const cleanEnv = (value) => value?.trim().replace(/^['"]|['"]$/g, '');

const cloudinaryConfig = {
  cloud_name: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: cleanEnv(process.env.CLOUDINARY_API_KEY),
  api_secret: cleanEnv(process.env.CLOUDINARY_API_SECRET),
};

cloudinary.config(cloudinaryConfig);

const getCloudinaryErrorDetails = (error) => ({
  message: error?.message,
  httpCode: error?.http_code,
  statusCode: error?.statusCode || error?.status,
  name: error?.name,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hanhan_social_avatars',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const postImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hanhan_social_posts',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [{ width: 1080, height: 1080, crop: 'limit' }],
  },
});

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith('image/')) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }
  cb(null, true);
};

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});
export const uploadPostImages = multer({ storage: postImageStorage });

export const uploadAvatar = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (!error) return next();

    console.error('Profile avatar upload failed:', error);

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Ảnh đại diện không được vượt quá 5MB.'
          : 'File ảnh đại diện không hợp lệ.';
      return res.status(400).json({ message });
    }

    return res.status(500).json({
      message:
        error.message ||
        'Không thể tải ảnh đại diện lên Cloudinary. Vui lòng kiểm tra cấu hình upload.',
    });
  });
};

export const uploadAvatarToCloudinary = (fileBuffer) => {
  if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    throw new Error('Missing Cloudinary configuration.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'hanhan_social_avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary avatar upload error:', getCloudinaryErrorDetails(error));
          const providerStatus = error.http_code || error.statusCode || error.status;
          const message =
            providerStatus === 403 || error.message?.includes('403')
              ? 'Cloudinary tu choi upload avatar (403). Hay kiem tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET tren Render.'
              : error.message || 'Khong the upload avatar len Cloudinary.';
          const uploadError = new Error(message);
          uploadError.isCloudinaryUploadError = true;
          uploadError.providerStatus = providerStatus;
          return reject(uploadError);
        }
        resolve(result.secure_url);
      }
    );

    stream.end(fileBuffer);
  });
};

export default upload;
