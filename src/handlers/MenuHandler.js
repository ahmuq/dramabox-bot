import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

export class MenuHandler {
  register(bot) {
    bot.command("start", (ctx) => this.#showMenu(ctx, false));
    bot.command("menu", (ctx) => this.#showMenu(ctx, false));
    bot.callbackQuery("menu", (ctx) => this.#showMenu(ctx, true));
  }

  async #showMenu(ctx, isCallback) {
    const name = ctx.from?.first_name || "User";
    const text = Formatter.welcome(name);
    const opts = { parse_mode: "HTML", reply_markup: Keyboard.mainMenu() };

    if (isCallback) {
      await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
      await ctx.answerCallbackQuery();
    } else {
      await ctx.reply(text, opts);
    }
  }
}
