import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config } from "./config.js";
import { getSource, sources } from "./api/sources.js";

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

function authMiddleware(req, res, next) {
  if (config.dev) return next();
  const initData = req.get("X-Telegram-Init-Data");
  if (!isValidInitData(initData)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function startServer() {
  const app = express();

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
      );
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: "Gagal memuat daftar drama" });
    }
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
