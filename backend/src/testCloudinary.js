import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const cleanEnv = (value) => value?.trim().replace(/^['"]|['"]$/g, '');

const config = {
  cloud_name: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: cleanEnv(process.env.CLOUDINARY_API_KEY),
  api_secret: cleanEnv(process.env.CLOUDINARY_API_SECRET),
};

cloudinary.config(config);

const mask = (value) => {
  if (!value) return 'MISSING';
  if (value.length <= 4) return 'SET';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

console.log('Cloudinary env check:', {
  cloud_name: config.cloud_name || 'MISSING',
  api_key: mask(config.api_key),
  api_secret: config.api_secret ? 'SET' : 'MISSING',
});

try {
  const ping = await cloudinary.api.ping();
  console.log('Cloudinary ping OK:', ping);

  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  const upload = await cloudinary.uploader.upload(tinyPng, {
    folder: 'hanhan_social_avatars',
    public_id: `cloudinary_test_${Date.now()}`,
    overwrite: true,
  });

  console.log('Cloudinary upload OK:', {
    secure_url: upload.secure_url,
    public_id: upload.public_id,
  });
} catch (error) {
  console.error('Cloudinary test FAIL:', {
    message: error?.message,
    httpCode: error?.http_code,
    statusCode: error?.statusCode || error?.status,
    name: error?.name,
  });
  process.exitCode = 1;
}
