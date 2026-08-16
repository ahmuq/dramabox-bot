# 🎬 DramaHub Telegram Bot + Mini App

Telegram bot pencarian drama **DramaBox** & **ReelShort** dengan **Mini App** modern — pencarian dan browse drama dilakukan lewat web app di dalam Telegram, dan saat episode dipilih, bot langsung mengirim videonya ke chat.

Dibangun menggunakan [grammY](https://grammy.dev/) + [Express](https://expressjs.com/), JavaScript ES Modules.

## Fitur

- 📱 **Mini App modern** — dark theme, grid poster, skeleton loading, infinite scroll
- 🔀 **Dua sumber drama** — tab DramaBox & ReelShort
- 🔍 **Pencarian realtime** dengan debounce
- 🔥 **Trending / For You** feed
- ▶️ **Kirim video ke chat** — klik episode di mini app → bot reply video langsung
- 🎞️ **Dukungan HLS** — video ReelShort (.m3u8) otomatis diunduh & diremux ke MP4 via ffmpeg
- 🔐 **API key tetap di server** — mini app tidak pernah mengakses Bagah API langsung, request diverifikasi dengan `initData` Telegram

## Struktur Proyek

```
dramabox-bot/
├── public/                    # Frontend Mini App
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── bot.js                 # Entry point (bot + web server)
│   ├── config.js              # Konfigurasi environment
│   ├── server.js              # Express: static files + API proxy + validasi initData
│   ├── downloader.js          # Unduh HLS (.m3u8) → remux MP4 via ffmpeg
│   ├── api/
│   │   ├── DramaBoxAPI.js     # Wrapper API DramaBox
│   │   ├── ReelShortAPI.js    # Wrapper API ReelShort
│   │   └── sources.js         # Registry & normalisasi kedua sumber
│   └── handlers/
│       ├── MenuHandler.js     # /start, /menu, menu button
│       └── VideoHandler.js    # web_app_data → kirim video
├── setup_vps.sh               # Setup ffmpeg + local Bot API server
└── .env.example
```

## Prasyarat

- **Node.js** v18+ (disarankan v20+)
- **ffmpeg** — wajib untuk video ReelShort (HLS → MP4)
- **Bagah API key** — [api.bagahproject.com](https://api.bagahproject.com/)
- **Bot Token** dari [@BotFather](https://t.me/BotFather)
- **Domain + HTTPS** untuk hosting Mini App (wajib untuk tombol WebApp)

## Instalasi

1. **Clone & install**

   ```bash
   git clone https://github.com/ahmuq/dramabox-bot
   cd dramabox-bot
   npm install
   ```

2. **Konfigurasi environment**

   ```bash
   cp .env.example .env
   ```

   ```env
   BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_API_URL=http://localhost:8081
   DRAMABOX_API_KEY=your_key
   REELSHORT_API_KEY=your_key
   PORT=3000
   PUBLIC_URL=https://drama.yourdomain.com
   DEV=0
   ```

3. **Jalankan**

   ```bash
   npm start        # production
   npm run dev      # development (auto-reload)
   ```

## Deploy Mini App (VPS)

Mini App harus diakses via HTTPS. Contoh dengan reverse proxy nginx:

```nginx
server {
    listen 443 ssl;
    server_name drama.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/drama.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drama.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

Setelah HTTPS aktif:

1. Isi `PUBLIC_URL=https://drama.yourdomain.com` di `.env` — bot otomatis set **menu button** dan menambahkan tombol WebApp di `/start`.
2. (Alternatif) set manual via BotFather: *Bot Settings → Menu Button*, atau *New Inline Button → Web App*.

> Untuk development di browser biasa (tanpa Telegram), set `DEV=1` untuk melewati validasi `initData`. Jangan gunakan di production.

## Local Telegram Bot API Server

Upload video >50 MB butuh local Bot API server. `setup_vps.sh` menginstall **ffmpeg** dan menjalankan `aiogram/telegram-bot-api` (Docker) di port **8081**:

```bash
chmod +x setup_vps.sh
./setup_vps.sh
```

> Jika tidak memakainya, set `TELEGRAM_API_URL=https://api.telegram.org` (limit 50 MB).

## Cara Kerja

1. User buka Mini App (menu button / tombol `/start`).
2. Mini app memanggil `/api/:source/*` di server yang sama — server memvalidasi `initData` (HMAC bot token), lalu mem-proxy ke Bagah API (API key tidak terekspos).
3. User memilih episode + kualitas → `Telegram.WebApp.sendData()`.
4. Bot menerima `web_app_data`:
   - **DramaBox**: URL MP4 langsung diupload ke Telegram.
   - **ReelShort**: playlist HLS diunduh per segmen, diremux ke MP4 (ffmpeg, tanpa re-encode), dikirim, lalu file temp dihapus.

## Perintah Bot

| Perintah | Deskripsi                       |
| -------- | ------------------------------- |
| `/start` | Pesan selamat datang + tombol Mini App |
| `/menu`  | Sama dengan `/start`            |

## Tech Stack

- **[grammY](https://grammy.dev/)** — framework bot
- **[Express](https://expressjs.com/)** — web server Mini App
- **[Axios](https://axios-http.com/)** — HTTP client
- **Telegram WebApp API** — frontend mini app
- **ffmpeg** — remux HLS → MP4
