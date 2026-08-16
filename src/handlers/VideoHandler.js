import { rm } from "node:fs/promises";
import { InputFile } from "grammy";
import { getSource } from "../api/sources.js";
import { downloadHlsToMp4 } from "../downloader.js";

export class VideoHandler {
  register(bot) {
    bot.on("message:web_app_data", (ctx) => this.#handle(ctx));
  }

  async #handle(ctx) {
    let payload;
    try {
      payload = JSON.parse(ctx.message.web_app_data.data);
    } catch {
      return ctx.reply("❌ Data tidak valid.");
    }

    const { source, bookId, episode, quality, title } = payload;
    if (!source || !bookId || !episode) {
      return ctx.reply("❌ Data tidak valid.");
    }

    const bookTitle = title || "Drama";
    const status = await ctx.reply(
      `⏳ <b>${bookTitle}</b> — Episode ${episode} sedang diproses...`,
      { parse_mode: "HTML" },
    );

    let tempFile = null;
    try {
      const src = getSource(source);
      const ep = await src.episode(bookId, Number(episode));

      const video =
        ep.videos.find((v) => v.quality === String(quality)) || ep.videos[0];

      let inputFile;
      if (video.format === "hls") {
        await status.editText(
          `📥 Mengunduh video (HLS → MP4)... mohon tunggu sebentar ⏳`,
        ).catch(() => {});
        tempFile = await downloadHlsToMp4(video.url);
        inputFile = new InputFile(tempFile);
      } else {
        inputFile = new InputFile({ url: video.url });
      }

      await ctx.replyWithVideo(inputFile, {
        caption: `🎬 <b>${bookTitle}</b>\n▶️ Episode ${episode}${
          video.quality ? ` (${video.quality}p)` : ""
        }`,
        parse_mode: "HTML",
        supports_streaming: true,
      });

      await status.delete().catch(() => {});
    } catch (err) {
      console.error("VideoHandler error:", err.message);
      await status
        .editText("❌ Gagal mengirim video. Coba episode/kualitas lain atau coba lagi nanti.")
        .catch(() => {});
    } finally {
      if (tempFile) await rm(tempFile, { force: true }).catch(() => {});
    }
  }
}
