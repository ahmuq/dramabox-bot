import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

export class LatestHandler {
  #api;
  #bookCache;

  constructor(api, bookCache) {
    this.#api = api;
    this.#bookCache = bookCache;
  }

  register(bot) {
    bot.callbackQuery(/^latest:(\d+)$/, (ctx) => this.#showLatest(ctx));
  }

  async #showLatest(ctx) {
    const page = Number(ctx.match[1]);

    try {
      const res = await this.#api.getLatest(page);
      if (!res.success || !res.data?.length) throw new Error();

      for (const book of res.data) {
        this.#bookCache.set(book.bookId, book);
      }

      const text = `📺 <b>Terbaru</b> — Halaman ${page}\n\nPilih drama:`;
      const kb = Keyboard.dramaList(res.data, "detail", []);

      const hasMore = res.data.length >= 10;
      const nav = [];
      if (page > 1) nav.push({ text: "⬅️ Prev", data: `latest:${page - 1}` });
      if (hasMore) nav.push({ text: "➡️ Next", data: `latest:${page + 1}` });

      const finalKb = Keyboard.dramaList(res.data, "detail", nav);
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: finalKb,
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
