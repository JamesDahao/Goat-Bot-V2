const axios = require("axios");

const JamesDahao = {};
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
  "mango": "🥭",
  tomatrio: "🍅",
  shroombino: "🍄",
  "water bucket": "🪣",
  "frost grenade": "💣",
  "banana gun": "🔫",
  "frost blower": "❄️",
  "carrot launcher": "🚀"
};

function toPHTime(ms) {
  const d = new Date(ms);
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function formatTime(date) {
  return date.toLocaleTimeString("en-PH", { hour12: false });
}

function formatDate(date) {
  return date.toLocaleDateString("en-PH");
}

async function fetchStocks() {
  const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
  return res.data;
}

function buildMessage(data, participants) {
  const phNow = toPHTime(Date.now());
  const updatedAtPH = toPHTime(data.updatedAt);
  const nextRestock = new Date(phNow);
  nextRestock.setMinutes(Math.floor(phNow.getMinutes() / 5) * 5 + 5);
  nextRestock.setSeconds(30);

  let body = "🌱 Available Stocks 🌱\n\n";
  body += `🗓️ Date: ${formatDate(phNow)}\n`;
  body += `⏳ Now: ${formatTime(updatedAtPH)}\n`;
  body += `⌛ Next: ${formatTime(nextRestock)}\n\n`;

  const seeds = data.items.filter(it => it.category.toLowerCase() === "seed");
  const gear = data.items.filter(it => it.category.toLowerCase() === "gear");

  const secretSeeds = ["tomatrio", "mr carrot", "shroombino", "mango"];
  let foundSecret = false;

  if (seeds.length > 0) {
    body += "🌾 Seeds:\n";
    seeds.forEach(it => {
      let cleanName = it.name.replace(/<:[^>]+>/g, "").replace(/ Seed$/i, "").trim();
      const lower = cleanName.toLowerCase();
      let matchedKey = Object.keys(emojiMap).find(key => lower.includes(key));
      const emoji = matchedKey ? emojiMap[matchedKey] : "•";
      body += `${emoji} ${cleanName}: ${it.currentStock} in stock\n`;

      if (secretSeeds.some(s => lower.includes(s))) foundSecret = true;
    });
    body += "\n";
  }

  if (gear.length > 0) {
    body += "⚔️ Gear:\n";
    gear.forEach(it => {
      let cleanName = it.name.replace(/<:[^>]+>/g, "").trim();
      const lower = cleanName.toLowerCase();
      let matchedKey = Object.keys(emojiMap).find(key => lower.includes(key));
      const emoji = matchedKey ? emojiMap[matchedKey] : "•";
      body += `${emoji} ${cleanName}: ${it.currentStock} in stock\n`;
    });
    body += "\n";
  }

  let mentions = [];
  if (foundSecret && participants) {
    let alertMsg = "@all : Secret seed has been detected!";
    let fromIndex = body.length;
    body += alertMsg;

    for (const uid of participants) {
      mentions.push({
        tag: "@all",
        id: uid,
        fromIndex
      });
    }
  }

  return { body, updatedAtPH, mentions };
}

function isInWindow(updatedAtPH) {
  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const windowStart = new Date(now);
  windowStart.setMinutes(minute);
  windowStart.setSeconds(0);
  const windowEnd = new Date(windowStart);
  windowEnd.setMinutes(windowStart.getMinutes() + 5);
  windowEnd.setSeconds(29);
  return updatedAtPH >= windowStart && updatedAtPH <= windowEnd;
}

async function attemptSend(api, threadID, participants, sentRetryFlag) {
  const data = await fetchStocks();
  const { body, updatedAtPH, mentions } = buildMessage(data, participants);

  if (isInWindow(updatedAtPH)) {
    api.sendMessage({ body, mentions }, threadID);
    return true;
  } else {
    if (!sentRetryFlag.flag) {
      api.sendMessage("⚠️ API delay: stocks didn't refresh\nRetrying every 30s until refreshed", threadID);
      sentRetryFlag.flag = true;
    }
    return false;
  }
}

function scheduleNext(api, threadID, participants) {
  const now = toPHTime(Date.now());
  const next = new Date(now);
  next.setMinutes(Math.floor(now.getMinutes() / 5) * 5 + 5);
  next.setSeconds(30);
  const delay = next.getTime() - now.getTime();

  JamesDahao[threadID] = setTimeout(async function run() {
    let sentRetryFlag = { flag: false };
    let sent = await attemptSend(api, threadID, participants, sentRetryFlag);
    if (!sent) {
      const retryInterval = setInterval(async () => {
        let result = await attemptSend(api, threadID, participants, sentRetryFlag);
        if (result) clearInterval(retryInterval);
      }, 30000);
    }
    scheduleNext(api, threadID, participants);
  }, delay);
}

module.exports = {
  config: {
    name: "stock",
    aliases: [],
    version: "1.2",
    author: "James Dahao",
    role: 2,
    category: "utility",
    shortDescription: { en: "Check or auto-send available stocks" },
    longDescription: { en: "Fetches and displays current stocks from PVBR." },
    guide: { en: "{p}stock → Show stocks\n{p}stock on → Auto-send every restock window\n{p}stock off → Stop auto-send" }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const participants = event.participantIDs;

    if (args[0] && args[0].toLowerCase() === "on") {
      if (JamesDahao[threadID]) return;
      api.sendMessage("🟩 Auto Stocks update started", threadID);
      scheduleNext(api, threadID, participants);
      return;
    }

    if (args[0] && args[0].toLowerCase() === "off") {
      if (!JamesDahao[threadID]) return;
      clearTimeout(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      api.sendMessage("🟥 Auto Stocks update stopped", threadID);
      return;
    }

    const data = await fetchStocks();
    const { body, mentions } = buildMessage(data, participants);
    api.sendMessage({ body, mentions }, threadID);
  }
};
