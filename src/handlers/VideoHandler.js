import { sendVideo } from "../videoSender.js";

export class VideoHandler {
  #bot;

  constructor(bot) {
    this.#bot = bot;
  }

  register(bot) {
    // jalur utama kini lewat POST /api/request-video dari mini app;
    // web_app_data tetap didukung sebagai cadangan bila terkirim
    bot.on("message:web_app_data", (ctx) => this.#handle(ctx));
  }

  async #handle(ctx) {
    let payload;
    try {
      payload = JSON.parse(ctx.message.web_app_data.data);
    } catch {
      return ctx.reply("❌ Data tidak valid.");
    }
    console.log("📩 web_app_data:", JSON.stringify(payload));
    const { source, bookId, episode } = payload;
    if (!source || !bookId || !episode) {
      return ctx.reply("❌ Data tidak valid.");
    }
    await sendVideo(this.#bot, ctx.chat.id, payload);
  }
}
