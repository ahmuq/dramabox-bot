import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

export class SearchHandler {
  #api;
  #waitingSearch = new Set();
  #bookCache = new Map();

  constructor(api) {
    this.#api = api;
  }

  get bookCache() {
    return this.#bookCache;
  }

  register(bot) {
    bot.callbackQuery("search", (ctx) => this.#promptSearch(ctx));
    bot.callbackQuery(/^sr:(.+)$/, (ctx) => this.#showDetail(ctx));
    bot.on("message:text", (ctx, next) => this.#handleText(ctx, next));
  }

  async #promptSearch(ctx) {
    this.#waitingSearch.add(ctx.from.id);
    await ctx.editMessageText(Formatter.searchPrompt(), {
      parse_mode: "HTML",
      reply_markup: Keyboard.backToMenu(),
    });
    await ctx.answerCallbackQuery();
  }

  async #handleText(ctx, next) {
    if (!this.#waitingSearch.has(ctx.from.id)) return next();
    this.#waitingSearch.delete(ctx.from.id);

    const keyword = ctx.message.text.trim();
    if (!keyword)
      return ctx.reply(Formatter.searchPrompt(), { parse_mode: "HTML" });

    await ctx.reply("🔍 Mencari...", { parse_mode: "HTML" });

    try {
      const res = await this.#api.search(keyword);
      if (!res.success || !res.data?.length) {
        return ctx.reply(Formatter.noResult(), {
          parse_mode: "HTML",
          reply_markup: Keyboard.backToMenu(),
        });
      }

      for (const book of res.data) {
        this.#bookCache.set(book.bookId, book);
      }

      const text = Formatter.searchResult(keyword, res.data.length);
      const kb = Keyboard.dramaList(res.data, "detail");
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
    } catch {
      await ctx.reply(Formatter.error(), {
        parse_mode: "HTML",
        reply_markup: Keyboard.backToMenu(),
      });
    }
  }

  async #showDetail(ctx) {
    const bookId = ctx.match[1];
    const book = this.#bookCache.get(bookId);
    if (!book) return ctx.answerCallbackQuery({ text: "Data tidak ditemukan" });

    await ctx.editMessageText(Formatter.dramaCard(book), {
      parse_mode: "HTML",
      reply_markup: Keyboard.dramaDetail(bookId),
    });
    await ctx.answerCallbackQuery();
  }
}
