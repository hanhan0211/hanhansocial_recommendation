const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://hanhansocial-recommendation.pages.dev",
];

const defaultOriginPatterns = [
  /^https:\/\/([a-z0-9-]+\.)?hanhansocial-recommendation\.pages\.dev$/i,
];

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

export const corsOrigins = [
  ...new Set([...defaultOrigins, ...parseOrigins(process.env.FRONTEND_URLS || process.env.FRONTEND_URL)]),
];

export const isAllowedOrigin = (origin) =>
  !origin ||
  corsOrigins.includes(origin) ||
  defaultOriginPatterns.some((pattern) => pattern.test(origin));

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};
