export class Formatter {
  static welcome(name) {
    return [
      `🎬 <b>Selamat Datang di DramaBox Bot, ${Formatter.escapeHtml(name)}!</b>`,
      "",
      "📺 Tonton drama seru langsung dari Telegram!",
      "Pilih menu di bawah untuk mulai:",
    ].join("\n");
  }

  static dramaCard(book) {
    const tags = (book.tags || book.tagNames || []).slice(0, 4).join(" • ");
    const lines = [`🎬 <b>${Formatter.escapeHtml(book.bookName)}</b>`, ""];
    if (book.chapterCount) lines.push(`📀 Episode: ${book.chapterCount}`);
    if (book.playCount) lines.push(`👁 Views: ${book.playCount}`);
    if (tags) lines.push(`🏷 ${tags}`);
    if (book.introduction) {
      const intro =
        book.introduction.length > 300
          ? book.introduction.slice(0, 300) + "..."
          : book.introduction;
      lines.push("", `📝 ${Formatter.escapeHtml(intro)}`);
    }
    return lines.join("\n");
  }

  static dramaListTitle(title) {
    return `📂 <b>${Formatter.escapeHtml(title)}</b>\n\nPilih drama untuk melihat detail:`;
  }

  static dramaDetail(book, detail) {
    const tags = (book.tags || book.tagNames || []).slice(0, 6).join(" • ");
    const lines = [`🎬 <b>${Formatter.escapeHtml(book.bookName)}</b>`, ""];
    if (book.chapterCount) lines.push(`📀 Episode: ${book.chapterCount}`);
    if (book.playCount) lines.push(`👁 Views: ${book.playCount}`);
    if (detail?.data?.ratingConf?.rate) {
      lines.push(
        `⭐ Rating: ${detail.data.ratingConf.rate}/5 (${detail.data.ratingConf.ratingCount} votes)`,
      );
    }
    if (tags) lines.push(`🏷 ${tags}`);
    if (book.protagonist)
      lines.push(`🎭 Cast: ${Formatter.escapeHtml(book.protagonist)}`);
    if (detail?.data?.performers?.length) {
      const actors = detail.data.performers
        .map((p) => p.performerName)
        .join(", ");
      lines.push(`🎭 Performers: ${Formatter.escapeHtml(actors)}`);
    }
    if (book.introduction) {
      lines.push("", `📝 <i>${Formatter.escapeHtml(book.introduction)}</i>`);
    }
    const freeCount =
      detail?.data?.list?.filter((ch) => ch.isCharge === 0).length || 0;
    const totalCount = detail?.data?.list?.length || 0;
    if (totalCount) {
      lines.push(
        "",
        `🔓 Gratis: ${freeCount} episode | Total: ${totalCount} episode`,
      );
    }
    return lines.join("\n");
  }

  static episodeListHeader(bookName, page, totalPages) {
    return [
      `📋 <b>Daftar Episode</b>`,
      `🎬 ${Formatter.escapeHtml(bookName)}`,
      `📄 Halaman ${page + 1}/${totalPages}`,
      "",
      "Pilih episode untuk menonton:",
    ].join("\n");
  }

  static searchPrompt() {
    return "🔍 <b>Cari Drama</b>\n\nKetik judul drama yang ingin kamu cari:";
  }

  static searchResult(keyword, count) {
    return `🔍 Hasil pencarian "<b>${Formatter.escapeHtml(keyword)}</b>"\n📊 Ditemukan ${count} drama:`;
  }

  static noResult() {
    return "😔 Tidak ditemukan drama yang sesuai. Coba kata kunci lain.";
  }

  static sendingVideo(epNum) {
    return `⏳ Mengirim Episode ${epNum}...\nMohon tunggu, file sedang dikirim.`;
  }

  static videoCaption(bookName, epNum) {
    return `🎬 ${bookName}\n▶️ Episode ${epNum}\n\n🤖 @DramaBoxBot`;
  }

  static error() {
    return "❌ Terjadi kesalahan. Silakan coba lagi nanti.";
  }

  static escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
