// backend/src/middleware/uploadMiddleware.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

const createCloudinarySignature = (params) => {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${payload}${cloudinaryConfig.api_secret}`)
    .digest('hex');
};

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

export const uploadAvatarToCloudinary = async (fileBuffer, mimetype = 'image/jpeg') => {
  if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    throw new Error('Missing Cloudinary configuration.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = {
    folder: 'hanhan_social_avatars',
    timestamp,
  };
  const signature = createCloudinarySignature(uploadParams);
  const dataUri = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
  const formData = new FormData();

  formData.append('file', dataUri);
  formData.append('folder', uploadParams.folder);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', cloudinaryConfig.api_key);
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const rawText = await response.text();
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = { error: { message: rawText } };
  }

  if (!response.ok) {
    const details = {
      message: payload?.error?.message || rawText || response.statusText,
      httpCode: response.status,
      name: 'CloudinaryUploadError',
    };
    console.error('Cloudinary avatar upload error:', details);

    const uploadError = new Error(
      details.message ||
        'Cloudinary tu choi upload avatar. Hay kiem tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET tren Render.'
    );
    uploadError.isCloudinaryUploadError = true;
    uploadError.providerStatus = response.status;
    throw uploadError;
  }

  return payload.secure_url;
};

export default upload;
