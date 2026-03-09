import "dotenv/config";

export const config = {
  botToken: process.env.BOT_TOKEN,
  telegramApiUrl: process.env.TELEGRAM_API_URL || "https://api.telegram.org",
  dramabox: {
    apiKey: process.env.DRAMABOX_API_KEY,
    baseUrl:
      process.env.DRAMABOX_API_BASE || "https://bagahproject.com/api/dramabox",
  },
};
