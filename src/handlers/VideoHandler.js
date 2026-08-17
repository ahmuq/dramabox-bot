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
    // navigasi episode: tombol nempel di video
    bot.callbackQuery(/^epnav:(\w+):([^:]+):(\d+):(\d+):(\d+|null)$/, (ctx) =>
      this.#navigate(ctx),
    );
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

  async #navigate(ctx) {
    const [, source, bookId, episode, quality, totalRaw] = ctx.match;
    const total = totalRaw === "null" ? null : Number(totalRaw);

    const min = source === "dramabox" ? 0 : 1;
    if (Number(episode) < min || (total && Number(episode) > total)) {
      return ctx.answerCallbackQuery({ text: "Episode tidak tersedia." });
    }

    // hanya pemilik chat yang bisa menavigasi (tombol ada di chatnya)
    await ctx.answerCallbackQuery({ text: "⏳ Memuat episode..." });
    // hapus video lama supaya chat tidak menumpuk
    await ctx.deleteMessage().catch(() => {});
    await sendVideo(this.#bot, ctx.chat.id, {
      source,
      bookId,
      episode: Number(episode),
      quality: Number(quality),
      total,
    });
  }
}
