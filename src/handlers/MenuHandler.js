import { config } from "../config.js";

export class MenuHandler {
  register(bot) {
    bot.command("start", (ctx) => this.#showMenu(ctx));
    bot.command("menu", (ctx) => this.#showMenu(ctx));

    // Set menu button (tombol di samping kolom chat) ke Mini App
    if (config.publicUrl) {
      bot.api
        .setChatMenuButton({
          menu_button: { type: "web_app", text: "🎬 Cari Drama", web_app: { url: config.publicUrl } },
        })
        .catch((err) => console.error("Gagal set menu button:", err.message));
    }
  }

  async #showMenu(ctx) {
    const name = ctx.from?.first_name || "Sob";
    const text = [
      `Hai <b>${name}</b> 👋`,
      "",
      "Bot pencarian drama <b>DramaBox</b> & <b>ReelShort</b>.",
      "Semua pencarian sekarang lewat Mini App — lebih cepat & rapi 🎬",
      "",
      "👉 Ketuk tombol di bawah atau menu button di samping kolom chat.",
    ].join("\n");

    const reply_markup = config.publicUrl
      ? {
          inline_keyboard: [
            [
              {
                text: "🎬 Buka Mini App",
                web_app: { url: config.publicUrl },
              },
            ],
          ],
        }
      : undefined;

    await ctx.reply(text, { parse_mode: "HTML", reply_markup });
  }
}
