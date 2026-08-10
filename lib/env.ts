const TOKEN_KEYS = [
  "REPLICATE_API_TOKEN",
  "REPLICATE_API_KEY",
  "REPLICATE_TOKEN",
] as const;

/** Replicate SDK default env name is REPLICATE_API_TOKEN. */
export function getReplicateApiToken(): string | undefined {
  for (const key of TOKEN_KEYS) {
    const raw = process.env[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim().replace(/^['"]|['"]$/g, "");
    if (value.length > 0) return value;
  }
  return undefined;
}

export function replicateTokenEnvHint(): string {
  return (
    "Thêm REPLICATE_API_TOKEN vào ai-video-app/.env.local (hoặc .env), " +
    "ví dụ: REPLICATE_API_TOKEN=r8_xxx — sau đó khởi động lại `npm run dev`."
  );
}
