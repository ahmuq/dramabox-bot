import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config } from "./config.js";
import { getSource, sources } from "./api/sources.js";
import { sendVideo } from "./videoSender.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Validasi Telegram WebApp initData (HMAC-SHA256 dengan bot token). */
function isValidInitData(initData) {
  if (!initData) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(config.botToken)
    .digest();
  const computed = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  return computed === hash;
}

/** Ambil user id dari initData yang sudah tervalidasi. */
function userIdFromInitData(initData) {
  const params = new URLSearchParams(initData || "");
  try {
    return JSON.parse(params.get("user") || "{}").id || null;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  if (config.dev) return next();
  const initData = req.get("X-Telegram-Init-Data");
  if (!isValidInitData(initData)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function startServer(bot) {
  const app = express();

  // WebView Telegram agresif mencache — paksa selalu ambil versi terbaru
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, must-revalidate");
    next();
  });
  // WebView Telegram agresif mencache — paksa selalu ambil versi terbaru
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, must-revalidate");
    next();
  });
  app.use(express.static(path.join(__dirname, "../public")));
  app.use("/api", authMiddleware);

  app.get("/api/sources", (req, res) => {
    res.json(
      Object.values(sources).map((s) => ({ id: s.id, label: s.label })),
    );
  });

  app.get("/api/:source/categories", (req, res) => {
    res.json({ categories: getSource(req.params.source).categories || [] });
  });

  app.get("/api/:source/search", async (req, res) => {
    try {
      const { keyword, page } = req.query;
      if (!keyword) return res.status(400).json({ error: "keyword wajib" });
      const results = await getSource(req.params.source).search(
        keyword,
        Number(page || 1),
      );
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: "Gagal mencari drama" });
    }
  });

  app.get("/api/:source/browse", async (req, res) => {
    try {
      const results = await getSource(req.params.source).browse(
        Number(req.query.page || 1),
        req.query.category || "trending",
      );
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: "Gagal memuat daftar drama" });
    }
  });

  app.use(express.json());

  // jalur utama: mini app minta video dikirim langsung ke chat user
  app.post("/api/request-video", async (req, res) => {
    const initData = req.get("X-Telegram-Init-Data");
    if (!config.dev && !isValidInitData(initData)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const chatId = userIdFromInitData(initData) || config.testChatId;
    const { source, bookId, episode } = req.body || {};
    if (!chatId || !source || !bookId || episode === undefined || episode === null) {
      console.log(
        `⚠️ request-video ditolak: chatId=${chatId} body=${JSON.stringify(req.body)} initData=${initData ? "ada" : "kosong"}`,
      );
      return res.status(400).json({ error: "Data tidak lengkap" });
    }
    console.log("📩 request-video:", JSON.stringify(req.body), "| chat:", chatId);
    // proses di latar belakang agar mini app bisa langsung ditutup
    sendVideo(bot, chatId, req.body).catch(() => {});
    res.json({ ok: true });
  });

  app.get("/api/:source/detail", async (req, res) => {
    try {
      const { bookId } = req.query;
      if (!bookId) return res.status(400).json({ error: "bookId wajib" });
      const detail = await getSource(req.params.source).detail(bookId);
      res.json({ detail });
    } catch (err) {
      res.status(500).json({ error: "Gagal memuat detail drama" });
    }
  });

  app.listen(config.port, () => {
    console.log(`🌐 Mini App server running on port ${config.port}`);
  });
}
