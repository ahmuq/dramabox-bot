import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

export class DubbedHandler {
  #api;
  #bookCache;

  constructor(api, bookCache) {
    this.#api = api;
    this.#bookCache = bookCache;
  }

  register(bot) {
    bot.callbackQuery(/^dubbed:(\d+)$/, (ctx) => this.#showDubbed(ctx));
  }

  async #showDubbed(ctx) {
    const page = Number(ctx.match[1]);

    try {
      const res = await this.#api.getDubbed(page, 15);
      if (!res.success || !res.data?.length) throw new Error();

      for (const book of res.data) {
        this.#bookCache.set(book.bookId, book);
      }

      const hasMore = res.meta?.hasMore ?? res.data.length >= 15;
      const nav = [];
      if (page > 1) nav.push({ text: "⬅️ Prev", data: `dubbed:${page - 1}` });
      if (hasMore) nav.push({ text: "➡️ Next", data: `dubbed:${page + 1}` });

      const text = `🎬 <b>Sulih Suara (Dubbed Indonesia)</b> — Hal. ${page}\n\nPilih drama:`;
      const kb = Keyboard.dramaList(res.data, "detail", nav, `d${page}`);
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
