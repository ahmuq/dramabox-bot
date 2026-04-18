# 🎬 DramaBox Telegram Bot

Telegram bot untuk menonton dan menjelajahi drama dari DramaBox. Dibangun menggunakan [grammY](https://grammy.dev/) dengan arsitektur OOP dan JavaScript ES Modules.

## Fitur

- 🔥 **Trending** — Drama yang sedang populer
- 🔍 **Cari Drama** — Pencarian drama berdasarkan kata kunci
- ⭐ **VIP Collection** — Koleksi drama VIP eksklusif
- 📺 **Terbaru** — Drama terbaru dengan pagination
- 🎬 **Sulih Suara** — Drama dengan dubbing Bahasa Indonesia
- 📊 **Paling Dicari** — Drama yang paling banyak dicari
- 🆕 **Terbaru Populer** — Drama terbaru yang sedang naik daun
- 📖 **Detail Drama** — Info lengkap (rating, pemain, jumlah episode)
- ▶️ **Streaming Video** — Tonton langsung di Telegram dengan pilihan kualitas (720p, 540p, 360p)

## Struktur Proyek

```
dramabox-bot/
├── .env.example
├── .gitignore
├── package.json
├── setup_vps.sh
└── src/
    ├── bot.js                 # Entry point
    ├── config.js              # Konfigurasi environment
    ├── api/
    │   └── DramaBoxAPI.js     # Wrapper API DramaBox
    ├── handlers/
    │   ├── MenuHandler.js     # /start, /menu
    │   ├── SearchHandler.js   # Pencarian drama
    │   ├── VipHandler.js      # Koleksi VIP
    │   ├── PopularHandler.js  # Drama populer
    │   ├── LatestHandler.js   # Drama terbaru
    │   ├── DubbedHandler.js   # Drama sulih suara
    │   └── DetailHandler.js   # Detail, episode, streaming
    └── utils/
        ├── keyboard.js        # Inline keyboard builder
        └── formatter.js       # HTML message formatter
```

## Prasyarat

- **Node.js** v18+ (disarankan v20+)
- **Bagah Apikey** [Bagah API](https://api.bagahproject.com/)
- **Bot Token** dari [@BotFather](https://t.me/BotFather)
- (Opsional) **Docker** untuk menjalankan local Telegram Bot API server

## Instalasi

1. **Clone repository**

   ```bash
   git clone https://github.com/ahmuq/dramabox-bot
   cd dramabox-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Konfigurasi environment**

   ```bash
   cp .env.example .env
   ```

   Edit file `.env` dan isi `BOT_TOKEN` dengan token dari BotFather:

   ```env
   BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_API_URL=http://localhost:8081
   DRAMABOX_API_KEY=your_bagah_api_key_here
   DRAMABOX_API_BASE=https://bagahproject.com/api/dramabox
   ```

4. **Jalankan bot**

   ```bash
   # Production
   npm start

   # Development (auto-reload)
   npm run dev
   ```

## Local Telegram Bot API Server

Untuk mengirim file video berukuran besar (>50 MB), diperlukan local Telegram Bot API server. Script `setup_vps.sh` menyediakan setup otomatis menggunakan Docker.

### Setup

1. Dapatkan **API ID** dan **API Hash** dari [my.telegram.org/apps](https://my.telegram.org/apps)

2. Jalankan script setup:

   ```bash
   chmod +x setup_vps.sh
   ./setup_vps.sh
   ```

   Script akan:
   - Menginstall Docker (jika belum ada)
   - Menjalankan container `aiogram/telegram-bot-api` di port **8081**
   - Mengaktifkan mode `--local` untuk mendukung upload file besar

3. Pastikan `TELEGRAM_API_URL=http://localhost:8081` sudah diset di file `.env`

> **Catatan:** Jika tidak menggunakan local API server, ubah `TELEGRAM_API_URL` menjadi `https://api.telegram.org`. Limit upload file akan terbatas 50 MB.

## Perintah Bot

| Perintah | Deskripsi                                       |
| -------- | ----------------------------------------------- |
| `/start` | Menampilkan pesan selamat datang dan menu utama |
| `/menu`  | Menampilkan menu utama                          |

Semua navigasi menggunakan **inline keyboard** — cukup tekan tombol untuk menjelajahi drama, melihat detail, memilih episode, dan streaming video.

## API Endpoints

Bot menggunakan DramaBox API dengan endpoint berikut:

| Method | Endpoint                    | Deskripsi                                                      |
| ------ | --------------------------- | -------------------------------------------------------------- |
| `GET`  | `/vip`                      | Koleksi VIP                                                    |
| `GET`  | `/search?keyword=`          | Pencarian drama                                                |
| `GET`  | `/popular?rankType=`        | Drama populer (1=Trending, 2=Paling Dicari, 3=Terbaru Populer) |
| `GET`  | `/latest?page=`             | Drama terbaru                                                  |
| `GET`  | `/dubbed?page=&pageSize=`   | Drama sulih suara Indonesia                                    |
| `GET`  | `/detail?bookId=`           | Detail drama                                                   |
| `GET`  | `/chapters?bookId=&getAll=` | Daftar episode beserta URL video CDN                           |

## Tech Stack

- **[grammY](https://grammy.dev/)** — Framework Telegram Bot
- **[Axios](https://axios-http.com/)** — HTTP client
- **[dotenv](https://github.com/motdotla/dotenv)** — Manajemen environment variable
- **JavaScript ES Modules** — Import/export modern
- **Docker** — Local Telegram Bot API server
