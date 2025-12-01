// server.js
require("dotenv").config();

const express = require("express");
const path = require("path");
const app = express();

// node-fetch helper (npm i node-fetch)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

// JSON body
app.use(express.json());

// Statik dosyalar (index.html dahil) → şu anki klasörden
app.use(express.static(__dirname));

// Ana sayfa: index.html'i gönder
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// IP alma
function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    "Unknown"
  );
}

// Basit UA parse
function parseUserAgent(uaString = "") {
  const ua = uaString.toLowerCase();
  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os x")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  let browser = "Unknown";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("opr/") || ua.includes("opera")) browser = "Opera";
  else if (ua.includes("chrome/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/")) browser = "Safari";

  return { os, browser };
}

// /api/download → frontend buraya POST atıyor
app.post("/api/download", async (req, res) => {
  try {
    if (!WEBHOOK_URL) {
      console.warn("WEBHOOK_URL tanımlı değil (.env).");
      return res.status(200).json({ ok: true, skipped: true });
    }

    const clientIp = getClientIp(req);
    const {
      version = "unknown",
      invitedBy = null,
      userAgent = "",
      language = "",
      timestamp,
    } = req.body || {};

    const { os, browser } = parseUserAgent(userAgent);
    const when = timestamp ? new Date(timestamp) : new Date();

    const embed = {
      title: "📥 Yeni Yuzeras Download",
      color: 0x2b2d31,
      fields: [
        { name: "🌐 IP", value: `\`${clientIp}\``, inline: true },
        { name: "💻 OS", value: os, inline: true },
        { name: "🌐 Tarayıcı", value: browser, inline: true },
        { name: "🧩 Versiyon", value: version, inline: true },
        { name: "🔑 Davet Eden", value: invitedBy || "Belirtilmedi", inline: true },
        { name: "🌎 Dil", value: language || "Bilinmiyor", inline: true },
      ],
      footer: {
        text: when.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
      },
    };

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Yuzeras Logs", embeds: [embed] }),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Download handler error:", err);
    res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server ready → http://localhost:${PORT}`);
});
