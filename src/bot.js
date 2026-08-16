import { Bot } from "grammy";
import { config } from "./config.js";
import { MenuHandler } from "./handlers/MenuHandler.js";
import { VideoHandler } from "./handlers/VideoHandler.js";
import { startServer } from "./server.js";

const bot = new Bot(config.botToken, {
  client: {
    apiRoot: config.telegramApiUrl,
  },
});

new MenuHandler().register(bot);
new VideoHandler().register(bot);

bot.catch((err) => {
  console.error("Bot error:", err.message);
});

bot.start({
  onStart: (me) => console.log(`🤖 @${me.username} is running...`),
});

startServer();
