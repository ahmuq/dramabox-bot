import { InlineKeyboard } from "grammy";

export class Keyboard {
  static mainMenu() {
    return new InlineKeyboard()
      .text("🔥 Trending", "popular:1")
      .text("🔍 Cari Drama", "search")
      .row()
      .text("⭐ VIP Collection", "vip")
      .text("📺 Terbaru", "latest:1")
      .row()
      .text("🎬 Sulih Suara", "dubbed:1")
      .text("📊 Paling Dicari", "popular:2")
      .row()
      .text("🆕 Terbaru Populer", "popular:3");
  }

  static backToMenu() {
    return new InlineKeyboard().text("🏠 Menu Utama", "menu");
  }

  static dramaList(books, prefix, extra = [], source = "") {
    const kb = new InlineKeyboard();
    for (const book of books) {
      const label = `🎬 ${book.bookName}`;
      const cb = source
        ? `${prefix}:${book.bookId}:${source}`
        : `${prefix}:${book.bookId}`;
      kb.text(label.slice(0, 60), cb).row();
    }
    for (const btn of extra) {
      kb.text(btn.text, btn.data).row();
    }
    kb.text("🏠 Menu Utama", "menu");
    return kb;
  }

  static vipColumns(columns) {
    const kb = new InlineKeyboard();
    for (const col of columns) {
      kb.text(`📂 ${col.title}`, `vip_col:${col.columnId}`).row();
    }
    kb.text("🏠 Menu Utama", "menu");
    return kb;
  }

  static dramaDetail(bookId, backCallback) {
    const kb = new InlineKeyboard()
      .text("📋 Daftar Episode", `episodes:${bookId}`)
      .row();
    if (backCallback) {
      kb.text("🔙 Kembali", backCallback).text("🏠 Menu", "menu");
    } else {
      kb.text("🏠 Menu Utama", "menu");
    }
    return kb;
  }

  static episodeList(chapters, bookId, page = 0, totalPages = 1) {
    const kb = new InlineKeyboard();
    for (let i = 0; i < chapters.length; i += 2) {
      const ch1 = chapters[i];
      kb.text(
        `▶️ EP ${ch1.chapterIndex + 1}`,
        `play:${bookId}:${ch1.chapterIndex}`,
      );
      if (chapters[i + 1]) {
        const ch2 = chapters[i + 1];
        kb.text(
          `▶️ EP ${ch2.chapterIndex + 1}`,
          `play:${bookId}:${ch2.chapterIndex}`,
        );
      }
      kb.row();
    }
    const navRow = [];
    if (page > 0)
      navRow.push({ text: "⬅️ Prev", data: `ep_page:${bookId}:${page - 1}` });
    if (page < totalPages - 1)
      navRow.push({ text: "➡️ Next", data: `ep_page:${bookId}:${page + 1}` });
    for (const btn of navRow) {
      kb.text(btn.text, btn.data);
    }
    if (navRow.length) kb.row();
    kb.text("🔙 Detail", `detail:${bookId}`).text("🏠 Menu", "menu");
    return kb;
  }

  static pagination(prefix, currentPage, hasMore) {
    const kb = new InlineKeyboard();
    const nav = [];
    if (currentPage > 1)
      nav.push({ text: "⬅️ Prev", data: `${prefix}:${currentPage - 1}` });
    if (hasMore)
      nav.push({ text: "➡️ Next", data: `${prefix}:${currentPage + 1}` });
    for (const btn of nav) kb.text(btn.text, btn.data);
    if (nav.length) kb.row();
    kb.text("🏠 Menu Utama", "menu");
    return kb;
  }

  static qualitySelect(bookId, chapterIndex, qualities) {
    const kb = new InlineKeyboard();
    for (const q of qualities) {
      kb.text(`📹 ${q}p`, `dl:${bookId}:${chapterIndex}:${q}`).row();
    }
    kb.text("🔙 Episode", `episodes:${bookId}`);
    return kb;
  }
}
