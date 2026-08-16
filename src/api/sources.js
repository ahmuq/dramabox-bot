import { DramaBoxAPI } from "./DramaBoxAPI.js";
import { ReelShortAPI } from "./ReelShortAPI.js";

const dramabox = new DramaBoxAPI();
const reelshort = new ReelShortAPI();

/**
 * Format buku normal: { id, title, cover, description, totalEpisodes, tags[] }
 * Format chapter normal: { index, title, locked }
 * Format video normal: { quality, url, format: "mp4" | "hls" }
 */
// API search/detail ReelShort tidak mengembalikan cover; feed homepage punya
// (data.lists[].books), jadi peta judul -> cover dibangun dari situ (di-cache).
let reelshortCoverPromise = null;
function reelshortCoverMap() {
  if (!reelshortCoverPromise) {
    reelshortCoverPromise = (async () => {
      const map = new Map();
      const res = await reelshort.getHomepage(1).catch(() => null);
      for (const section of res?.data?.lists || []) {
        for (const b of section.books || []) {
          if (b.book_title && b.book_pic) {
            map.set(b.book_title.toLowerCase().trim(), b.book_pic);
          }
        }
      }
      return map;
    })();
  }
  return reelshortCoverPromise;
}

async function withReelshortCover(item) {
  const covers = await reelshortCoverMap();
  const hit = covers.get(item.title.toLowerCase().trim());
  return hit ? { ...item, cover: hit } : item;
}

// judul "(Sulih Suara)" ditandai sebagai tag agar tidak terlihat seperti
// duplikat dari drama versi aslinya
function dramaBoxItem(b) {
  const dubbed = /\(sulih suara\)/i.test(b.bookName || "");
  return {
    id: b.bookId,
    title: (b.bookName || "").trim(),
    cover: b.cover || b.coverUrl || b.coverWap || "",
    description: b.introduction || "",
    totalEpisodes: null,
    tags: dubbed ? ["🎙️ Sulih Suara"] : [],
  };
}

export const sources = {
  dramabox: {
    id: "dramabox",
    label: "DramaBox",
    // API dramabox tidak mendukung pagination nyata (page diabaikan, rankType
    // 1 & 2 identik), jadi tiap halaman memakai feed berbeda lalu berhenti.
    async browse(page = 1) {
      let list = [];
      if (page === 1) list = (await dramabox.getPopular(1)).data || [];
      else if (page === 2) list = (await dramabox.getPopular(3)).data || [];
      else if (page === 3) list = (await dramabox.getDubbed(1)).data || [];
      else if (page === 4) list = (await dramabox.getLatest(1)).data || [];
      else return [];
      return list.map(dramaBoxItem);
    },
    async search(keyword, page = 1) {
      const res = await dramabox.search(keyword);
      const list = res.data || [];
      return list.map(dramaBoxItem);
    },
    async detail(bookId) {
      const res = await dramabox.getDetail(bookId);
      const chapters = res.data?.list || [];
      return {
        id: bookId,
        title: res.data?.bookName || "Drama",
        cover: res.data?.cover || "",
        description: res.data?.introduction || "",
        totalEpisodes: chapters.length,
        chapters: chapters.map((ch) => ({
          index: ch.chapterIndex,
          title: ch.chapterName || `Episode ${ch.chapterIndex + 1}`,
          locked: ch.isCharge === 1,
        })),
      };
    },
    async episode(bookId, chapterIndex) {
      const res = await dramabox.getChapters(bookId, true);
      if (!res.success) throw new Error("Chapters request failed");
      const chapter = (res.data || []).find(
        (ch) => ch.chapterIndex === chapterIndex,
      );
      if (!chapter) throw new Error("Episode not found");
      const cdn =
        chapter.cdnList?.find((c) => c.isDefault === 1) ||
        chapter.cdnList?.[0];
      if (!cdn) throw new Error("CDN not found");
      // varian "encrypt.mp4" tidak bisa diputar di Telegram (stream diacak),
      // jadi hanya varian bersih yang dipakai
      const all = (cdn.videoPathList || [])
        .filter((v) => v.videoPath && v.quality)
        .map((v) => ({
          quality: String(v.quality),
          url: v.videoPath,
          format: "mp4",
        }));
      const clean = all.filter((v) => !/encrypt/i.test(v.url));
      const videos = clean.length ? clean : all;
      if (!videos.length) throw new Error("Video not found");
      // subtitle terpisah (.srt); ambil bahasa default (biasanya Indonesia)
      const subtitle =
        (chapter.subLanguageVoList || []).find(
          (s) => s.isDefault === 1 && s.url,
        )?.url || null;
      return { title: chapter.chapterName, videos, subtitle };
    },
  },

  reelshort: {
    id: "reelshort",
    label: "ReelShort",
    // Feed homepage punya book_id yang valid di endpoint detail plus cover,
    // jadi browse langsung memakai data.lists[].books dari homepage (paginated).
    async browse(page = 1) {
      const home = await reelshort.getHomepage(page);
      const books = (home.data?.lists || [])
        .flatMap((s) => s.books || [])
        .filter((b) => b.book_id && b.book_title);
      return books.map((b) => ({
        id: b.book_id,
        title: b.book_title,
        cover: b.book_pic || "",
        description: b.special_desc || "",
        totalEpisodes: b.chapter_count || null,
        tags: b.theme || [],
      }));
    },
    async search(keyword, page = 1) {
      const res = await reelshort.search(keyword, page);
      const list = res.results || [];
      const items = list
        .filter((b) => (b.chapterCount || 0) > 0)
        .map((b) => ({
          id: b.bookId,
          title: b.title,
          cover: b.cover || "",
          description: b.description || "",
          totalEpisodes: b.chapterCount,
          tags: b.tag || [],
        }));
      return Promise.all(items.map((i) => withReelshortCover(i)));
    },
    async detail(bookId) {
      const res = await reelshort.getDetail(bookId);
      const chapters = res.chapters || [];
      return {
        id: bookId,
        title: res.title || "Drama",
        cover: res.cover || "",
        description: res.description || "",
        totalEpisodes: res.totalEpisodes || chapters.length,
        chapters: chapters.map((ch) => ({
          index: ch.index,
          title: ch.title,
          locked: ch.isLocked === true,
        })),
      };
    },
    async episode(bookId, chapterIndex) {
      // endpoint episode memakai nomor index chapter (mulai dari 1);
      // isLocked diabaikan karena tetap menghasilkan URL
      const res = await reelshort.getEpisode(bookId, chapterIndex);
      const list = (res.videoList || []).filter(
        (v) => v.url && v.quality && Number(v.bitrate) > 0,
      );
      if (!list.length) throw new Error("Video not found");
      return {
        title: `Episode ${chapterIndex}`,
        videos: list.map((v) => ({
          quality: v.quality,
          url: v.url,
          format: "hls",
        })),
      };
    },
  },
};

export function getSource(id) {
  const source = sources[id];
  if (!source) throw new Error(`Unknown source: ${id}`);
  return source;
}
