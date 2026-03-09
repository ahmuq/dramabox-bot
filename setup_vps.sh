#!/bin/bash

echo "🚀 Setting up Telegram Bot API Server..."

# 1. Install Docker if not exists
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed!"
else
    echo "✅ Docker already installed."
fi

# 2. Pull Telegram API Server Image
echo "⬇️ Pulling aiogram/telegram-bot-api image..."
docker pull aiogram/telegram-bot-api:latest

# 3. Ask for Credentials
echo ""
echo "📝 To run the server, we need your Telegram API ID and API Hash."
echo "   Get them from: https://my.telegram.org/apps"
echo ""
read -p "Enter API ID: " API_ID
read -p "Enter API HASH: " API_HASH

# 4. Create Working Directory
mkdir -p telegram-bot-api-data

# 5. Run Server
echo "🔥 Starting Server on Port 8081..."
docker run -d \
  -p 8081:8081 \
  -v $(pwd)/telegram-bot-api-data:/var/lib/telegram-bot-api \
  --name telegram-bot-api \
  --restart always \
  -e TELEGRAM_API_ID=$API_ID \
  -e TELEGRAM_API_HASH=$API_HASH \
  aiogram/telegram-bot-api:latest \
  --local

echo ""
echo "✅ Server is running!"
echo "👉 Add this to your .env file:"
echo "TELEGRAM_API_URL=http://localhost:8081"
echo ""
echo "⚠️ Don't forget to LOGOUT your bot from cloud first if needed:"
echo "   (Use the logOut method if you face issues switching)"
