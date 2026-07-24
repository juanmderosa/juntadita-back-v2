const parseCsv = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS, ["http://localhost:5173"]),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SECRET_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  inviteFromEmail: process.env.INVITE_FROM_EMAIL ?? "",
  appPublicUrl: process.env.APP_PUBLIC_URL ?? "http://localhost:5173",
};
