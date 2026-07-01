import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const cleanEnv = (value) => value?.trim().replace(/^['"]|['"]$/g, '');

const config = {
  cloud_name: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: cleanEnv(process.env.CLOUDINARY_API_KEY),
  api_secret: cleanEnv(process.env.CLOUDINARY_API_SECRET),
  upload_preset: cleanEnv(process.env.CLOUDINARY_UPLOAD_PRESET),
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
  upload_preset: config.upload_preset || 'NOT_SET',
});

try {
  const ping = await cloudinary.api.ping();
  console.log('Cloudinary ping OK:', ping);

  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  const upload = config.upload_preset
    ? await fetch(`https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`, {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', tinyPng);
          formData.append('upload_preset', config.upload_preset);
          return formData;
        })(),
      }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || response.statusText);
        return payload;
      })
    : await cloudinary.uploader.upload(tinyPng, {
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
