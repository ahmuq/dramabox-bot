import axios from "axios";
import { config } from "../config.js";

export class DramaBoxAPI {
  #client;

  constructor() {
    this.#client = axios.create({
      baseURL: config.dramabox.baseUrl,
      headers: { "x-api-key": config.dramabox.apiKey },
      timeout: 30000,
    });
  }

  async getVip() {
    const { data } = await this.#client.get("/vip");
    return data;
  }

  async search(keyword) {
    const { data } = await this.#client.get("/search", { params: { keyword } });
    return data;
  }

  async getPopular(rankType = 1) {
    const { data } = await this.#client.get("/popular", {
      params: { rankType },
    });
    return data;
  }

  async getLatest(page = 1) {
    const { data } = await this.#client.get("/latest", { params: { page } });
    return data;
  }

  async getDubbed(page = 1, pageSize = 15) {
    const { data } = await this.#client.get("/dubbed", {
      params: { page, pageSize },
    });
    return data;
  }

  async getDetail(bookId) {
    const { data } = await this.#client.get("/detail", { params: { bookId } });
    return data;
  }

  async getChapters(bookId, getAll = false) {
    const { data } = await this.#client.get("/chapters", {
      params: { bookId, getAll: String(getAll) },
    });
    return data;
  }
}
