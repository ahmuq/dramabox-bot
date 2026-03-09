import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

export class VipHandler {
  #api;
  #columnCache = new Map();
  #bookCache;

  constructor(api, bookCache) {
    this.#api = api;
    this.#bookCache = bookCache;
  }

  register(bot) {
    bot.callbackQuery("vip", (ctx) => this.#showColumns(ctx));
    bot.callbackQuery(/^vip_col:(\d+)$/, (ctx) => this.#showColumnBooks(ctx));
  }

  async #showColumns(ctx) {
    try {
      const res = await this.#api.getVip();
      if (!res.success) throw new Error();

      for (const col of res.data) {
        this.#columnCache.set(String(col.columnId), col);
        for (const book of col.bookList) {
          this.#bookCache.set(book.bookId, book);
        }
      }

      const text = "⭐ <b>VIP Collection</b>\n\nPilih kategori:";
      const opts = {
        parse_mode: "HTML",
        reply_markup: Keyboard.vipColumns(res.data),
      };
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

  async #showColumnBooks(ctx) {
    const colId = ctx.match[1];
    const column = this.#columnCache.get(colId);
    if (!column)
      return ctx.answerCallbackQuery({ text: "Data tidak ditemukan" });

    const text = Formatter.dramaListTitle(column.title);
    const extra = [{ text: "🔙 Kembali ke VIP", data: "vip" }];
    const kb = Keyboard.dramaList(
      column.bookList,
      "detail",
      extra,
      `v${colId}`,
    );
    const opts = { parse_mode: "HTML", reply_markup: kb };

    await ctx.editMessageText(text, opts).catch(async () => {
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(text, opts);
    });
    await ctx.answerCallbackQuery();
  }
}
