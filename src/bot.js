import { Bot } from "grammy";
import { DramaBoxAPI } from "./api/DramaBoxAPI.js";
import { config } from "./config.js";
import { DetailHandler } from "./handlers/DetailHandler.js";
import { DubbedHandler } from "./handlers/DubbedHandler.js";
import { LatestHandler } from "./handlers/LatestHandler.js";
import { MenuHandler } from "./handlers/MenuHandler.js";
import { PopularHandler } from "./handlers/PopularHandler.js";
import { SearchHandler } from "./handlers/SearchHandler.js";
import { VipHandler } from "./handlers/VipHandler.js";

const bot = new Bot(config.botToken, {
  client: {
    apiRoot: config.telegramApiUrl,
  },
});

const api = new DramaBoxAPI();

const searchHandler = new SearchHandler(api);
const bookCache = searchHandler.bookCache;

const menuHandler = new MenuHandler();
const vipHandler = new VipHandler(api, bookCache);
const popularHandler = new PopularHandler(api, bookCache);
const latestHandler = new LatestHandler(api, bookCache);
const dubbedHandler = new DubbedHandler(api, bookCache);
const detailHandler = new DetailHandler(api, bookCache);

menuHandler.register(bot);
vipHandler.register(bot);
popularHandler.register(bot);
latestHandler.register(bot);
dubbedHandler.register(bot);
detailHandler.register(bot);
searchHandler.register(bot);

bot.catch((err) => {
  console.error("Bot error:", err.message);
});

bot.start({
  onStart: () => console.log("🤖 DramaBox Bot is running..."),
});
