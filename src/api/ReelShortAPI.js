import axios from "axios";
import { config } from "../config.js";

export class ReelShortAPI {
  #client;

  constructor() {
    this.#client = axios.create({
      baseURL: config.reelshort.baseUrl,
      headers: { "x-api-key": config.reelshort.apiKey },
      timeout: 30000,
    });
  }

  async search(keyword, page = 1) {
    const { data } = await this.#client.get("/search", {
      params: { keyword, page },
    });
    return data;
  }

  async getDetail(bookId) {
    const { data } = await this.#client.get("/detail", { params: { bookId } });
    return data;
  }

  async getEpisode(bookId, episode) {
    const { data } = await this.#client.get("/episode", {
      params: { bookId, episode },
    });
    return data;
  }

  async getForYou(page = 1) {
    const { data } = await this.#client.get("/foryou", { params: { page } });
    return data;
  }

  async getHomepage(page = 1) {
    const { data } = await this.#client.get("/homepage", { params: { page } });
    return data;
  }
}
