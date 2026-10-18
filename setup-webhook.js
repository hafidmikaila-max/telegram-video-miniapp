require("dotenv").config();
const crypto = require("crypto");

const { BOT_TOKEN, WEBHOOK_SECRET, WEB_APP_URL } = process.env;
if (!BOT_TOKEN || !WEBHOOK_SECRET || !WEB_APP_URL) {
  console.error("Lengkapi BOT_TOKEN, WEBHOOK_SECRET, dan WEB_APP_URL di file .env");
  process.exit(1);
}
const key = crypto.createHash("sha256")
  .update(BOT_TOKEN + WEBHOOK_SECRET)
  .digest("hex");

(async () => {
  const response = await fetch(`${WEB_APP_URL.replace(/\/$/, "")}/setup-webhook`, {
    method: "POST",
    headers: { "X-Setup-Key": key }
  });
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok || !result.ok) process.exit(1);
})().catch(err => {
  console.error("Gagal mendaftarkan webhook:", err.message);
  process.exit(1);
});
