const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://hanhansocial-recommendation.pages.dev",
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
