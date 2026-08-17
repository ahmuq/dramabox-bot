import { rm } from "node:fs/promises";
import { InputFile } from "grammy";
import { getSource } from "./api/sources.js";
import { burnSubtitleToMp4, downloadHlsToMp4 } from "./downloader.js";

// message effect (animasi emoji Telegram) — hanya valid di chat privat;
// kalau ditolak (mis. di grup), ulangi kirim tanpa efek.
const EFFECTS = {
  party: "5046509860389126442", // 🎉
  wave: "5089234812070265877", // 👋
};

async function sendVideoWithEffect(bot, chatId, inputFile, other) {
  try {
    return await bot.api.sendVideo(chatId, inputFile, {
      ...other,
      message_effect_id: EFFECTS.party,
    });
  } catch (err) {
    if (!/effect/i.test(err.message || "")) throw err;
    return await bot.api.sendVideo(chatId, inputFile, other);
  }
}

/**
 * Ambil video untuk payload {source, bookId, episode, quality, title, total}
 * lalu kirim ke chatId dengan tombol navigasi episode.
 * Dipakai endpoint POST /api/request-video dari mini app dan VideoHandler.
 */
export function episodeNavKeyboard(source, bookId, episode, quality, total) {
  const min = source === "dramabox" ? 0 : 1;
  // dramabox: indeks 0..total-1; reelshort: indeks 1..total
  const maxIndex = min === 0 ? total - 1 : total;
  const mk = (label, target) => ({
    text: label,
    callback_data: `epnav:${source}:${bookId}:${target}:${quality}:${total}`,
  });
  const row = [];
  if (episode > min) row.push(mk("⏮ Sebelumnya", episode - 1));
  if (!total || episode < maxIndex)
    row.push(mk("Episode Berikutnya ⏭", episode + 1));
  return row.length ? { inline_keyboard: [row] } : undefined;
}

export async function sendVideo(bot, chatId, payload) {
  const { source, bookId, episode, quality, total } = payload;
  // judul tidak muat di callback_data — diingat per drama untuk navigasi
  sendVideo.titles ??= new Map();
  if (payload.title) sendVideo.titles.set(`${source}:${bookId}`, payload.title);
  const bookTitle = payload.title || sendVideo.titles.get(`${source}:${bookId}`) || "Drama";

  let statusMessageId = null;
  try {
    const status = await bot.api.sendMessage(
      chatId,
      `⏳ <b>${bookTitle}</b> — Episode ${episode} sedang diproses...`,
      { parse_mode: "HTML" },
    );
    statusMessageId = status.message_id;
  } catch (err) {
    console.error("sendVideo error (status):", err.message || err);
    return;
  }

  let tempFile = null;
  try {
    const src = getSource(source);
    const ep = await src.episode(bookId, Number(episode));

    // pilih kualitas tepat; kalau tidak ada, kualitas tertinggi yang
    // masih <= permintaan; kalau semua lebih besar, ambil terkecil
    const wanted = String(quality);
    const nums = ep.videos
      .map((v) => ({ ...v, q: Number(v.quality) }))
      .sort((a, b) => a.q - b.q);
    const video =
      ep.videos.find((v) => v.quality === wanted) ||
      [...nums].reverse().find((v) => v.q <= Number(quality)) ||
      nums[0];

    let inputFile;
    if (video.format === "hls") {
      console.log(`⬇️ Mengunduh HLS ${video.quality}p...`);
      await bot.api
        .editMessageText(
          chatId,
          statusMessageId,
          "📥 Mengunduh video (HLS → MP4)... mohon tunggu ⏳",
        )
        .catch(() => {});
      tempFile = await downloadHlsToMp4(video.url);
      inputFile = new InputFile(tempFile);
    } else if (ep.subtitle) {
      console.log(`🔥 Bakar subtitle + kirim MP4 ${video.quality}p...`);
      await bot.api
        .editMessageText(
          chatId,
          statusMessageId,
          "🔥 Menambahkan subtitle... mohon tunggu ⏳",
        )
        .catch(() => {});
      try {
        tempFile = await burnSubtitleToMp4(video.url, ep.subtitle);
        inputFile = new InputFile(tempFile);
      } catch (err) {
        // kalau gagal bakar subtitle, kirim video polos + file .srt
        console.error("burnSubtitle gagal, kirim polos:", err.message || err);
        tempFile = null;
        const srtDoc = await fetch(ep.subtitle)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null);
        inputFile = new InputFile({ url: video.url });
        if (srtDoc) {
          await bot.api
            .sendDocument(
              chatId,
              new InputFile(Buffer.from(srtDoc), "subtitle.srt"),
            )
            .catch(() => {});
        }
      }
    } else {
      console.log(`⬆️ Mengunggah MP4 ${video.quality}p dari URL...`);
      inputFile = new InputFile({ url: video.url });
    }

    await sendVideoWithEffect(bot, chatId, inputFile, {
      caption: `🎬 <b>${bookTitle}</b>\n▶️ Episode ${episode}${
        video.quality ? ` (${video.quality}p)` : ""
      }`,
      parse_mode: "HTML",
      supports_streaming: true,
      reply_markup: episodeNavKeyboard(
        source,
        bookId,
        Number(episode),
        quality,
        total ? Number(total) : null,
      ),
    });

    await bot.api.deleteMessage(chatId, statusMessageId).catch(() => {});
    console.log(
      `✅ Video terkirim ke ${chatId}: ${bookTitle} ep${episode} (${video.quality}p)`,
    );
  } catch (err) {
    console.error("sendVideo error:", err.message || err);
    await bot.api
      .editMessageText(
        chatId,
        statusMessageId,
        `❌ Gagal mengirim video (${err.message || "unknown"}). Coba kualitas lebih rendah (540p/360p) atau episode lain.`,
      )
      .catch(() => {});
  } finally {
    if (tempFile) await rm(tempFile, { force: true }).catch(() => {});
  }
}
