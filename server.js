require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const {
  BOT_TOKEN, BOT_USERNAME, WEB_APP_URL, CHANNEL_ID, WEBHOOK_SECRET,
  PORT = 3000
} = process.env;

for (const key of ["BOT_TOKEN", "BOT_USERNAME", "WEB_APP_URL", "CHANNEL_ID", "WEBHOOK_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (!/^[A-Za-z0-9_-]{16,256}$/.test(WEBHOOK_SECRET)) {
  console.error("WEBHOOK_SECRET must be 16–256 characters: letters, numbers, _ or -.");
  process.exit(1);
}

const DATA_FILE = path.join(__dirname, "data.json");
let videos = [];
try {
  if (fs.existsSync(DATA_FILE)) videos = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch (e) {
  console.error("Could not read data.json. Starting with an empty catalog.", e.message);
}
function saveVideos() {
  const temp = DATA_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(videos, null, 2));
  fs.renameSync(temp, DATA_FILE);
}
function isConfiguredChannel(chat) {
  if (!chat) return false;
  if (String(CHANNEL_ID).startsWith("@")) return chat.username?.toLowerCase() === CHANNEL_ID.slice(1).toLowerCase();
  return String(chat.id) === String(CHANNEL_ID);
}
function channelPostUrl(chat, messageId) {
  if (chat.username) return `https://t.me/${chat.username}/${messageId}`;
  // Private channel links require the viewer to be a member of that channel.
  const raw = String(chat.id);
  const internalId = raw.startsWith("-100") ? raw.slice(4) : raw.replace("-", "");
  return `https://t.me/c/${internalId}/${messageId}`;
}
function extractVideo(message) {
  if (message.video) {
    return {
      fileId: message.video.file_id,
      title: (message.caption || "").trim().slice(0, 180) || `Video ${message.message_id}`,
      mimeType: message.video.mime_type || "video/mp4",
      fileSize: message.video.file_size || null,
      duration: message.video.duration || null
    };
  }
  // Accept video files sent as documents, but only when Telegram marks them as video.
  if (message.document && (message.document.mime_type || "").startsWith("video/")) {
    return {
      fileId: message.document.file_id,
      title: (message.caption || "").trim().slice(0, 180) || `Video ${message.message_id}`,
      mimeType: message.document.mime_type,
      fileSize: message.document.file_size || null,
      duration: null
    };
  }
  return null;
}
async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || `Telegram API ${method} failed`);
  return result.result;
}
async function sendStartMenu(chatId) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text: "🎬 Selamat datang! Buka katalog video melalui tombol di bawah.",
    reply_markup: {
      inline_keyboard: [[{ text: "▶️ Buka Mini App Video", web_app: { url: WEB_APP_URL } }]]
    }
  });
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/videos", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(videos.map(({ fileId, ...safeVideo }) => safeVideo));
});

// Telegram webhook: the secret header prevents arbitrary callers from inserting posts.
app.post("/telegram-webhook", async (req, res) => {
  if (req.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.sendStatus(200);
  const update = req.body;
  try {
    if (update.message?.text === "/start") {
      await sendStartMenu(update.message.chat.id);
    }
    const message = update.channel_post;
    if (!message || !isConfiguredChannel(message.chat)) return;
    const media = extractVideo(message);
    if (!media) return;
    const item = {
      id: `${message.chat.id}_${message.message_id}`,
      title: media.title,
      postUrl: channelPostUrl(message.chat, message.message_id),
      date: message.date,
      duration: media.duration,
      fileSize: media.fileSize,
      mimeType: media.mimeType,
      fileId: media.fileId
    };
    // Update an existing record if Telegram sends the same post again.
    videos = [item, ...videos.filter(v => v.id !== item.id)].slice(0, 5000);
    saveVideos();
  } catch (e) {
    console.error("Webhook processing error:", e.message);
  }
});

app.post("/setup-webhook", async (req, res) => {
  const supplied = req.get("X-Setup-Key");
  const expected = crypto.createHash("sha256").update(BOT_TOKEN + WEBHOOK_SECRET).digest("hex");
  if (!supplied || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await telegram("setWebhook", {
      url: `${WEB_APP_URL.replace(/\/$/, "")}/telegram-webhook`,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message", "channel_post", "edited_channel_post"],
      drop_pending_updates: false
    });
    res.json({ ok: true, telegram: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(PORT), () => {
  console.log(`Mini App server listening on port ${PORT}`);
  console.log(`Web App URL: ${WEB_APP_URL}`);
  console.log("Remember: the bot only indexes new channel video posts after webhook setup.");
});
