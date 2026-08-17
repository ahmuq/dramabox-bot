import axios from "axios";
import { config } from "../config.js";

export class ReelShortAPI {
  #client;
  #lang;

  constructor() {
    this.#client = axios.create({
      baseURL: config.reelshort.baseUrl,
      headers: { "x-api-key": config.reelshort.apiKey },
      timeout: 30000,
    });
    // bot untuk user Indonesia — konten terjemahan id secara default
    this.#lang = config.reelshort.lang || "id";
  }

  async search(keyword, page = 1) {
    const { data } = await this.#client.get("/search", {
      params: { keyword, page, lang: this.#lang },
    });
    return data;
  }

  async getDetail(bookId) {
    const { data } = await this.#client.get("/detail", {
      params: { bookId, lang: this.#lang },
    });
    return data;
  }

  async getEpisode(bookId, episode) {
    const { data } = await this.#client.get("/episode", {
      params: { bookId, episode, lang: this.#lang },
    });
    return data;
  }

  async getForYou(page = 1) {
    const { data } = await this.#client.get("/foryou", {
      params: { page, lang: this.#lang },
    });
    return data;
  }

  async getHomepage(page = 1) {
    const { data } = await this.#client.get("/homepage", {
      params: { page, lang: this.#lang },
    });
    return data;
  }

  // Cover drama tidak tersedia di search/detail; ambil dari og:image
  // halaman share resmi ReelShort (di-cache per bookId).
  #coverCache = new Map();
  async getCover(bookId) {
    if (this.#coverCache.has(bookId)) return this.#coverCache.get(bookId);
    let cover = "";
    try {
      const res = await axios.get(
        `https://app.reelshort.com/app-video-share/${bookId}`,
        { timeout: 10000 },
      );
      cover = res.data?.match(/og:image"\s*content="([^"]+)"/)?.[1] || "";
    } catch {
      /* diamkan — kartu tanpa cover tetap tampil */
    }
    this.#coverCache.set(bookId, cover);
    return cover;
  }
}
