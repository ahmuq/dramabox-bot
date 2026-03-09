import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

const RANK_LABELS = {
  1: "🔥 Trending",
  2: "🔍 Paling Dicari",
  3: "🆕 Terbaru Populer",
};

export class PopularHandler {
  #api;
  #bookCache;

  constructor(api, bookCache) {
    this.#api = api;
    this.#bookCache = bookCache;
  }

  register(bot) {
    bot.callbackQuery(/^popular:(\d)$/, (ctx) => this.#showPopular(ctx));
  }

  async #showPopular(ctx) {
    const rankType = Number(ctx.match[1]);

    try {
      const res = await this.#api.getPopular(rankType);
      if (!res.success || !res.data?.length) throw new Error();

      for (const book of res.data) {
        this.#bookCache.set(book.bookId, book);
      }

      const label = RANK_LABELS[rankType] || "Populer";
      const text = `📊 <b>${label}</b>\n\nPilih drama:`;
      const kb = Keyboard.dramaList(res.data, "detail", [], `p${rankType}`);
      const opts = { parse_mode: "HTML", reply_markup: kb };

      await ctx.editMessageText(text, opts).catch(async () => {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, opts);
      });
    } catch {
      await ctx.editMessageText(Formatter.error(), {
        parse_mode: "HTML",
        reply_markup: Keyboard.backToMenu(),
      });
    }
    await ctx.answerCallbackQuery();
  }
}
