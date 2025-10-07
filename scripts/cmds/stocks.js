const axios = require("axios");

const JamesDahao = {};
const autoStartThreads = ["1606898753628191"];
const lastWindowSent = {}; // Anti-spam tracker

// 🌾 Emoji map (quotes only where needed)
const emojiMap = {
  cactus: "🌵",
  strawberry: "🍓",
  pumpkin: "🎃",
  sunflower: "🌻",
  "dragon fruit": "🐉",
  eggplant: "🍆",
  watermelon: "🍉",
  grape: "🍇",
  cocotank: "🥥",
  carnivorous: "🥩",
  "mr carrot": "🥕",
  mango: "🥭",
  tomatrio: "🍅",
  shroombino: "🍄",
  "water bucket": "🪣",
  "frost grenade": "💣",
  "banana gun": "🔫",
  "frost blower": "❄️",
  "carrot launcher": "🚀",
};

// 🕒 Convert UTC to PH Time
function toPHTime(ms) {
  const d = new Date(ms);
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

// 🕐 Formatters
function formatTime(date) {
  return date.toLocaleTimeString("en-PH", { hour12: false });
}
function formatDate(date) {
  return date.toLocaleDateString("en-PH");
}

// 🌐 Fetch latest stock data
async function fetchStocks() {
  const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
  return res.data;
}

// 🧩 Build message
function buildMessage(data, participants, mode = "best") {
  const phNow = toPHTime(Date.now());
  const updatedAtPH = toPHTime(data.updatedAt);
  const nextRestock = new Date(phNow);
  nextRestock.setMinutes(Math.floor(phNow.getMinutes() / 5) * 5 + 5);
  nextRestock.setSeconds(0);
  nextRestock.setMilliseconds(0);

  let body = "🌱 Available Stocks 🌱\n\n";
  body += `🗓️ Date: ${formatDate(phNow)}\n`;
  body += `⏳ Now: ${formatTime(updatedAtPH)}\n`;
  body += `⌛ Next: ${formatTime(nextRestock)}\n\n`;
  body += "🌾 Seeds on stock:\n";

  const seeds = data.items.filter((it) => it.category.toLowerCase() === "seed");

  // rarity filters
  const godlySeeds = ["cocotank", "carnivorous", "dragon fruit"];
  const secretSeeds = ["tomatrio", "mr carrot", "shroombino", "mango"];

  let filteredSeeds = [];

  if (mode === "godly") {
    filteredSeeds = seeds.filter((it) =>
      godlySeeds.some((s) => it.name.toLowerCase().includes(s))
    );
  } else if (mode === "secret") {
    filteredSeeds = seeds.filter((it) =>
      secretSeeds.some((s) => it.name.toLowerCase().includes(s))
    );
  } else if (mode === "best") {
    filteredSeeds = seeds.filter((it) =>
      [...godlySeeds, ...secretSeeds].some((s) =>
        it.name.toLowerCase().includes(s)
      )
    );
  } else {
    filteredSeeds = seeds;
  }

  if (filteredSeeds.length === 0) {
    return { body: null, updatedAtPH, mentions: [] };
  }

  let foundSecret = false;

  filteredSeeds.forEach((it) => {
    let cleanName = it.name
      .replace(/<:[^>]+>/g, "")
      .replace(/ Seed$/i, "")
      .replace(/^"|"$/g, "")
      .trim();
    const lower = cleanName.toLowerCase();
    const matchedKey = Object.keys(emojiMap).find((key) => lower.includes(key));
    const emoji = matchedKey ? emojiMap[matchedKey] : "•";
    body += `${emoji} ${cleanName}\n`;
    if (secretSeeds.some((s) => lower.includes(s))) foundSecret = true;
  });

  let mentions = [];
  if (foundSecret && participants) {
    const alertMsg = "\n\n@everyone : Secret seed has been detected!";
    const fromIndex = body.length;
    body += alertMsg;
    for (const uid of participants) {
      mentions.push({ tag: "@everyone", id: uid, fromIndex });
    }
  }

  return { body, updatedAtPH, mentions };
}

// 🕔 Check if updatedAt is within 5-minute window
function isInWindow(updatedAtPH) {
  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;

  const windowStart = new Date(now);
  windowStart.setMinutes(minute);
  windowStart.setSeconds(0);
  windowStart.setMilliseconds(0);

  const windowEnd = new Date(windowStart);
  windowEnd.setMinutes(windowStart.getMinutes() + 5);
  windowEnd.setSeconds(0);
  windowEnd.setMilliseconds(0);

  return updatedAtPH >= windowStart && updatedAtPH < windowEnd;
}

// 📤 Attempt to send message
async function attemptSend(api, threadID, participants, sentRetryFlag, mode) {
  const data = await fetchStocks();
  const { body, updatedAtPH, mentions } = buildMessage(data, participants, mode);

  if (!body) return false; // No stock found

  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const windowKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${minute}`;

  if (lastWindowSent[threadID] === windowKey) return false; // anti-spam

  if (isInWindow(updatedAtPH)) {
    api.sendMessage({ body, mentions }, threadID);
    lastWindowSent[threadID] = windowKey;
    return true;
  } else {
    if (!sentRetryFlag.flag) {
      api.sendMessage(
        "⚠️ API delay: stocks didn't refresh\nRetrying every 5s until refreshed",
        threadID
      );
      sentRetryFlag.flag = true;
    }
    return false;
  }
}

// ⏱️ Schedule next run
function scheduleNext(api, threadID, participants, mode = "best") {
  const now = toPHTime(Date.now());
  const next = new Date(now);
  next.setMinutes(Math.floor(now.getMinutes() / 5) * 5 + 5);
  next.setSeconds(0);
  next.setMilliseconds(0);
  const delay = next.getTime() - now.getTime();

  JamesDahao[threadID] = setTimeout(async function run() {
    const sentRetryFlag = { flag: false };
    const sent = await attemptSend(api, threadID, participants, sentRetryFlag, mode);

    if (!sent) {
      const retryInterval = setInterval(async () => {
        const result = await attemptSend(api, threadID, participants, sentRetryFlag, mode);
        if (result) clearInterval(retryInterval);
      }, 5000); // Retry every 5 seconds
    }

    scheduleNext(api, threadID, participants, mode);
  }, delay);
}

// 🚀 Command Export
module.exports = {
  config: {
    name: "stock",
    version: "2.1",
    author: "James Dahao",
    role: 2,
    category: "utility",
    shortDescription: { en: "Auto-check PVBR stocks" },
    longDescription: { en: "Auto fetches and displays godly/secret stocks with @everyone alerts." },
    guide: {
      en: "{p}stock → Show best stocks\n{p}stock godly/secret/best → Filter\n{p}stock on/off → Start or stop auto updates",
    },
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const participants = event.participantIDs;
    const mode = args[0]?.toLowerCase() || "best";

    if (args[0] && args[0].toLowerCase() === "off") {
      if (!JamesDahao[threadID]) return;
      clearTimeout(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      api.sendMessage("🟥 Auto Stocks update stopped", threadID);
      return;
    }

    if (["on", "godly", "secret", "best"].includes(mode)) {
      api.sendMessage(`🟩 Auto Stocks update started (${mode})`, threadID);
      scheduleNext(api, threadID, participants, mode);
      return;
    }

    const data = await fetchStocks();
    const { body, mentions } = buildMessage(data, participants, mode);
    if (body) api.sendMessage({ body, mentions }, threadID);
    else api.sendMessage("❌ No stocks found right now.", threadID);
  },

  onLoad: async function ({ api }) {
    for (const threadID of autoStartThreads) {
      try {
        const info = await api.getThreadInfo(threadID);
        const participants = info.participantIDs;
        scheduleNext(api, threadID, participants, "best");
        api.sendMessage("🟢 Auto Stocks update initialized (best mode)", threadID);
      } catch (err) {
        console.error(`Failed to start auto-stock for ${threadID}:`, err.message);
      }
    }
  },
};
