import { InputFile } from "grammy";
import { Formatter } from "../utils/formatter.js";
import { Keyboard } from "../utils/keyboard.js";

const EP_PER_PAGE = 20;

export class DetailHandler {
  #api;
  #bookCache;
  #detailCache = new Map();
  #chapterCache = new Map();
  #sourceCache = new Map();

  constructor(api, bookCache) {
    this.#api = api;
    this.#bookCache = bookCache;
  }

  register(bot) {
    bot.callbackQuery(/^detail:([^:]+)(?::(.+))?$/, (ctx) =>
      this.#showDetail(ctx),
    );
    bot.callbackQuery(/^episodes:(.+)$/, (ctx) => this.#showEpisodes(ctx, 0));
    bot.callbackQuery(/^ep_page:(.+):(\d+)$/, (ctx) =>
      this.#showEpisodesPage(ctx),
    );
    bot.callbackQuery(/^play:(.+):(\d+)$/, (ctx) => this.#selectQuality(ctx));
    bot.callbackQuery(/^dl:(.+):(\d+):(\d+)$/, (ctx) => this.#sendVideo(ctx));
  }

  async #showDetail(ctx) {
    const bookId = ctx.match[1];
    const source = ctx.match[2] || this.#sourceCache.get(bookId) || null;
    if (source) this.#sourceCache.set(bookId, source);

    try {
      const [detailRes] = await Promise.all([this.#api.getDetail(bookId)]);

      this.#detailCache.set(bookId, detailRes);

      const book = this.#bookCache.get(bookId) || { bookName: "Drama", bookId };
      const text = Formatter.dramaDetail(book, detailRes);
      const backCallback = DetailHandler.#resolveBack(source);
      const kb = Keyboard.dramaDetail(bookId, backCallback);

      const coverUrl =
        book.coverWap || book.coverUrl || book.cover || book.coverImage;
      if (coverUrl) {
        await ctx.replyWithPhoto(coverUrl, {
          caption: text,
          parse_mode: "HTML",
          reply_markup: kb,
        });
        await ctx.deleteMessage().catch(() => {});
      } else {
        await ctx.editMessageText(text, {
          parse_mode: "HTML",
          reply_markup: kb,
        });
      }
    } catch {
      await ctx.editMessageText(Formatter.error(), {
        parse_mode: "HTML",
        reply_markup: Keyboard.backToMenu(),
      });
    }
    await ctx.answerCallbackQuery();
  }

  async #showEpisodes(ctx, page) {
    const bookId = ctx.match?.[1] || ctx._bookId;
    await this.#renderEpisodePage(ctx, bookId, page);
    await ctx.answerCallbackQuery();
  }

  async #showEpisodesPage(ctx) {
    const bookId = ctx.match[1];
    const page = Number(ctx.match[2]);
    await this.#renderEpisodePage(ctx, bookId, page);
    await ctx.answerCallbackQuery();
  }

  async #renderEpisodePage(ctx, bookId, page) {
    try {
      const detail =
        this.#detailCache.get(bookId) || (await this.#api.getDetail(bookId));
      this.#detailCache.set(bookId, detail);

      const chapters = detail.data?.list || [];
      const totalPages = Math.ceil(chapters.length / EP_PER_PAGE);
      const start = page * EP_PER_PAGE;
      const pageChapters = chapters.slice(start, start + EP_PER_PAGE);

      const book = this.#bookCache.get(bookId) || { bookName: "Drama" };
      const text = Formatter.episodeListHeader(book.bookName, page, totalPages);
      const kb = Keyboard.episodeList(pageChapters, bookId, page, totalPages);
      const opts = { parse_mode: "HTML", reply_markup: kb };

      await ctx.editMessageText(text, opts).catch(async () => {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, opts);
      });
    } catch {
      const opts = { parse_mode: "HTML", reply_markup: Keyboard.backToMenu() };
      await ctx
        .editMessageText(Formatter.error(), opts)
        .catch(() => ctx.reply(Formatter.error(), opts));
    }
  }

  async #selectQuality(ctx) {
    const bookId = ctx.match[1];
    const chapterIndex = Number(ctx.match[2]);

    const qualities = [720, 540, 360];
    const text = `📹 <b>Pilih Kualitas Video</b>\n▶️ Episode ${chapterIndex + 1}`;
    const kb = Keyboard.qualitySelect(bookId, chapterIndex, qualities);
    const opts = { parse_mode: "HTML", reply_markup: kb };

    await ctx.editMessageText(text, opts).catch(async () => {
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(text, opts);
    });
    await ctx.answerCallbackQuery();
  }

  async #sendVideo(ctx) {
    const bookId = ctx.match[1];
    const chapterIndex = Number(ctx.match[2]);
    const quality = Number(ctx.match[3]);

    await ctx.answerCallbackQuery({ text: "⏳ Memproses video..." });

    try {
      let chapters = this.#chapterCache.get(bookId);
      if (!chapters) {
        const res = await this.#api.getChapters(bookId, true);
        if (!res.success) throw new Error();
        chapters = res.data;
        this.#chapterCache.set(bookId, chapters);
      }

      const chapter = chapters.find((ch) => ch.chapterIndex === chapterIndex);
      if (!chapter) {
        return ctx.reply("❌ Episode tidak ditemukan.", {
          reply_markup: Keyboard.backToMenu(),
        });
      }

      const cdn =
        chapter.cdnList?.find((c) => c.isDefault === 1) || chapter.cdnList?.[0];
      if (!cdn) throw new Error("CDN not found");

      const video =
        cdn.videoPathList?.find((v) => v.quality === quality) ||
        cdn.videoPathList?.find((v) => v.isDefault === 1) ||
        cdn.videoPathList?.[0];
      if (!video) throw new Error("Video not found");

      const book = this.#bookCache.get(bookId) || { bookName: "Drama" };
      const caption = Formatter.videoCaption(book.bookName, chapterIndex + 1);

      await ctx.reply(Formatter.sendingVideo(chapterIndex + 1), {
        parse_mode: "HTML",
      });

      await ctx.replyWithVideo(new InputFile({ url: video.videoPath }), {
        caption,
        supports_streaming: true,
      });
    } catch (err) {
      await ctx.reply(
        "❌ Gagal mengirim video. Coba kualitas lain atau coba lagi nanti.",
        {
          reply_markup: Keyboard.backToMenu(),
        },
      );
    }
  }

  static #resolveBack(source) {
    if (!source) return null;
    if (source === "s") return "search";
    if (source.startsWith("p")) return `popular:${source.slice(1)}`;
    if (source.startsWith("l")) return `latest:${source.slice(1)}`;
    if (source.startsWith("d")) return `dubbed:${source.slice(1)}`;
    if (source.startsWith("v")) return `vip_col:${source.slice(1)}`;
    return null;
  }
}
