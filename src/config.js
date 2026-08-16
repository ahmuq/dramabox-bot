import "dotenv/config";

export const config = {
  botToken: process.env.BOT_TOKEN,
  telegramApiUrl: process.env.TELEGRAM_API_URL || "https://api.telegram.org",
  port: Number(process.env.PORT || 3000),
  publicUrl: process.env.PUBLIC_URL || "",
  dev: process.env.DEV === "1",
  dramabox: {
    apiKey: process.env.DRAMABOX_API_KEY,
    baseUrl:
      process.env.DRAMABOX_API_BASE || "https://api.bagahproject.com/api/dramabox",
  },
  reelshort: {
    apiKey: process.env.REELSHORT_API_KEY,
    baseUrl:
      process.env.REELSHORT_API_BASE ||
      "https://api.bagahproject.com/api/reelshort",
  },
};
